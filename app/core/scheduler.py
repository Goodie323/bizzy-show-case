from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from app.db.session import SessionLocal
from app.db.models import Order
from app.core.twillo_client import send_twilio_whatsapp_message
from app.api.v1.webhooks import run_sync

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()


def check_expiring_payments():
    """Send reminders for payments expiring in 5 minutes."""
    db = SessionLocal()
    try:
        now = datetime.now()
        reminder_window_start = now + timedelta(minutes=4)
        reminder_window_end = now + timedelta(minutes=6)
        
        expiring_orders = db.query(Order).filter(
            Order.payment_status == "pending",
            Order.paystack_expires_at.between(reminder_window_start, reminder_window_end)
        ).all()
        
        for order in expiring_orders:
            expiry = order.paystack_expires_at.strftime("%I:%M %p")
            run_sync(send_twilio_whatsapp_message(
                to_number=order.customer_number,
                body_text=(
                    f"⏰ *5 MINUTES LEFT!*\n\n"
                    f"Your payment of ₦{int(order.total_amount)} expires at *{expiry}*.\n\n"
                    f"Transfer now or reply *NEW* to get a fresh account."
                )
            ))
            logger.info(f"Expiry reminder sent to {order.customer_number}")
    
    except Exception as e:
        logger.error(f"Expiry reminder job failed: {str(e)}")
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(
        check_expiring_payments,
        trigger=IntervalTrigger(minutes=1),
        id="expiry_reminders",
        name="Payment expiry reminders",
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started")