from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from app.api.deps import get_db
from app.db.models import Merchant, Product, Order, BargainLog  # Adjust based on your models file
from app.schemas.api_schemas import (
    OTPSendPayload, OTPVerifyPayload,
    MerchantProfileResponse, MerchantProfileUpdate,
    ProductResponse, ProductCreatePayload, ProductUpdatePayload,
    OrderResponse, OrderStatusUpdate,
    BargainLogResponse, AnalyticsOverviewResponse, ProductPerformance
)

router = APIRouter()

# ==========================================
# 1. AUTHENTICATION ENDPOINTS
# ==========================================

@router.post("/auth/otp/send", status_code=status.HTTP_200_OK)
async def send_otp(payload: OTPSendPayload):
    print(f"📡 Mock OTP generation dispatched for: {payload.whatsapp_number}")
    return {"success": True, "message": f"OTP sent to {payload.whatsapp_number}", "expires_in": 300}

@router.post("/auth/otp/verify", status_code=status.HTTP_200_OK)
async def verify_otp(payload: OTPVerifyPayload):
    if payload.otp == "482910":
        return {
            "success": True,
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MGQ1ZWNiNzRkNmJiODMwYjhlNzExMTEifQ",
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
def get_merchant_profile(db: Session = Depends(get_db)):
    """
    GET /api/v1/merchant - Fetches the single active merchant profile.
    """
    merchant = db.query(Merchant).filter(Merchant.is_active == True).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")
    return merchant

@router.put("/merchant", response_model=MerchantProfileResponse)
def update_merchant_profile(payload: MerchantProfileUpdate, db: Session = Depends(get_db)):
    """
    PUT /api/v1/merchant - Updates editable settings on the merchant context.
    """
    merchant = db.query(Merchant).filter(Merchant.is_active == True).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")
        
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
# 3. PRODUCT CATALOG ENDPOINTS
# ==========================================

@router.get("/products", response_model=List[ProductResponse])
def get_products_catalog(
    search: Optional[str] = None,
    is_available: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    GET /api/v1/products - Fetches catalog inventory matching exact columns.
    """
    query = db.query(Product)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    if is_available is not None:
        query = query.filter(Product.is_available == is_available)
        
    return query.all()

@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreatePayload, db: Session = Depends(get_db)):
    """
    POST /api/v1/products - Inserts a new catalog item.
    """
    new_product = Product(
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
def update_product(id: int, payload: ProductUpdatePayload, db: Session = Depends(get_db)):
    """
    PUT /api/v1/products/{id} - Full or partial updates of a catalog product.
    """
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product ID does not exist")
        
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(product, key, value)
        
    db.commit()
    db.refresh(product)
    return product

@router.delete("/products/{id}", status_code=status.HTTP_200_OK)
def delete_product(id: int, db: Session = Depends(get_db)):
    """
    DELETE /api/v1/products/{id} - Soft deletes/deactivates a product.
    """
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product ID does not exist")
        
    product.is_available = False  # Standard soft-delete toggle
    db.commit()
    return {"success": True, "message": "Product successfully marked unavailable"}


# ==========================================
# 4. ORDER MANAGEMENT ENDPOINTS
# ==========================================

@router.get("/orders", response_model=List[OrderResponse])
def get_orders(status: Optional[str] = None, db: Session = Depends(get_db)):
    """
    GET /api/v1/orders - Reads transaction history directly.
    """
    query = db.query(Order)
    if status:
        query = query.filter(Order.order_status == status)
    return query.all()

@router.patch("/orders/{id}/status", response_model=OrderResponse)
def patch_order_status(id: int, payload: OrderStatusUpdate, db: Session = Depends(get_db)):
    """
    PATCH /api/v1/orders/{id}/status - Modifies processing or payment states.
    """
    order = db.query(Order).filter(Order.id == id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order ID does not exist")
        
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
# 5. AI BARGAIN LOG ENDPOINTS
# ==========================================

@router.get("/bargains", response_model=List[BargainLogResponse])
def get_bargain_logs(outcome: Optional[str] = None, db: Session = Depends(get_db)):
    """
    GET /api/v1/bargains - Retrieves live negotiation histories.
    """
    query = db.query(BargainLog)
    if outcome:
        query = query.filter(BargainLog.outcome == outcome)
    return query.all()


# ==========================================
# 6. ANALYTICS & PERFORMANCE ENDPOINTS
# ==========================================

@router.get("/analytics/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview(db: Session = Depends(get_db)):
    """
    GET /api/v1/analytics/overview - Card summaries for dashboard header widgets.
    """
    total_revenue = db.query(func.sum(Order.total_amount)).filter(Order.payment_status == "paid").scalar() or 0.0
    pending_orders = db.query(func.count(Order.id)).filter(Order.order_status == "pending").scalar() or 0
    completed_orders = db.query(func.count(Order.id)).filter(Order.order_status == "completed").scalar() or 0
    active_products = db.query(func.count(Product.id)).filter(Product.is_available == True).scalar() or 0
    
    # Track items with low stocks (<= 3 items remaining)
    low_stock = db.query(Product).filter(Product.stock_quantity <= 3, Product.is_available == True).all()
    alerts = [{"product_id": p.id, "name": p.name, "quantity": p.stock_quantity} for p in low_stock]
    
    return {
        "total_revenue": float(total_revenue),
        "pending_orders_count": int(pending_orders),
        "completed_orders_count": int(completed_orders),
        "active_products_count": int(active_products),
        "low_stock_alerts": alerts
    }

@router.get("/analytics/performance", response_model=List[ProductPerformance])
def get_products_performance(db: Session = Depends(get_db)):
    """
    GET /api/v1/analytics/performance - Evaluates product metrics and bargain conversions.
    """
    # Mocking aggregated calculations to unblock Next.js graphing
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