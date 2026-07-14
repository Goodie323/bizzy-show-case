from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

# ==========================================
# 1. AUTH SCHEMAS (Keep for Isaac's Login)
# ==========================================
class OTPSendPayload(BaseModel):
    whatsapp_number: str = Field(..., example="+2348012345678")

class OTPVerifyPayload(BaseModel):
    whatsapp_number: str = Field(..., example="+2348012345678")
    otp: str = Field(..., example="482910")

# ==========================================
# 2. MERCHANT SCHEMAS
# ==========================================
class MerchantProfileResponse(BaseModel):
    id: int
    bizzy_number: str
    owner_personal_number: Optional[str] = None
    business_name: str
    preferred_language: Optional[str] = "english"
    payment_details: Optional[dict] = None  # Stores bank, account number, account name
    is_active: bool

    class Config:
        orm_mode = True

class MerchantProfileUpdate(BaseModel):
    business_name: Optional[str] = None
    preferred_language: Optional[str] = None
    payment_details: Optional[dict] = None
    is_active: Optional[bool] = None

# ==========================================
# 3. PRODUCT SCHEMAS
# ==========================================
class ProductResponse(BaseModel):
    id: int
    name: str
    variant: Optional[str] = "none"
    price: float
    min_floor_price: float
    stock_quantity: int
    is_available: bool

    class Config:
        orm_mode = True

class ProductCreatePayload(BaseModel):
    name: str
    variant: Optional[str] = "none"
    price: float
    min_floor_price: float
    stock_quantity: int
    is_available: Optional[bool] = True

class ProductUpdatePayload(BaseModel):
    name: Optional[str] = None
    variant: Optional[str] = None
    price: Optional[float] = None
    min_floor_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    is_available: Optional[bool] = None

# ==========================================
# 4. ORDER SCHEMAS
# ==========================================
class OrderResponse(BaseModel):
    id: int
    customer_number: str  # 🌟 Pure DB representation mapping
    order_reference: Optional[str] = None
    message_hash: Optional[str] = None
    items_ordered: List[dict]  # JSON Array of nested snapshot items
    total_amount: float
    order_status: str
    payment_status: str
    payment_method: Optional[str] = "bank_transfer"
    delivery_address: Optional[str] = None
    delivery_status: Optional[str] = "pending"
    estimated_delivery_date: Optional[datetime] = None
    receipt_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True

class OrderStatusUpdate(BaseModel):
    order_status: Optional[str] = None
    payment_status: Optional[str] = None
    delivery_status: Optional[str] = None

# ==========================================
# 5. BARGAIN LOG SCHEMAS
# ==========================================
class BargainLogResponse(BaseModel):
    id: int
    product_id: int
    order_id: Optional[int] = None
    customer_number: str
    original_price: float
    final_price: float
    discount_percentage: float
    discount_amount: float
    negotiation_rounds: int
    starting_offer: float
    counter_offers: Optional[List[float]] = []  # JSON array of rounds
    outcome: str  # e.g., "accepted", "rejected", "abandoned"
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        orm_mode = True

# ==========================================
# 6. ANALYTICS SCHEMAS
# ==========================================
class AnalyticsOverviewResponse(BaseModel):
    total_revenue: float
    pending_orders_count: int
    completed_orders_count: int
    active_products_count: int
    low_stock_alerts: List[dict]

class ProductPerformance(BaseModel):
    product_id: int
    name: str
    units_sold: int
    revenue_generated: float
    successful_bargains_count: int