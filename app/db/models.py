# models.py
from sqlalchemy import Column, String, Integer, Numeric, ForeignKey, DateTime, JSON, Boolean, Text
from sqlalchemy.orm import relationship, declarative_base
import datetime

Base = declarative_base()

class Merchant(Base):
    """
    The Core Engine Lookup Table.
    Every incoming WhatsApp webhook uses the target business number 
    as a lookup key to pull this profile context.
    """
    __tablename__ = 'merchants'
    
    id = Column(Integer, primary_key=True, index=True)
    bizzy_number = Column(String, unique=True, nullable=False, index=True)  # WhatsApp Platform API number
    owner_personal_number = Column(String, nullable=False)                  # For real-time WhatsApp order alerts
    business_name = Column(String, nullable=False)
    preferred_language = Column(String, default="English")                  # Defaults: English, Pidgin
    payment_details = Column(String, nullable=False)                        # Bank name, Account No, Opay details
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    products = relationship("Product", back_populates="merchant", cascade="all, delete-orphan")
    sales_ledger = relationship("SalesLedger", back_populates="merchant", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="merchant", cascade="all, delete-orphan")
    bargain_logs = relationship("BargainLog", back_populates="merchant", cascade="all, delete-orphan")


class Product(Base):
    """
    The Isolated Merchant Inventory/Catalog.
    LLM pipelines parse queries against these names and variants.
    """
    __tablename__ = 'products'
    
    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(Integer, ForeignKey('merchants.id', ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)                       # e.g., "vintage shirt", "oud perfume"
    variant = Column(String, nullable=True, default="none")                 # e.g., "size_42", "large", "50ml"
    
    # Existing Retail Price (e.g., ₦7,500)
    price = Column(Numeric(12, 2), nullable=False)
    
    # 🌟 NEW SPRINT 2 FIELD FOR THE BARGAINING ENGINE 🌟
    # The absolute lowest price allowed (e.g., ₦6,000). Never leaked to the customer!
    min_floor_price = Column(Numeric(12, 2), nullable=False, default=0.0)
    
    stock_quantity = Column(Integer, default=0)                              # Monitored by 'Bizzy Watches' module
    is_available = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationships
    merchant = relationship("Merchant", back_populates="products")
    bargain_logs = relationship("BargainLog", back_populates="product", cascade="all, delete-orphan")


class SalesLedger(Base):
    """
    The Structured Transaction Book.
    Bizzy NEVER stores raw chat text, only this structured data output.
    """
    __tablename__ = 'sales_ledger'
    
    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(Integer, ForeignKey('merchants.id', ondelete="CASCADE"), nullable=False, index=True)
    customer_number = Column(String, nullable=False, index=True)            # Identity key of the buyer
    message_hash = Column(String, nullable=True)


    # Items schema array matching LLM structural parser output:
    # [ {"item": "vintage shirt", "qty": 2, "variant": "none", "unit_price": 5000} ]
    items_ordered = Column(JSON, nullable=False)                             
    
    total_amount = Column(Numeric(12, 2), nullable=False)
    payment_status = Column(String, default="pending")                       # pending, confirmed
    receipt_url = Column(String, nullable=True)                              # Generated branded PDF receipt S3 path
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    
    # Relationships
    merchant = relationship("Merchant", back_populates="sales_ledger")


class Order(Base):
    """
    Alternative Order model for webhook processing.
    Tracks individual order transactions with more detailed status tracking.
    """
    __tablename__ = 'orders'
    
    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(Integer, ForeignKey('merchants.id', ondelete="CASCADE"), nullable=False, index=True)
    customer_number = Column(String, nullable=False, index=True)
    order_reference = Column(String, unique=True, nullable=False, index=True)  # Unique order ID like ORD-2026-001
    
    # 🌟 ADDED FOR IDEMPOTENCY TRACKING 🌟
    message_hash = Column(String, nullable=True, index=True)                  

    # Items ordered with full details
    items_ordered = Column(JSON, nullable=False)                             # Full item details array
    total_amount = Column(Numeric(12, 2), nullable=False)
    
    # Order status tracking
    order_status = Column(String, default="pending")                         # pending, confirmed, processing, shipped, delivered, cancelled
    payment_status = Column(String, default="pending")                       # pending, confirmed, failed, refunded
    payment_method = Column(String, nullable=True)                           # bank_transfer, opay, cash, etc.
    
    # Shipping/delivery details
    delivery_address = Column(Text, nullable=True)
    delivery_status = Column(String, default="pending")                      # pending, picked_up, in_transit, delivered
    estimated_delivery_date = Column(DateTime, nullable=True)
    
    receipt_url = Column(String, nullable=True)                              # Generated branded PDF receipt S3 path
    notes = Column(Text, nullable=True)                                      # Special instructions or notes
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)                           # When payment was confirmed
    delivered_at = Column(DateTime, nullable=True)                           # When order was delivered
    
    # Relationships
    merchant = relationship("Merchant", back_populates="orders")
    bargain_logs = relationship("BargainLog", back_populates="order", cascade="all, delete-orphan")


class BargainLog(Base):
    """
    Track bargain/negotiation history for analytics and AI training.
    Stores the complete negotiation trail for each transaction.
    """
    __tablename__ = 'bargain_logs'
    
    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(Integer, ForeignKey('merchants.id', ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey('products.id', ondelete="CASCADE"), nullable=False)
    order_id = Column(Integer, ForeignKey('orders.id', ondelete="SET NULL"), nullable=True)
    
    customer_number = Column(String, nullable=False, index=True)
    
    # Pricing details
    original_price = Column(Numeric(12, 2), nullable=False)                 # Initial asking price
    final_price = Column(Numeric(12, 2), nullable=False)                    # Agreed final price
    discount_percentage = Column(Numeric(5, 2), nullable=True)              # Calculated discount % (0-100)
    discount_amount = Column(Numeric(12, 2), nullable=True)                 # Total discount amount
    
    # Negotiation details
    negotiation_rounds = Column(Integer, default=1)                         # Number of back-and-forth exchanges
    starting_offer = Column(Numeric(12, 2), nullable=True)                  # Customer's initial offer
    counter_offers = Column(JSON, nullable=True)                            # Array of all offer/counter-offer values
    
    # Outcome tracking
    outcome = Column(String, default="pending")                             # pending, accepted, rejected, expired
    customer_satisfaction = Column(Integer, nullable=True)                  # 1-5 rating if captured
    conversion_time_seconds = Column(Integer, nullable=True)               # Time from start to completion
    
    # AI/LLM metadata
    ai_model_used = Column(String, nullable=True)                           # Which AI model processed this negotiation
    prompt_version = Column(String, nullable=True)                          # Version of the prompt used
    confidence_score = Column(Numeric(5, 2), nullable=True)                # AI's confidence in the negotiation
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)                         # When negotiation ended
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Additional metadata
    session_id = Column(String, nullable=True, index=True)                  # For grouping multiple bargain attempts
    notes = Column(Text, nullable=True)                                    # Any additional context or notes
    
    # Relationships
    merchant = relationship("Merchant", back_populates="bargain_logs")
    product = relationship("Product", back_populates="bargain_logs")
    order = relationship("Order", back_populates="bargain_logs")


class WebhookLog(Base):
    """
    Track incoming webhook requests for debugging and analytics.
    Useful for monitoring and troubleshooting WhatsApp webhook integrations.
    """
    __tablename__ = 'webhook_logs'
    
    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(Integer, ForeignKey('merchants.id', ondelete="SET NULL"), nullable=True)
    
    # Webhook metadata
    webhook_type = Column(String, nullable=False)                          # whatsapp, payment, etc.
    source_number = Column(String, nullable=False, index=True)            # Sender's phone number
    destination_number = Column(String, nullable=False, index=True)       # Business number
    
    # Request details
    raw_payload = Column(JSON, nullable=True)                             # Full raw payload received
    processed_data = Column(JSON, nullable=True)                          # After processing/parsing
    
    # Status tracking
    status = Column(String, default="received")                           # received, processing, completed, failed
    error_message = Column(Text, nullable=True)                           # Any error that occurred
    
    # Response tracking
    response_sent = Column(Text, nullable=True)                           # Response sent back to user
    response_timestamp = Column(DateTime, nullable=True)
    
    # Performance metrics
    processing_time_ms = Column(Integer, nullable=True)                  # Time to process the webhook
    
    # Timestamps
    received_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    
    # IP and security
    source_ip = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    # Relationships
    merchant = relationship("Merchant")


class ProductAnalytics(Base):
    """
    Track product performance and analytics.
    Helps merchants understand which products are popular and profitable.
    """
    __tablename__ = 'product_analytics'
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey('products.id', ondelete="CASCADE"), nullable=False, index=True)
    merchant_id = Column(Integer, ForeignKey('merchants.id', ondelete="CASCADE"), nullable=False, index=True)
    
    # View metrics
    total_views = Column(Integer, default=0)                              # How many times product was shown
    total_queries = Column(Integer, default=0)                           # How many times product was queried
    
    # Conversion metrics
    total_orders = Column(Integer, default=0)                            # How many orders for this product
    total_revenue = Column(Numeric(12, 2), default=0.0)                 # Total revenue from this product
    
    # Pricing metrics
    average_selling_price = Column(Numeric(12, 2), nullable=True)       # Average price actually sold at
    discount_frequency = Column(Integer, default=0)                     # How often product was discounted
    
    # Customer metrics
    unique_customers = Column(Integer, default=0)                       # Unique customers who bought this
    
    # Time period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    period_type = Column(String, default="daily")                       # daily, weekly, monthly, quarterly
    
    # Additional metrics
    stock_turnover_rate = Column(Numeric(10, 2), nullable=True)        # How fast inventory moves
    profit_margin = Column(Numeric(5, 2), nullable=True)               # Profit margin percentage
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationships
    product = relationship("Product")
    merchant = relationship("Merchant")