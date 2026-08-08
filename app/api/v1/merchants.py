# app/api/v1/merchants.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator
from typing import Optional
import logging
import os
from datetime import datetime, timedelta
import jwt

from app.api.deps import get_db
from app.db.models import Merchant
from app.core.paystack import create_merchant_subaccount, create_transfer_recipient

logger = logging.getLogger(__name__)
router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "bizzy-2026-secret-key-change-me")

# =============================================================================
# BANK CODE MAPPING (Nigeria)
# =============================================================================

NIGERIAN_BANKS = {
    "044": "Access Bank",
    "023": "Citibank",
    "050": "Ecobank",
    "070": "Fidelity Bank",
    "011": "First Bank",
    "214": "First City Monument Bank",
    "058": "Guaranty Trust Bank",
    "030": "Heritage Bank",
    "301": "Jaiz Bank",
    "082": "Keystone Bank",
    "076": "Polaris Bank",
    "039": "Stanbic IBTC",
    "232": "Sterling Bank",
    "100": "SunTrust Bank",
    "032": "Union Bank",
    "033": "United Bank for Africa",
    "215": "Unity Bank",
    "035": "Wema Bank",
    "057": "Zenith Bank",
    "999991": "Opay",
    "999992": "Palmpay",
    "999993": "Kuda",
}


# =============================================================================
# SCHEMAS
# =============================================================================

class MerchantOnboardRequest(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=100)
    bizzy_number: str = Field(..., description="WhatsApp business number, e.g., +2348012345678")
    owner_personal_number: str = Field(..., description="Owner's personal WhatsApp for alerts")
    preferred_language: str = Field(default="English")
    payment_details: str = Field(..., description="Human-readable: GTBank 0123456789 John Doe")

    # Bank details for Paystack subaccount
    settlement_bank_name: str = Field(..., description="Bank name, e.g., 'GTBank' or 'Access Bank'")
    settlement_account_number: str = Field(..., min_length=10, max_length=10)

    # Platform fee agreement
    agree_to_platform_fee: bool = Field(..., description="Merchant agrees to 3% platform fee")

    @validator('settlement_account_number')
    def validate_account_number(cls, v):
        if not v.isdigit() or len(v) != 10:
            raise ValueError("Account number must be exactly 10 digits")
        return v

    @validator('agree_to_platform_fee')
    def validate_fee_agreement(cls, v):
        if not v:
            raise ValueError("Merchant must agree to platform fee to onboard")
        return v


class MerchantOnboardResponse(BaseModel):
    id: int
    business_name: str
    bizzy_number: str
    paystack_subaccount_code: Optional[str]
    transfer_recipient_code: Optional[str]
    status: str
    message: str
    access_token: Optional[str] = None


# =============================================================================
# HELPERS
# =============================================================================

def resolve_bank_code(bank_name: str) -> str:
    """
    Map common bank names to Paystack bank codes.
    """
    bank_name_lower = bank_name.lower().strip()

    # Direct mappings
    aliases = {
        "gtbank": "057",
        "guaranty trust bank": "057",
        "gt bank": "057",
        "access bank": "044",
        "access": "044",
        "first bank": "011",
        "firstbank": "011",
        "uba": "033",
        "united bank for africa": "033",
        "zenith": "057",
        "zenith bank": "057",
        "fidelity": "070",
        "fidelity bank": "070",
        "ecobank": "050",
        "union bank": "032",
        "sterling": "232",
        "stanbic": "039",
        "wema": "035",
        "polaris": "076",
        "keystone": "082",
        "heritage": "030",
        "unity": "215",
        "jaiz": "301",
        "opay": "999991",
        "palmpay": "999992",
        "kuda": "999993",
    }

    code = aliases.get(bank_name_lower)
    if code:
        return code

    # Try partial match
    for alias, bank_code in aliases.items():
        if bank_name_lower in alias or alias in bank_name_lower:
            return bank_code

    raise ValueError(f"Unknown bank: {bank_name}. Supported: {list(NIGERIAN_BANKS.values())}")


def generate_merchant_token(merchant: Merchant) -> str:
    """Generate a 7-day JWT for immediate dashboard access."""
    return jwt.encode(
        {
            "merchant_id": merchant.id,
            "bizzy_number": merchant.bizzy_number,
            "exp": datetime.utcnow() + timedelta(days=7)
        },
        SECRET_KEY,
        algorithm="HS256"
    )


# =============================================================================
# ONBOARDING ENDPOINT
# =============================================================================

@router.post("/onboard", response_model=MerchantOnboardResponse, status_code=status.HTTP_201_CREATED)
async def onboard_merchant(
    payload: MerchantOnboardRequest,
    db: Session = Depends(get_db)
):
    """
    Onboard a new merchant with Paystack subaccount creation.
    This enables instant settlement on every sale.
    """

    # Check for duplicate phone numbers (bizzy or owner personal)
    existing = db.query(Merchant).filter(
        (Merchant.bizzy_number == payload.bizzy_number) |
        (Merchant.owner_personal_number == payload.owner_personal_number)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A merchant with this phone number already exists. Please log in instead."
        )

    # Resolve bank code
    try:
        bank_code = resolve_bank_code(payload.settlement_bank_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Create merchant record first (without Paystack codes)
    merchant = Merchant(
        business_name=payload.business_name,
        bizzy_number=payload.bizzy_number,
        owner_personal_number=payload.owner_personal_number,
        preferred_language=payload.preferred_language,
        payment_details=payload.payment_details,
        settlement_bank_code=bank_code,
        settlement_account_number=payload.settlement_account_number,
        platform_fee_percent=3.0,  # Fixed at 3%
        is_active=True
    )
    db.add(merchant)
    db.flush()  # Get merchant.id without full commit

    logger.info(f"Merchant {merchant.id} created: {payload.business_name}")

    # Create Paystack subaccount
    try:
        subaccount_data = create_merchant_subaccount(
            business_name=payload.business_name,
            settlement_bank_code=bank_code,
            account_number=payload.settlement_account_number,
            email=f"merchant{merchant.id}@bizzy.app",
            percentage_charge=3.0  # Merchant bears this as platform fee
        )

        merchant.paystack_subaccount_code = subaccount_data["subaccount_code"]
        logger.info(f"Paystack subaccount created: {subaccount_data['subaccount_code']}")

    except Exception as e:
        logger.error(f"Paystack subaccount creation failed: {str(e)}")
        db.commit()  # Persist merchant so they can retry later
        return MerchantOnboardResponse(
            id=merchant.id,
            business_name=merchant.business_name,
            bizzy_number=merchant.bizzy_number,
            paystack_subaccount_code=None,
            transfer_recipient_code=None,
            status="created_paystack_failed",
            message="Merchant created but Paystack setup failed. Please retry from dashboard.",
            access_token=generate_merchant_token(merchant)
        )

    # Create transfer recipient for instant settlement
    try:
        recipient_code = create_transfer_recipient(
            name=payload.business_name,
            account_number=payload.settlement_account_number,
            bank_code=bank_code
        )

        merchant.transfer_recipient_code = recipient_code
        logger.info(f"Transfer recipient created: {recipient_code}")

    except Exception as e:
        logger.error(f"Transfer recipient creation failed: {str(e)}")
        db.commit()  # Save subaccount even if recipient fails
        return MerchantOnboardResponse(
            id=merchant.id,
            business_name=merchant.business_name,
            bizzy_number=merchant.bizzy_number,
            paystack_subaccount_code=merchant.paystack_subaccount_code,
            transfer_recipient_code=None,
            status="partial",
            message="Subaccount created but instant transfer setup failed. Please retry from dashboard.",
            access_token=generate_merchant_token(merchant)
        )

    # Full success
    db.commit()
    db.refresh(merchant)

    return MerchantOnboardResponse(
        id=merchant.id,
        business_name=merchant.business_name,
        bizzy_number=merchant.bizzy_number,
        paystack_subaccount_code=merchant.paystack_subaccount_code,
        transfer_recipient_code=merchant.transfer_recipient_code,
        status="active",
        message="Merchant onboarded successfully! Instant settlement enabled.",
        access_token=generate_merchant_token(merchant)
    )


@router.post("/retry-paystack/{merchant_id}")
async def retry_paystack_setup(
    merchant_id: int,
    db: Session = Depends(get_db)
):
    """
    Retry Paystack subaccount/transfer recipient creation for existing merchant.
    """
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    if not merchant.settlement_bank_code or not merchant.settlement_account_number:
        raise HTTPException(status_code=400, detail="Merchant missing bank details")

    results = {"subaccount": None, "recipient": None}

    # Retry subaccount if missing
    if not merchant.paystack_subaccount_code:
        try:
            subaccount_data = create_merchant_subaccount(
                business_name=merchant.business_name,
                settlement_bank_code=merchant.settlement_bank_code,
                account_number=merchant.settlement_account_number,
                email=f"merchant{merchant.id}@bizzy.app",
                percentage_charge=float(merchant.platform_fee_percent or 3.0)
            )
            merchant.paystack_subaccount_code = subaccount_data["subaccount_code"]
            results["subaccount"] = "created"
        except Exception as e:
            results["subaccount"] = f"failed: {str(e)}"

    # Retry transfer recipient if missing
    if not merchant.transfer_recipient_code:
        try:
            recipient_code = create_transfer_recipient(
                name=merchant.business_name,
                account_number=merchant.settlement_account_number,
                bank_code=merchant.settlement_bank_code
            )
            merchant.transfer_recipient_code = recipient_code
            results["recipient"] = "created"
        except Exception as e:
            results["recipient"] = f"failed: {str(e)}"

    db.commit()

    return {
        "merchant_id": merchant_id,
        "paystack_subaccount_code": merchant.paystack_subaccount_code,
        "transfer_recipient_code": merchant.transfer_recipient_code,
        "results": results
    }