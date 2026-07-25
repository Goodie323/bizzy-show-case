from fastapi import APIRouter, Request, Header, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import json
import logging

from app.api.deps import get_db
from app.core.paystack import verify_webhook_signature, verify_transaction
from app.core.paystack import initiate_transfer, calculate_settlement
from app.core.receipt import generate_receipt_pdf
from app.core.twillo_client import send_twilio_whatsapp_message
from app.api.v1.webhooks import run_sync
from app.db.models import Order, Merchant, SalesLedger

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/webhook")
async def paystack_webhook(
    request: Request,
    x_paystack_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Handle Paystack payment confirmation webhooks.
    Triggered when customer completes bank transfer.
    """
    payload = await request.body()
    
    # Verify signature
    if not verify_webhook_signature(payload, x_paystack_signature):
        logger.warning("Paystack webhook: Invalid signature")
        return {"status": "invalid_signature"}
    
    event = json.loads(payload)
    
    if event.get("event") != "charge.success":
        return {"status": "ignored"}
    
    data = event["data"]
    reference = data["reference"]
    
    # Find order
    order = db.query(Order).filter(
        Order.paystack_reference == reference
    ).first()
    
    if not order:
        logger.error(f"Paystack webhook: Order not found for ref {reference}")
        return {"status": "order_not_found"}
    
    # Idempotency: already processed
    if order.payment_status == "confirmed":
        return {"status": "already_processed"}
    
    # Verify amount matches
    amount_paid = Decimal(str(data["amount"])) / 100  # kobo to naira
    if amount_paid < order.total_amount:
        logger.warning(f"Underpayment: {amount_paid} < {order.total_amount}")
        # Handle partial payment logic if needed
    
    # Update order
    order.payment_status = "confirmed"
    order.paid_at = datetime.utcnow()
    db.commit()
    
    # Calculate settlement
    fees = calculate_settlement(order.total_amount)
    
    # INSTANT SETTLEMENT to merchant
    merchant = db.query(Merchant).filter(Merchant.id == order.merchant_id).first()
    if merchant and merchant.transfer_recipient_code:
        try:
            transfer_ref = f"BIZ-SETTLE-{order.order_reference}"
            transfer_result = initiate_transfer(
                amount_kobo=int(fees["merchant_gets"] * 100),
                recipient_code=merchant.transfer_recipient_code,
                reference=transfer_ref,
                reason=f"Settlement for order {order.order_reference}"
            )
            order.settlement_status = "transferred"
            order.settlement_reference = transfer_ref
            db.commit()
            logger.info(f"Instant transfer sent: {transfer_ref}")
        except Exception as e:
            logger.error(f"Instant transfer failed: {str(e)}")
            order.settlement_status = "failed"
            db.commit()
    
    # Create sales ledger entry
    ledger = SalesLedger(
        merchant_id=order.merchant_id,
        customer_number=order.customer_number,
        items_summary=order.items_ordered,
        total_amount=order.total_amount,
        payment_status="confirmed"
    )
    db.add(ledger)
    db.commit()
    
    # Generate receipt
    receipt_url = generate_receipt_pdf(
        db=db,
        order_id=order.id,
        paystack_fee=fees["paystack_fee"],
        platform_fee=fees["platform_fee"],
        merchant_gets=fees["merchant_gets"]
    )
    
    # Notify customer
    run_sync(send_twilio_whatsapp_message(
        to_number=order.customer_number,
        body_text=(
            f"✅ *Payment Confirmed!*\n\n"
            f"₦{int(order.total_amount)} received.\n"
            f"Reference: {reference}\n\n"
            f"📄 Receipt: {receipt_url or 'Generating...'}\n\n"
            f"Please send your delivery address to complete your order."
        )
    ))
    
    # Notify merchant
    if merchant:
        run_sync(send_twilio_whatsapp_message(
            to_number=merchant.owner_personal_number,
            body_text=(
                f"🔔 *NEW PAID ORDER*\n\n"
                f"Customer: {order.customer_number}\n"
                f"Amount: ₦{int(order.total_amount)}\n"
                f"Your settlement: ₦{int(fees['merchant_gets'])}\n"
                f"Status: {'Sent instantly ✅' if order.settlement_status == 'transferred' else 'Processing'}\n\n"
                f"Check dashboard for details."
            )
        ))
    
    return {"status": "payment_confirmed"}