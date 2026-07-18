import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from jose import JWTError, jwt
from app.db.models import Base, Merchant, Product

# --- Production Database Configuration (PostgreSQL) ---
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+psycopg2://bizzy_user:1234@localhost:5432/bizzy_prod"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- JWT Auth Configuration ---
SECRET_KEY = os.getenv("SECRET_KEY", "bizzy-secret-key-change-in-production")
ALGORITHM = "HS256"
security = HTTPBearer()

async def get_current_merchant(
    db: Session = Depends(get_db),
    credentials = Depends(security)
) -> Merchant:
    """Extract merchant from JWT Bearer token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Try both possible keys for merchant_id
        merchant_id = payload.get("merchant_id") or payload.get("sub")
        if merchant_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    merchant = db.query(Merchant).filter(Merchant.id == int(merchant_id)).first()
    if merchant is None:
        raise credentials_exception

    return merchant

# --- Local Development / Testing Block (SQLite) ---
SQLITE_URL = "sqlite:///./test_bizzy.db"

sqlite_engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False}
)

SQLiteSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_engine)
Base.metadata.create_all(bind=sqlite_engine)

def seed_mock_merchant_data():
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

            mock_products = [
                Product(
                    merchant_id=mock_merchant.id, 
                    name="vintage shirt", 
                    variant="none", 
                    price=7500.0, 
                    min_floor_price=6000.0,
                    stock_quantity=15
                ),
                Product(
                    merchant_id=mock_merchant.id, 
                    name="oud perfume", 
                    variant="big", 
                    price=15000.0, 
                    min_floor_price=13500.0,
                    stock_quantity=5
                ),
            ]
            db.add_all(mock_products)
            db.commit()
    finally:
        db.close()

seed_mock_merchant_data()
