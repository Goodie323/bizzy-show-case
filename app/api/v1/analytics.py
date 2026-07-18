from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.db import models
from app.api.deps import get_db, get_current_merchant
from app.db.models import Merchant

router = APIRouter(tags=["Analytics"])

@router.get("/summary")
def get_analytics_summary(
    db: Session = Depends(get_db),
    merchant: Merchant = Depends(get_current_merchant)
):
    """Returns analytics summary scoped to the authenticated merchant."""
    total_revenue = db.query(func.sum(models.SalesLedger.total_amount))                      .filter(models.SalesLedger.merchant_id == merchant.id)                      .filter(models.SalesLedger.payment_status == "confirmed").scalar() or 0.0

    total_views = db.query(func.sum(models.ProductAnalytics.total_views))                    .filter(models.ProductAnalytics.merchant_id == merchant.id).scalar() or 0

    total_orders = db.query(func.sum(models.ProductAnalytics.total_orders))                     .filter(models.ProductAnalytics.merchant_id == merchant.id).scalar() or 0

    return {
        "total_revenue": float(total_revenue),
        "total_sales_count": int(total_orders),
        "total_product_views": int(total_views)
    }

@router.get("/revenue")
def get_revenue_timeline(
    period: str = Query("week", regex="^(day|week|month)$"),
    db: Session = Depends(get_db),
    merchant: Merchant = Depends(get_current_merchant)
):
    """Returns revenue timeline scoped to the authenticated merchant."""
    now = datetime.utcnow()

    if period == "day":
        start_date = now - timedelta(days=1)
    elif period == "week":
        start_date = now - timedelta(weeks=1)
    else:
        start_date = now - timedelta(days=30)

    revenue_data = db.query(func.sum(models.SalesLedger.total_amount))                     .filter(models.SalesLedger.merchant_id == merchant.id)                     .filter(models.SalesLedger.payment_status == "confirmed")                     .filter(models.SalesLedger.timestamp >= start_date).scalar() or 0.0

    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "revenue": float(revenue_data)
    }
