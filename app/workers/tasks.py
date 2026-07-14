import logging
from sqlalchemy.orm import Session
from decimal import Decimal

from app.db.models import Merchant, Product, SalesLedger
from app.core.gemini import process_customer_message
from app.api.deps import get_db

# Configure logger for pipeline visibility
logger = logging.getLogger("bizzy.workers")

def dispatch_gemini_intelligence_pipeline(customer_phone: str, message_text: str, merchant_id: int):
    """
    Asynchronous Background Worker.
    Ties together the DB session state, localized merchant context, 
    the Gemini Intelligence parser, and state mutations.
    """
    # 1. Open a fresh isolated context manager database session for the background task
    db_session_gen = get_db()
    db: Session = next(db_session_gen)
    
    try:
        # 2. Fetch the target merchant profile context
        merchant = db.query(Merchant).filter(Merchant.id == merchant_id, Merchant.is_active == True).first()
        if not merchant:
            logger.error(f"Worker execution failed: Merchant ID {merchant_id} not found or inactive.")
            return

        # 3. Compile the merchant's live inventory catalog to inject into Gemini's context window
        products = db.query(Product).filter(Product.merchant_id == merchant_id, Product.is_available == True).all()
        catalog_context = [
            {
                "id": p.id,
                "name": p.name,
                "variant": p.variant or "none",
                "price": float(p.price),
                "min_floor_price": float(p.min_floor_price),  # 🌟 include hidden bargaining floor
                "stock": p.stock_quantity
            }
            for p in products
        ]

        merchant_context = {
            "business_name": merchant.business_name,
            "payment_details": merchant.payment_details,
            "catalog": catalog_context
        }

        # 👇 FORCE CONSOLE VISIBILITY PRINT STATEMENTS 👇
        print("\n=== ⚡ BIZZY CORE BARGAINING ENGINE LAUNCHED ⚡ ===")
        print(f"Incoming Text: '{message_text}'")
        print(f"Catalog Injected to AI:\n{catalog_context}")

        # 4. Invoke the structural Gemini Pipeline
        logger.info(f"Invoking Gemini Engine for customer {customer_phone} on merchant line {merchant.business_name}")
        ai_response = process_customer_message(
            message_text=message_text,
            merchant_context=merchant_context
        )

        # Extract structured intelligence
        action = ai_response.get("intent_action")
        is_haggling = ai_response.get("is_haggling", False)
        extracted_items = ai_response.get("parsed_items", [])
        assistant_reply = ai_response.get("assistant_reply", "")

        print("=== 🧠 GEMINI BARGAINING OUTPUT EXTRACTED STATUS ===")
        print(f"AI Assistant Reply: {assistant_reply}")
        print(f"Is Haggling Intent Detected?: {is_haggling}")
        print(f"Intent Action Tag: {action}\n")

        # 5. Mutate State & Log Business Data if explicit conversion intent is found
        if action == "ORDER_PLACEMENT" and extracted_items:
            logger.info(f"Order placement intent detected for {customer_phone}. Processing ledger logging...")
            
            calculated_total = Decimal("0.00")
            validated_order_items = []

            for item in extracted_items:
                item_name = item.get("product_name", "").lower()
                order_qty = item.get("quantity", 1)
                item_variant = item.get("variant", "none")

                # Look up the closest item match in the database catalog
                matched_product = db.query(Product).filter(
                    Product.merchant_id == merchant_id,
                    Product.name.ilike(f"%{item_name}%")
                ).first()

                if matched_product:
                    # 🌟 Bargaining-aware pricing: enforce min_floor_price if haggling detected
                    if is_haggling:
                        unit_price = max(matched_product.min_floor_price, matched_product.price)
                    else:
                        unit_price = matched_product.price

                    item_total = unit_price * order_qty
                    calculated_total += item_total
                    
                    # Deduct the stock quantity via the tracking rules (Bizzy Watches module)
                    if matched_product.stock_quantity >= order_qty:
                        matched_product.stock_quantity -= order_qty
                    
                    validated_order_items.append({
                        "product_id": matched_product.id,
                        "item": matched_product.name,
                        "qty": order_qty,
                        "variant": item_variant,
                        "unit_price": float(unit_price)
                    })

            if validated_order_items:
                # Insert the structured transaction records directly into the Sales Ledger
                new_ledger_entry = SalesLedger(
                    merchant_id=merchant_id,
                    customer_number=customer_phone,
                    items_ordered=validated_order_items,
                    total_amount=calculated_total,
                    payment_status="pending"
                )
                db.add(new_ledger_entry)
                db.commit()
                
                # Trigger internal background real-time alerts to the merchant's personal line
                trigger_merchant_order_alert(
                    merchant_personal_number=merchant.owner_personal_number,
                    customer_phone=customer_phone,
                    order_items=validated_order_items,
                    total_amount=calculated_total
                )

        # 6. Deliver the generated natural language text response directly back to the customer
        send_whatsapp_outbound_message(
            recipient_phone=customer_phone,
            message_text=assistant_reply,
            sender_line=merchant.bizzy_number
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Critical execution error in background worker pipeline: {str(e)}")
    finally:
        db.close()


def send_whatsapp_outbound_message(recipient_phone: str, message_text: str, sender_line: str):
    """
    Dispatches the final localized response string to the customer via the active WhatsApp Business Cloud API.
    """
    logger.info(f"Outbound Delivery -> Sending text to {recipient_phone} from {sender_line}: '{message_text[:30]}...'")
    # This maps directly to your outbound Meta Cloud API / BSP payload configuration layer next.
    pass


def trigger_merchant_order_alert(merchant_personal_number: str, customer_phone: str, order_items: list, total_amount: Decimal):
    """
    Bizzy Notifications Layer. Immediately notifies the business owner on their personal line 
    when an order draft is generated.
    """
    logger.info(f"Alert Dispatch -> Notifying Merchant at {merchant_personal_number} of new pending order from {customer_phone}.")
    pass
