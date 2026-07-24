# webhooks.py
import os
import json
import hashlib
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Request, Response, Depends, BackgroundTasks, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from sqlalchemy.exc import OperationalError
import logging

from app.schemas.whatsapp import WhatsAppWebhookPayload
from app.api.deps import get_db
# Ensure SessionLocal is imported to safely generate thread-independent DB sessions
from app.db.session import SessionLocal 
from app.db.models import Merchant, Product, Order, BargainLog, ChatMessage
from app.core.filter import analyze_intent_and_route
from app.core.gemini import process_customer_message
from app.core.twillo_client import send_twilio_whatsapp_message

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Meta webhook verification token (stored securely in .env)
VERIFY_TOKEN = os.getenv("META_VERIFY_TOKEN", "bizzy_secure_token_2026")

# Configuration
MAX_RETRIES = 3
DUPLICATE_WINDOW_MINUTES = 5
STOCK_ALERT_THRESHOLD = 5
CHAT_HISTORY_LIMIT = 6  # Number of prior turns to feed into Gemini context


# ============================================
# HELPER FUNCTIONS
# ============================================

def run_sync(coro):
    """Helper to run async functions safely inside synchronous worker threads."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    if loop.is_running():
        # If the thread already has a running loop, execute as a future
        return asyncio.run_coroutine_threadsafe(coro, loop).result()
    else:
        return loop.run_until_complete(coro)


def calculate_product_hash(message_text: str, customer_phone: str) -> str:
    """Generate a unique hash for idempotency."""
    return hashlib.md5(f"{customer_phone}:{message_text}".encode()).hexdigest()


def is_duplicate_request(
    db: Session, 
    customer_phone: str, 
    message_text: str, 
    merchant_id: int
) -> bool:
    """Check if this is a duplicate request within the time window."""
    message_hash = calculate_product_hash(message_text, customer_phone)
    
    existing_order = db.query(Order).filter(
        Order.customer_number == customer_phone,
        Order.message_hash == message_hash,
        Order.merchant_id == merchant_id,
        Order.created_at > datetime.now() - timedelta(minutes=DUPLICATE_WINDOW_MINUTES)
    ).first()
    
    return existing_order is not None


def get_catalog_context(db: Session, merchant_id: int) -> Dict[str, Any]:
    """Fetch catalog with caching and structured formatting."""
    merchant = db.query(Merchant).filter(
        Merchant.id == merchant_id,
        Merchant.is_active == True
    ).first()
    
    if not merchant:
        logger.error(f"Merchant {merchant_id} not found or inactive")
        return {"business_name": "Unknown", "catalog": "No catalog available"}
    
    products = db.query(Product).filter(
        Product.merchant_id == merchant_id,
        Product.stock_quantity > 0  # Only show in-stock items
    ).all()
    
    catalog_text = "Merchant Available Stock Inventory Catalog:\n"
    for prod in products:
        stock_status = "🟢 In Stock" if prod.stock_quantity > STOCK_ALERT_THRESHOLD else "🟡 Low Stock"
        catalog_text += (
            f"- {prod.name} ({prod.variant}) | "
            f"Price: ₦{prod.price} | "
            f"Min Price: ₦{prod.min_floor_price} | "
            f"Stock: {prod.stock_quantity} {stock_status}\n"
        )
    
    return {
        "business_name": merchant.business_name,
        "catalog": catalog_text,
        "products": products,
        "merchant": merchant
    }


def match_product(
    db: Session, 
    merchant_id: int, 
    product_name: str, 
    product_id: Optional[int] = None
) -> Optional[Product]:
    """Enhanced product matching with multiple strategies."""
    # Strategy 1: Exact match by ID
    if product_id:
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.merchant_id == merchant_id
        ).first()
        if product: 
            return product
    
    # Strategy 2: Exact name match (case insensitive)
    product = db.query(Product).filter(
        Product.merchant_id == merchant_id,
        func.lower(Product.name) == func.lower(product_name.strip())
    ).first()
    if product:
        return product
    
    # Strategy 3: Partial match with priority (longest match first)
    products = db.query(Product).filter(
        Product.merchant_id == merchant_id,
        func.lower(Product.name).contains(func.lower(product_name.strip()))
    ).all()
    
    if products:
        # Sort by match relevance (exact match first, then by name length)
        products.sort(key=lambda p: len(p.name) - len(product_name))
        return products[0]  # Return the most relevant match
    
    # Strategy 4: Fuzzy matching using ILIKE (fallback)
    product = db.query(Product).filter(
        Product.merchant_id == merchant_id,
        Product.name.ilike(f"%{product_name}%")
    ).first()
    
    return product


def send_slack_alert(message: str, severity: str = "warning"):
    """Send alerts to engineering team via Slack."""
    logger.warning(f"🚨 {severity.upper()}: {message}")


# =============================================================================
# NEW: CHAT HISTORY HELPERS
# =============================================================================

def load_chat_history(
    db: Session,
    merchant_id: int,
    customer_phone: str,
    limit: int = CHAT_HISTORY_LIMIT
) -> List[Dict[str, str]]:
    """
    Load the last N chat turns for a specific merchant-customer pair.
    Returns list of dicts: [{"role": "user", "content": "..."}, ...]
    """
    messages = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.merchant_id == merchant_id,
            ChatMessage.customer_number == customer_phone
        )
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    # Reverse to chronological order (oldest first) for Gemini context
    return [{"role": msg.role, "content": msg.content} for msg in reversed(messages)]


def save_chat_turn(
    db: Session,
    merchant_id: int,
    customer_phone: str,
    role: str,
    content: str
):
    """Persist a single chat message turn to the database."""
    chat_msg = ChatMessage(
        merchant_id=merchant_id,
        customer_number=customer_phone,
        role=role,
        content=content
    )
    db.add(chat_msg)
    db.commit()


# ============================================
# WEBHOOK ENDPOINTS
# ============================================

@router.get("/webhook")
async def verify_webhook(request: Request):
    """Meta/WhatsApp Cloud API webhook verification."""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode and token:
        if mode == "subscribe" and token == VERIFY_TOKEN:
            return Response(content=challenge, status_code=status.HTTP_200_OK)
        return Response(content="Verification token mismatch", status_code=status.HTTP_403_FORBIDDEN)

    return Response(content="Missing parameters", status_code=status.HTTP_400_BAD_REQUEST)


@router.post("/webhook")
async def handle_whatsapp_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    From: str = Form(None),
    To: str = Form(None),
    Body: str = Form(None),
):
    """
    Unified Inbound Traffic Gateway supporting:
    1. Meta/WhatsApp Cloud API (JSON payload)
    2. Twilio WhatsApp API (Form data)
    """
    
    # Check if this is a Twilio webhook (form data present)
    if From and To and Body is not None:
        return await handle_twilio_webhook(
            From=From,
            To=To,
            Body=Body,
            background_tasks=background_tasks,
            db=db
        )
    
    # Otherwise, try to parse as Meta/WhatsApp Cloud API (JSON)
    try:
        payload_data = await request.json()
        payload = WhatsAppWebhookPayload(**payload_data)
        return await handle_meta_webhook(
            payload=payload,
            background_tasks=background_tasks,
            db=db
        )
    except Exception as e:
        logger.error(f"Error parsing webhook: {str(e)}")
        return Response(
            content="<Response></Response>", 
            media_type="text/xml", 
            status_code=status.HTTP_200_OK
        )


# ============================================
# TWILIO WEBHOOK HANDLER
# ============================================

async def handle_twilio_webhook(
    From: str,
    To: str,
    Body: str,
    background_tasks: BackgroundTasks,
    db: Session
):
    """Handle Twilio WhatsApp webhook form data."""
    logger.info(f"🚨 TWILIO WEBHOOK TRIGGERED: {From} | '{Body[:50]}...'")

    customer_phone = From.replace("whatsapp:", "")
    bizzy_number = To.replace("whatsapp:", "")

    # Multi-tenant Merchant Lookup
    merchant = db.query(Merchant).filter(
        Merchant.bizzy_number == bizzy_number,
        Merchant.is_active == True
    ).first()

    if not merchant:
        logger.warning(f"No merchant found for {bizzy_number}, using fallback")
        merchant = db.query(Merchant).filter(Merchant.is_active == True).first()

    if not merchant:
        logger.error("No active merchant profile located in the database.")
        return Response(
            content="<Response></Response>", 
            media_type="text/xml", 
            status_code=status.HTTP_200_OK
        )

    routing_decision = analyze_intent_and_route(Body)

    # FORCE LLM for product/buying intent messages (bypass overly-aggressive filter)
    buying_keywords = ["want", "buy", "price", "how much", "cost", "available", "stock", 
                       "negotiate", "discount", "last price", "do am", "send", "order",
                       "get", "need", "looking for", "interested", "pay", "paid", "delivery",
                       "address", "confirm", "receipt", "bargain", "slash", "reduce"]
    body_lower = Body.lower()
    force_llm = any(kw in body_lower for kw in buying_keywords)

    if not routing_decision["hit_llm"] and not force_llm:
        logger.info(f"⚡ FILTER HIT: Static template '{routing_decision['type']}'")
        background_tasks.add_task(
            dispatch_static_template,
            customer_phone=customer_phone,
            template_type=routing_decision["type"],
            merchant_id=merchant.id
        )
    else:
        if force_llm and not routing_decision["hit_llm"]:
            logger.info(f"🧠 KEYWORD BYPASS: '{Body[:50]}...' → forcing LLM routing")
        else:
            logger.info("🧠 FILTER PASSED: Dispatching to Gemini Engine")
        background_tasks.add_task(
            dispatch_gemini_intelligence_pipeline,
            customer_phone=customer_phone,
            message_text=Body,
            merchant_id=merchant.id
        )

    return Response(
        content="<Response></Response>", 
        media_type="text/xml", 
        status_code=status.HTTP_200_OK
    )


# ============================================
# META/WHATSAPP CLOUD API HANDLER
# ============================================

async def handle_meta_webhook(
    payload: WhatsAppWebhookPayload,
    background_tasks: BackgroundTasks,
    db: Session
):
    """Handle Meta/WhatsApp Cloud API webhook JSON payload."""
    logger.info("🚨 META WEBHOOK TRIGGERED")

    for entry in payload.entry:
        for change in entry.changes:
            value = change.value

            if value.messages:
                metadata = value.metadata
                bizzy_number = metadata.display_phone_number

                merchant = db.query(Merchant).filter(
                    Merchant.bizzy_number == bizzy_number,
                    Merchant.is_active == True
                ).first()

                if not merchant:
                    merchant = db.query(Merchant).filter(Merchant.is_active == True).first()

                if not merchant:
                    logger.error("No active merchant profile located.")
                    return {"status": "unrecognized_merchant_line"}

                for message in value.messages:
                    customer_phone = message.from_field

                    if message.type == "text" and message.text:
                        message_body = message.text.body
                        routing_decision = analyze_intent_and_route(message_body)

                        # FORCE LLM for product/buying intent messages
                        buying_keywords = ["want", "buy", "price", "how much", "cost", "available", "stock", 
                                           "negotiate", "discount", "last price", "do am", "send", "order",
                                           "get", "need", "looking for", "interested", "pay", "paid", "delivery",
                                           "address", "confirm", "receipt", "bargain", "slash", "reduce"]
                        msg_lower = message_body.lower()
                        force_llm = any(kw in msg_lower for kw in buying_keywords)

                        if not routing_decision["hit_llm"] and not force_llm:
                            background_tasks.add_task(
                                dispatch_static_template,
                                customer_phone=customer_phone,
                                template_type=routing_decision["type"],
                                merchant_id=merchant.id
                            )
                        else:
                            if force_llm and not routing_decision["hit_llm"]:
                                logger.info(f"🧠 KEYWORD BYPASS: '{message_body[:50]}...' → forcing LLM routing")
                            background_tasks.add_task(
                                dispatch_gemini_intelligence_pipeline,
                                customer_phone=customer_phone,
                                message_text=message_body,
                                merchant_id=merchant.id
                            )

                    elif message.type == "audio" and message.audio:
                        background_tasks.add_task(
                            dispatch_voice_processing_pipeline,
                            customer_phone=customer_phone,
                            audio_meta=message.audio.dict(),
                            merchant_id=merchant.id
                        )

    return {"status": "event_received_and_queued"}


# ============================================
# WORKER FUNCTIONS (OFFLOADED TO THREAD POOLS)
# ============================================

def dispatch_static_template(customer_phone: str, template_type: str, merchant_id: int):
    """Dispatch pre-defined template responses."""
    logger.info(f"⚡ STATIC ROUTING: {template_type}")
    
    if template_type == "GREETING":
        message_content = "How far, boss! Welcome to our store. Wetin you wan buy today? 😊"
    else:
        message_content = "Received! One second, make I check our available balance and catalog details."

    run_sync(send_twilio_whatsapp_message(to_number=customer_phone, body_text=message_content))


def dispatch_gemini_intelligence_pipeline(
    customer_phone: str, 
    message_text: str, 
    merchant_id: int
):
    """
    Enhanced Gemini AI-powered bargaining engine with full context memory.
    """
    logger.info("🚀 BIZZY CORE BARGAINING ENGINE LAUNCHED")
    
    # Establish independent connection inside the background thread
    with SessionLocal() as db:
        # ==========================================
        # 1. IDEMPOTENCY CHECK
        # ==========================================
        if is_duplicate_request(db, customer_phone, message_text, merchant_id):
            logger.warning(f"⚠️ Duplicate request detected for {customer_phone}")
            run_sync(send_twilio_whatsapp_message(
                to_number=customer_phone,
                body_text="We're already processing your request. Please wait a moment."
            ))
            return
        
        # ==========================================
        # 2. PERSIST INCOMING CUSTOMER MESSAGE
        # ==========================================
        save_chat_turn(
            db=db,
            merchant_id=merchant_id,
            customer_phone=customer_phone,
            role="user",
            content=message_text
        )
        
        # ==========================================
        # 3. FETCH CATALOG WITH LOCKING
        # ==========================================
        catalog_data = get_catalog_context(db, merchant_id)
        
        if not catalog_data.get("products"):
            logger.warning(f"No products found for merchant {merchant_id}")
            run_sync(send_twilio_whatsapp_message(
                to_number=customer_phone,
                body_text="Our catalog is currently being updated. Please check back soon! 🙏"
            ))
            return
        
        # ==========================================
        # 4. LOAD CHAT HISTORY FOR CONTEXT
        # ==========================================
        chat_history = load_chat_history(
            db=db,
            merchant_id=merchant_id,
            customer_phone=customer_phone
        )
        
        # ==========================================
        # 5. PROCESS AI RESPONSE WITH HISTORY
        # ==========================================
        try:
            raw_ai_response = process_customer_message(
                message_text=message_text,
                merchant_context={
                    "business_name": catalog_data["business_name"],
                    "catalog": catalog_data["catalog"],
                    "payment_details": catalog_data["merchant"].payment_details
                },
                chat_history=chat_history
            )
            
            ai_response = json.loads(raw_ai_response) if isinstance(raw_ai_response, str) else raw_ai_response
            
            intent_action = ai_response.get("intent_action")
            assistant_reply = ai_response.get("assistant_reply")
            
            logger.info(f"🧠 INTENT: {intent_action} | Haggling: {ai_response.get('is_haggling')}")
            
            # ==========================================
            # 6. PERSIST ASSISTANT REPLY
            # ==========================================
            if assistant_reply:
                save_chat_turn(
                    db=db,
                    merchant_id=merchant_id,
                    customer_phone=customer_phone,
                    role="assistant",
                    content=assistant_reply
                )
            
            # ==========================================
            # 7. ROUTE ALL SALES INTENTS TO ORDER PIPELINE
            # ==========================================
            # FIXED: Expanded intent gate to include all sales flow states
            sales_intents = [
                "ORDER_PLACEMENT",
                "NEGOTIATION", 
                "PAYMENT_REQUEST",
                "DELIVERY_REQUEST",
                "ORDER_CONFIRMATION"
            ]
            
            if intent_action in sales_intents:
                process_order_or_negotiation(
                    db=db,
                    customer_phone=customer_phone,
                    merchant_id=merchant_id,
                    ai_response=ai_response,
                    catalog_data=catalog_data,
                    assistant_reply=assistant_reply,
                    message_text=message_text
                )
            else:
                # Just send the AI reply for non-sales intents (inquiry, unknown)
                if assistant_reply:
                    run_sync(send_twilio_whatsapp_message(
                        to_number=customer_phone, 
                        body_text=assistant_reply
                    ))
        
        except OperationalError as e:
            db.rollback()
            logger.error(f"❌ Database deadlock in pipeline: {str(e)}")
            run_sync(send_twilio_whatsapp_message(
                to_number=customer_phone,
                body_text="We're experiencing high traffic. Please try again in a moment."
            ))
            send_slack_alert(
                f"DB deadlock for merchant {merchant_id}: {str(e)}",
                severity="critical"
            )
        
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Pipeline Error: {str(e)}")
            
            # Send friendly error to customer
            run_sync(send_twilio_whatsapp_message(
                to_number=customer_phone,
                body_text="🤖 Oops! Something went wrong. Please try again or contact support."
            ))
            
            # Alert engineering team
            send_slack_alert(
                f"Bargaining engine error for merchant {merchant_id}: {str(e)}",
                severity="critical"
            )


def process_order_or_negotiation(
    db: Session,
    customer_phone: str,
    merchant_id: int,
    ai_response: Dict[str, Any],
    catalog_data: Dict[str, Any],
    assistant_reply: Optional[str],
    message_text: str
):
    """Process orders with proper sales flow: negotiate → payment → delivery → confirm."""

    intent_action = ai_response.get("intent_action")
    merchant = catalog_data.get("merchant")
    parsed_items = ai_response.get("parsed_items", [])

    # Initialize tracking variables
    order_items = []
    total_amount = Decimal("0")
    order_success = True

    # ==========================================
    # STAGE 0: MATCH ITEMS & VALIDATE STOCK (NO DEDUCTION YET)
    # ==========================================
    matched_products = []  # Store (product, qty, final_price) tuples for later
    
    for item in parsed_items:
        product_name = item.get("product_name", "")
        requested_qty = item.get("quantity", 1)

        try:
            # Use row-level locking for stock validation
            matched_prod = db.query(Product).filter(
                Product.merchant_id == merchant_id,
                func.lower(Product.name) == func.lower(product_name.strip())
            ).with_for_update().first()  # 🔒 Row-level lock

            if not matched_prod:
                # Try fallback matching
                matched_prod = match_product(db, merchant_id, product_name)

            if not matched_prod:
                logger.warning(f"Product not found: {product_name}")
                run_sync(send_twilio_whatsapp_message(
                    to_number=customer_phone,
                    body_text=f"Sorry, we couldn't find '{product_name}'. Please check the name."
                ))
                order_success = False
                continue

            # ==========================================
            # STOCK VALIDATION ONLY (NO DEDUCTION)
            # ==========================================
            if matched_prod.stock_quantity < requested_qty:
                logger.warning(f"Insufficient stock for {matched_prod.name}")
                run_sync(send_twilio_whatsapp_message(
                    to_number=customer_phone,
                    body_text=f"⚠️ Only {matched_prod.stock_quantity} units of {matched_prod.name} left. Please reduce quantity."
                ))
                order_success = False
                continue

            # ==========================================
            # NEGOTIATION HANDLING
            # ==========================================
            final_price = matched_prod.price  # Default to retail price

            if intent_action == "NEGOTIATION":
                offered_price = ai_response.get("offered_price", matched_prod.price)

                # Check if offer meets minimum floor price
                if Decimal(str(offered_price)) >= matched_prod.min_floor_price:
                    # Accept offer
                    final_price = offered_price
                    # Log the accepted bargain
                    bargain_log = BargainLog(
                        merchant_id=merchant_id,
                        customer_number=customer_phone,
                        product_id=matched_prod.id,
                        original_price=matched_prod.price,
                        final_price=final_price,
                        starting_offer=offered_price,
                        outcome="accepted"
                    )
                    db.add(bargain_log)
                else:
                    # Counter-offer formula
                    counter_price = matched_prod.min_floor_price + (matched_prod.price - matched_prod.min_floor_price) * Decimal("0.3")

                    # Log the counter-offer
                    bargain_log = BargainLog(
                        merchant_id=merchant_id,
                        customer_number=customer_phone,
                        product_id=matched_prod.id,
                        original_price=matched_prod.price,
                        final_price=counter_price,
                        starting_offer=offered_price,
                        counter_offers=[float(counter_price)],
                        outcome="rejected"
                    )
                    db.add(bargain_log)
                    db.commit()
                    
                    # Send Gemini's localized counter-offer reply (NOT hardcoded template)
                    # The assistant_reply from Gemini already contains the negotiation response
                    if assistant_reply:
                        run_sync(send_twilio_whatsapp_message(
                            to_number=customer_phone,
                            body_text=assistant_reply
                        ))
                    return  # Exit, waiting for customer response to counter-offer

            # Store for later deduction (only after payment/confirmation)
            item_total = Decimal(str(final_price)) * requested_qty
            matched_products.append({
                "product": matched_prod,
                "quantity": requested_qty,
                "unit_price": float(final_price),
                "total": float(item_total),
                "product_name": matched_prod.name,
                "product_id": matched_prod.id
            })
            total_amount += item_total

            # Stock alert for low inventory (informational only, no deduction)
            if matched_prod.stock_quantity <= STOCK_ALERT_THRESHOLD:
                send_slack_alert(
                    f"⚠️ Low stock alert: {matched_prod.name} (Merchant {merchant_id}) - {matched_prod.stock_quantity} remaining",
                    severity="warning"
                )

        except OperationalError as e:
            db.rollback()
            logger.error(f"Database deadlock detected: {str(e)}")
            order_success = False
            run_sync(send_twilio_whatsapp_message(
                to_number=customer_phone,
                body_text="We're experiencing high traffic. Please try again in a moment."
            ))
            break

    # ==========================================
    # STAGE 1: NEGOTIATION (send payment details after deal)
    # ==========================================
    if intent_action == "NEGOTIATION" and order_success and matched_products:
        # Use Gemini's assistant_reply for the deal confirmation (localized, Pidgin/English)
        if assistant_reply:
            run_sync(send_twilio_whatsapp_message(
                to_number=customer_phone,
                body_text=assistant_reply
            ))
        else:
            # Fallback only if assistant_reply is somehow empty
            payment_msg = (
                f"✅ Deal!\n\n"
                f"Pay to:\n{merchant.payment_details}\n"
                f"Amount: ₦{int(total_amount)}\n\n"
                f"Send proof of payment when done!"
            )
            run_sync(send_twilio_whatsapp_message(
                to_number=customer_phone,
                body_text=payment_msg
            ))

        # Build order_items JSON for pending order (stock NOT deducted yet)
        order_items = [
            {
                "product_id": mp["product_id"],
                "product_name": mp["product_name"],
                "quantity": mp["quantity"],
                "unit_price": mp["unit_price"],
                "total": mp["total"]
            }
            for mp in matched_products
        ]
        
        create_pending_order(db, customer_phone, merchant_id, order_items, total_amount)
        return  # EXIT — wait for payment

    # ==========================================
    # STAGE 2: PAYMENT REQUEST (fresh order, no negotiation)
    # ==========================================
    elif intent_action == "PAYMENT_REQUEST" and order_success and matched_products:
        # Use Gemini's assistant_reply (contains itemized cart + payment details)
        if assistant_reply:
            run_sync(send_twilio_whatsapp_message(
                to_number=customer_phone,
                body_text=assistant_reply
            ))
        else:
            # Fallback only if assistant_reply is empty
            payment_msg = (
                f"✅ Great choice!\n\n"
                f"Pay to:\n{merchant.payment_details}\n"
                f"Amount: ₦{int(total_amount)}\n\n"
                f"Send proof of payment when done!"
            )
            run_sync(send_twilio_whatsapp_message(
                to_number=customer_phone,
                body_text=payment_msg
            ))

        order_items = [
            {
                "product_id": mp["product_id"],
                "product_name": mp["product_name"],
                "quantity": mp["quantity"],
                "unit_price": mp["unit_price"],
                "total": mp["total"]
            }
            for mp in matched_products
        ]
        
        create_pending_order(db, customer_phone, merchant_id, order_items, total_amount)
        return

    # ==========================================
    # STAGE 3: DELIVERY REQUEST (customer says they paid)
    # ==========================================
    elif intent_action == "DELIVERY_REQUEST":
        # Use Gemini's assistant_reply for the delivery request (localized)
        if assistant_reply:
            run_sync(send_twilio_whatsapp_message(
                to_number=customer_phone,
                body_text=assistant_reply
            ))
        else:
            run_sync(send_twilio_whatsapp_message(
                to_number=customer_phone,
                body_text="✅ Payment received! Where should we deliver your order?\n\nPlease send your full address."
            ))

        # Update order status to payment_confirmed
        update_order_status(db, customer_phone, merchant_id, payment_status="confirmed")
        return

    # ==========================================
    # STAGE 4: ORDER CONFIRMATION (customer gives address)
    # ==========================================
    elif intent_action == "ORDER_CONFIRMATION":
        delivery_address = ai_response.get("delivery_address", message_text)

        # DEDUCT STOCK ONLY AT CONFIRMATION (when deal is locked)
        for mp in matched_products:
            mp["product"].stock_quantity -= mp["quantity"]
            db.add(mp["product"])  # Mark as modified

        # Update order with address and deduct stock
        update_order_with_address(db, customer_phone, merchant_id, delivery_address)

        # Generate receipt
        receipt_url = generate_receipt(db, customer_phone, merchant_id)

        # Use Gemini's assistant_reply for confirmation (localized)
        if assistant_reply:
            summary = build_order_summary(db, customer_phone, merchant_id)
            confirm_msg = (
                f"{assistant_reply}\n\n"
                f"Delivery: {delivery_address}\n\n"
                f"Receipt: {receipt_url}"
            )
            run_sync(send_twilio_whatsapp_message(
                to_number=customer_phone,
                body_text=confirm_msg
            ))
        else:
            summary = build_order_summary(db, customer_phone, merchant_id)
            confirm_msg = (
                f"✅ Order confirmed!\n\n"
                f"{summary}\n"
                f"Delivery: {delivery_address}\n\n"
                f"Receipt: {receipt_url}\n\n"
                f"Thank you for shopping with us! 🎉"
            )
            run_sync(send_twilio_whatsapp_message(
                to_number=customer_phone,
                body_text=confirm_msg
            ))

        # Send alert to merchant
        send_merchant_alert(db, customer_phone, merchant_id, summary)
        
        db.commit()  # Commit stock deductions + order updates
        return

    # ==========================================
    # 9. CREATE SINGLE UNIFIED ORDER (fallback for ORDER_PLACEMENT)
    # ==========================================
    if order_success and matched_products:
        try:
            # Deduct stock for direct ORDER_PLACEMENT (immediate lock-in)
            for mp in matched_products:
                mp["product"].stock_quantity -= mp["quantity"]
                db.add(mp["product"])

            order_items = [
                {
                    "product_id": mp["product_id"],
                    "product_name": mp["product_name"],
                    "quantity": mp["quantity"],
                    "unit_price": mp["unit_price"],
                    "total": mp["total"]
                }
                for mp in matched_products
            ]

            # Calculate unique order reference
            timestamp_str = datetime.now().strftime("%Y%m%d%H%M%S")
            unique_ref = f"ORD-{timestamp_str}-{customer_phone[-4:]}"
            message_hash = calculate_product_hash(message_text, customer_phone)

            new_order = Order(
                merchant_id=merchant_id,
                customer_number=customer_phone,
                order_reference=unique_ref,
                message_hash=message_hash,
                items_ordered=order_items,
                total_amount=total_amount,
                order_status="pending",
                payment_status="pending"
            )
            db.add(new_order)
            db.commit()
            logger.info(f"✅ Unified Order {unique_ref} committed for {customer_phone}")

            # Use Gemini's assistant_reply for order confirmation
            if assistant_reply:
                run_sync(send_twilio_whatsapp_message(
                    to_number=customer_phone,
                    body_text=assistant_reply
                ))
            else:
                summary = "\n".join([
                    f"- {item['quantity']}x {item['product_name']} @ ₦{int(item['unit_price'])}"
                    for item in order_items
                ])
                summary += f"\n\nTotal: ₦{int(total_amount)}"
                run_sync(send_twilio_whatsapp_message(
                    to_number=customer_phone,
                    body_text=f"✅ Order confirmed!\n\n{summary}\n\nThank you for shopping with us! 🎉"
                ))

        except Exception as e:
            db.rollback()
            logger.error(f"❌ Commit failed: {str(e)}")
            run_sync(send_twilio_whatsapp_message(
                to_number=customer_phone,
                body_text="We hit a snag saving your order. Please try again."
            ))
    else:
        db.rollback()
        logger.warning(f"Order processing failed for {customer_phone}")

        if assistant_reply and order_success:
            run_sync(send_twilio_whatsapp_message(
                to_number=customer_phone,
                body_text=assistant_reply
            ))




def create_pending_order(db, customer_phone, merchant_id, items, total):
    """Create order with pending status."""
    order = Order(
        merchant_id=merchant_id,
        customer_number=customer_phone,
        order_reference=f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}-{customer_phone[-4:]}",
        items_ordered=items,
        total_amount=total,
        order_status="pending",
        payment_status="pending"
    )
    db.add(order)
    db.commit()


def update_order_status(db, customer_phone, merchant_id, **kwargs):
    """Update latest order for customer."""
    order = db.query(Order).filter(
        Order.customer_number == customer_phone,
        Order.merchant_id == merchant_id,
        Order.order_status == "pending"
    ).order_by(Order.created_at.desc()).first()

    if order:
        for key, value in kwargs.items():
            setattr(order, key, value)
        db.commit()


def update_order_with_address(db, customer_phone, merchant_id, address):
    """Add delivery address to order."""
    order = db.query(Order).filter(
        Order.customer_number == customer_phone,
        Order.merchant_id == merchant_id,
        Order.order_status == "pending"
    ).order_by(Order.created_at.desc()).first()

    if order:
        order.delivery_address = address
        order.order_status = "confirmed"
        order.confirmed_at = datetime.utcnow()
        db.commit()


def generate_receipt(db, customer_phone, merchant_id):
    """Generate PDF receipt and return URL."""
    # TODO: Implement PDF generation
    return "https://bizzy.app/receipts/sample.pdf"


def send_merchant_alert(db, customer_phone, merchant_id, summary):
    """Send order alert to merchant's personal WhatsApp."""
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if merchant:
        alert_msg = (
            f"🔔 New Order!\n\n"
            f"Customer: {customer_phone}\n"
            f"{summary}\n\n"
            f"Check dashboard for details."
        )
        run_sync(send_twilio_whatsapp_message(
            to_number=merchant.owner_personal_number,
            body_text=alert_msg
        ))


def build_order_summary(db, customer_phone, merchant_id):
    """Build order summary string."""
    order = db.query(Order).filter(
        Order.customer_number == customer_phone,
        Order.merchant_id == merchant_id
    ).order_by(Order.created_at.desc()).first()

    if not order:
        return ""

    lines = []
    for item in order.items_ordered:
        lines.append(f"- {item['quantity']}x {item['product_name']} @ ₦{int(item['unit_price'])}")
    lines.append(f"\nTotal: ₦{int(order.total_amount)}")
    return "\n".join(lines)


def dispatch_voice_processing_pipeline(customer_phone: str, audio_meta: dict, merchant_id: int):
    """Handle voice message processing (future implementation)."""
    logger.info(f"🎙️ VOICE PROCESSING: {customer_phone}")
    logger.info(f"Audio Metadata: {audio_meta}")