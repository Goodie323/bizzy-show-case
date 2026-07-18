from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
import jwt
import os

from app.api.deps import get_db, get_current_merchant
from app.db.models import Merchant, Product, Order, BargainLog
from app.schemas.api_schemas import (
    OTPSendPayload, OTPVerifyPayload,
    MerchantProfileResponse, MerchantProfileUpdate,
    ProductResponse, ProductCreatePayload, ProductUpdatePayload,
    OrderResponse, OrderStatusUpdate,
    BargainLogResponse, AnalyticsOverviewResponse, ProductPerformance
)

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "bizzy-2026-secret-key-change-me")

# ==========================================
# 1. AUTHENTICATION ENDPOINTS (No auth required)
# ==========================================

@router.post("/auth/otp/send", status_code=status.HTTP_200_OK)
async def send_otp(payload: OTPSendPayload):
    print(f"📡 Mock OTP generation dispatched for: {payload.whatsapp_number}")
    return {"success": True, "message": f"OTP sent to {payload.whatsapp_number}", "expires_in": 300}

@router.post("/auth/otp/verify", status_code=status.HTTP_200_OK)
async def verify_otp(payload: OTPVerifyPayload):
    if payload.otp == "482910":
        token = jwt.encode(
            {"merchant_id": 1, "exp": datetime.utcnow() + timedelta(days=1)},
            SECRET_KEY,
            algorithm="HS256"
        )
        return {
            "success": True,
            "access_token": token,
            "token_type": "bearer",
            "merchant_id": 1,
            "business_name": "Scent by Zara",
            "expires_in": 86400
        }
    raise HTTPException(status_code=401, detail="Invalid or expired OTP")


# ==========================================
# 2. MERCHANT PROFILE ENDPOINTS
# ==========================================

@router.get("/merchant", response_model=MerchantProfileResponse)
def get_merchant_profile(
    merchant: Merchant = Depends(get_current_merchant)
):
    return merchant

@router.put("/merchant", response_model=MerchantProfileResponse)
def update_merchant_profile(
    payload: MerchantProfileUpdate,
    db: Session = Depends(get_db),
    merchant: Merchant = Depends(get_current_merchant)
):
    if payload.business_name is not None:
        merchant.business_name = payload.business_name
    if payload.preferred_language is not None:
        merchant.preferred_language = payload.preferred_language
    if payload.payment_details is not None:
        merchant.payment_details = payload.payment_details
    if payload.is_active is not None:
        merchant.is_active = payload.is_active
        
    db.commit()
    db.refresh(merchant)
    return merchant


# ==========================================
# 3. PRODUCT CATALOG ENDPOINTS (Auth + merchant-scoped)
# ==========================================

@router.get("/products", response_model=List[ProductResponse])
def get_products_catalog(
    search: Optional[str] = None,
    is_available: Optional[bool] = None,
    db: Session = Depends(get_db),
    merchant: Merchant = Depends(get_current_merchant)
):
    query = db.query(Product).filter(Product.merchant_id == merchant.id)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    if is_available is not None:
        query = query.filter(Product.is_available == is_available)
    return query.all()

@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreatePayload,
    db: Session = Depends(get_db),
    merchant: Merchant = Depends(get_current_merchant)
):
    new_product = Product(
        merchant_id=merchant.id,
        name=payload.name,
        variant=payload.variant,
        price=payload.price,
        min_floor_price=payload.min_floor_price,
        stock_quantity=payload.stock_quantity,
        is_available=payload.is_available
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@router.put("/products/{id}", response_model=ProductResponse)
def update_product(
    id: int,
    payload: ProductUpdatePayload,
    db: Session = Depends(get_db),
    merchant: Merchant = Depends(get_current_merchant)
):
    product = db.query(Product).filter(
        Product.id == id,
        Product.merchant_id == merchant.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(product, key, value)
        
    db.commit()
    db.refresh(product)
    return product

@router.delete("/products/{id}", status_code=status.HTTP_200_OK)
def delete_product(
    id: int,
    db: Session = Depends(get_db),
    merchant: Merchant = Depends(get_current_merchant)
):
    product = db.query(Product).filter(
        Product.id == id,
        Product.merchant_id == merchant.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    product.is_available = False
    db.commit()
    return {"success": True, "message": "Product successfully marked unavailable"}


# ==========================================
# 4. ORDER MANAGEMENT ENDPOINTS (Auth + merchant-scoped)
# ==========================================

@router.get("/orders", response_model=List[OrderResponse])
def get_orders(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    merchant: Merchant = Depends(get_current_merchant)
):
    query = db.query(Order).filter(Order.merchant_id == merchant.id)
    if status:
        query = query.filter(Order.order_status == status)
    return query.all()

@router.patch("/orders/{id}/status", response_model=OrderResponse)
def patch_order_status(
    id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    merchant: Merchant = Depends(get_current_merchant)
):
    order = db.query(Order).filter(
        Order.id == id,
        Order.merchant_id == merchant.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if payload.order_status is not None:
        order.order_status = payload.order_status
    if payload.payment_status is not None:
        order.payment_status = payload.payment_status
    if payload.delivery_status is not None:
        order.delivery_status = payload.delivery_status
        
    db.commit()
    db.refresh(order)
    return order


# ==========================================
# 5. AI BARGAIN LOG ENDPOINTS (Auth + merchant-scoped)
# ==========================================

@router.get("/bargains", response_model=List[BargainLogResponse])
def get_bargain_logs(
    outcome: Optional[str] = None,
    db: Session = Depends(get_db),
    merchant: Merchant = Depends(get_current_merchant)
):
    query = db.query(BargainLog).filter(BargainLog.merchant_id == merchant.id)
    if outcome:
        query = query.filter(BargainLog.outcome == outcome)
    return query.all()


# ==========================================
# 6. ANALYTICS & PERFORMANCE ENDPOINTS (Auth + merchant-scoped)
# ==========================================

@router.get("/analytics/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview(
    db: Session = Depends(get_db),
    merchant: Merchant = Depends(get_current_merchant)
):
    total_revenue = db.query(func.sum(Order.total_amount))\
        .filter(Order.merchant_id == merchant.id)\
        .filter(Order.payment_status == "paid").scalar() or 0.0
    
    pending_orders = db.query(func.count(Order.id))\
        .filter(Order.merchant_id == merchant.id)\
        .filter(Order.order_status == "pending").scalar() or 0
    
    completed_orders = db.query(func.count(Order.id))\
        .filter(Order.merchant_id == merchant.id)\
        .filter(Order.order_status == "completed").scalar() or 0
    
    active_products = db.query(func.count(Product.id))\
        .filter(Product.merchant_id == merchant.id)\
        .filter(Product.is_available == True).scalar() or 0
    
    low_stock = db.query(Product)\
        .filter(Product.merchant_id == merchant.id)\
        .filter(Product.stock_quantity <= 3, Product.is_available == True).all()
    
    alerts = [{"product_id": p.id, "name": p.name, "quantity": p.stock_quantity} for p in low_stock]
    
    return {
        "total_revenue": float(total_revenue),
        "pending_orders_count": int(pending_orders),
        "completed_orders_count": int(completed_orders),
        "active_products_count": int(active_products),
        "low_stock_alerts": alerts
    }

@router.get("/analytics/performance", response_model=List[ProductPerformance])
def get_products_performance(
    db: Session = Depends(get_db),
    merchant: Merchant = Depends(get_current_merchant)
):
    performance_list = [
        {
            "product_id": 1,
            "name": "vintage shirt",
            "units_sold": 15,
            "revenue_generated": 97500.0,
            "successful_bargains_count": 8
        },
        {
            "product_id": 2,
            "name": "oud perfume",
            "units_sold": 5,
            "revenue_generated": 75000.0,
            "successful_bargains_count": 2
        }
    ]
    return performance_list

@router.get("/analytics/revenue/daily")
def get_daily_revenue(
    db: Session = Depends(get_db),
    merchant: Merchant = Depends(get_current_merchant)
):
    from datetime import datetime, timedelta
    from sqlalchemy import func, cast, Date
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    
    daily = db.query(
        cast(models.SalesLedger.timestamp, Date).label("date"),
        func.sum(models.SalesLedger.total_amount).label("revenue")
    ).filter(
        models.SalesLedger.merchant_id == merchant.id,
        models.SalesLedger.payment_status == "confirmed",
        models.SalesLedger.timestamp >= start_date
    ).group_by(
        cast(models.SalesLedger.timestamp, Date)
    ).order_by(
        cast(models.SalesLedger.timestamp, Date)
    ).all()
    
    result = []
    current = start_date.date()
    revenue_map = {str(d.date): float(d.revenue) for d in daily}
    
    while current <= end_date.date():
        date_str = current.strftime("%Y-%m-%d")
        day_name = current.strftime("%a")
        result.append({
            "date": date_str,
            "day": day_name,
            "revenue": revenue_map.get(date_str, 0.0)
        })
        current += timedelta(days=1)
    
    return result