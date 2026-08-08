from fastapi import APIRouter, Request, Form, BackgroundTasks, Depends
from sqlalchemy.orm import Session
import logging

from app.api.deps import get_db
from app.core.africas_talking import parse_at_webhook_payload
from app.db.models import Merchant

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/webhook")
async def handle_at_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    from_number: str = Form(..., alias="from"),
    to_number: str = Form(..., alias="to"),
    text: str = Form(...),
    linkId: str = Form(""),
    id: str = Form(""),
):
    """
    Africa's Talking incoming WhatsApp webhook.
    Receives form-data when customer sends message.
    """
    logger.info(f"🚨 AT WEBHOOK: {from_number} → {to_number}: '{text[:50]}...'")

    payload = parse_at_webhook_payload({
        "from": from_number,
        "to": to_number,
        "text": text,
        "linkId": linkId,
        "id": id
    })
    
    if not payload:
        return {"status": "invalid_payload"}

    customer_phone = payload["from"]
    bizzy_number = payload["to"]

    merchant = db.query(Merchant).filter(
        Merchant.bizzy_number == bizzy_number,
        Merchant.is_active == True
    ).first()

    if not merchant:
        merchant = db.query(Merchant).filter(Merchant.is_active == True).first()

    if not merchant:
        logger.error("No active merchant found")
        return {"status": "no_merchant"}

    # TODO: Route to your existing AI pipeline
    # For now, just acknowledge
    return {"status": "event_received_and_queued"}


@router.post("/delivery-reports")
async def at_delivery_report(
    messageId: str = Form(""),
    status: str = Form(""),
    phoneNumber: str = Form(""),
):
    """Handle Africa's Talking delivery receipts."""
    logger.info(f"📬 AT Delivery: {messageId} → {phoneNumber} = {status}")
    return {"status": "logged"}