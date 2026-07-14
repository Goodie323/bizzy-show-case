import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.db.models import Base, Merchant, Product

# --- Production Database Configuration (PostgreSQL) ---
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+psycopg2://bizzy_user:1234@localhost:5432/bizzy_prod"
)

# PostgreSQL engine (no connect_args needed)
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """
    Production Dependency Provider for FastAPI requests.
    Safely opens a PostgreSQL transaction pool window and closes it post-execution.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Local Development / Testing Block (SQLite) ---
# Use SQLite only for quick local tests, not production.
SQLITE_URL = "sqlite:///./test_bizzy.db"

sqlite_engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False}  # Required for SQLite multi-threaded worker compatibility
)

SQLiteSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_engine)

# Create tables in SQLite for local dev
Base.metadata.create_all(bind=sqlite_engine)

def seed_mock_merchant_data():
    """
    Seeds mock merchant + product data for local testing.
    Includes hidden bargaining floors for Sprint 2 negotiation engine.
    """
    db = SQLiteSessionLocal()
    try:
        existing = db.query(Merchant).filter(Merchant.bizzy_number == "+2349010001111").first()
        if not existing:
            mock_merchant = Merchant(
                bizzy_number="+2349010001111",
                owner_personal_number="+2348039999999",
                business_name="Scent by Zara",
                preferred_language="English",
                payment_details="GTBank 0123456789"
            )
            db.add(mock_merchant)
            db.commit()
            db.refresh(mock_merchant)

            # 🌟 Updated mock products with hidden bargaining floors
            mock_products = [
                Product(
                    merchant_id=mock_merchant.id, 
                    name="vintage shirt", 
                    variant="none", 
                    price=7500.0, 
                    min_floor_price=6000.0,  # Hidden bargaining floor
                    stock_quantity=15
                ),
                Product(
                    merchant_id=mock_merchant.id, 
                    name="oud perfume", 
                    variant="big", 
                    price=15000.0, 
                    min_floor_price=13500.0, # Hidden bargaining floor
                    stock_quantity=5
                ),
            ]
            db.add_all(mock_products)
            db.commit()
    finally:
        db.close()

# Run seeding for local dev
seed_mock_merchant_data()
