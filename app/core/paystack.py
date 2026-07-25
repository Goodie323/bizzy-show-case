import os
import requests
import hmac
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from decimal import Decimal

logger = logging.getLogger(__name__)

PAYSTACK_SECRET = os.getenv("PAYSTACK_SECRET_KEY")
PAYSTACK_BASE_URL = "https://api.paystack.co"

HEADERS = {
    "Authorization": f"Bearer {PAYSTACK_SECRET}",
    "Content-Type": "application/json"
}

# Constants
PLATFORM_FEE_PERCENT = Decimal("3.0")  # Bizzy takes 3%
PAYSTACK_FEE_PERCENT = Decimal("1.5")
PAYSTACK_FEE_FLAT = Decimal("100")
MINIMUM_TRANSACTION = Decimal("1000.00")
VIRTUAL_ACCOUNT_EXPIRY_MINUTES = 30


class PaystackError(Exception):
    pass


def _request(method: str, endpoint: str, payload: dict = None) -> dict:
    url = f"{PAYSTACK_BASE_URL}{endpoint}"
    try:
        if method == "GET":
            resp = requests.get(url, headers=HEADERS, timeout=30)
        elif method == "POST":
            resp = requests.post(url, json=payload, headers=HEADERS, timeout=30)
        else:
            raise PaystackError(f"Unsupported method: {method}")
        
        resp.raise_for_status()
        data = resp.json()
        if not data.get("status"):
            raise PaystackError(data.get("message", "Paystack API error"))
        return data["data"]
    except requests.RequestException as e:
        logger.error(f"Paystack API error: {str(e)}")
        raise PaystackError(str(e))


# =============================================================================
# SUBACCOUNTS (One per merchant)
# =============================================================================

def create_merchant_subaccount(
    business_name: str,
    settlement_bank_code: str,
    account_number: str,
    email: str,
    percentage_charge: float = 0.0
) -> Dict[str, Any]:
    """
    Create a Paystack subaccount for a merchant.
    Call once during merchant onboarding.
    """
    payload = {
        "business_name": business_name,
        "settlement_bank": settlement_bank_code,
        "account_number": account_number,
        "percentage_charge": percentage_charge,
        "primary_contact_email": email,
        "primary_contact_name": business_name
    }
    return _request("POST", "/subaccount", payload)


# =============================================================================
# VIRTUAL ACCOUNTS (One per transaction)
# =============================================================================

def initialize_transaction(
    email: str,
    amount_kobo: int,
    reference: str,
    subaccount_code: str,
    channels: List[str] = None
) -> Dict[str, Any]:
    """
    Initialize a Paystack transaction with bank transfer channel.
    Returns virtual account details for customer to transfer to.
    """
    payload = {
        "email": email,
        "amount": amount_kobo,
        "reference": reference,
        "subaccount": subaccount_code,
        "bearer": "subaccount",  # Merchant bears Paystack fee
        "channels": channels or ["bank_transfer"],
        "metadata": {
            "reference": reference,
            "cancel_action": "https://bizzy.app/payment/cancelled"
        }
    }
    return _request("POST", "/transaction/initialize", payload)


def verify_transaction(reference: str) -> Dict[str, Any]:
    """Verify a transaction by reference."""
    return _request("GET", f"/transaction/verify/{reference}")


# =============================================================================
# TRANSFERS (Instant settlement to merchant)
# =============================================================================

def get_balance() -> Decimal:
    """Check Paystack balance (your float)."""
    data = _request("GET", "/balance")
    # Returns balance in kobo
    return Decimal(str(data[0]["balance"])) / 100 if data else Decimal("0")

# Add to app/core/paystack.py

def create_transfer_recipient(
    name: str,
    account_number: str,
    bank_code: str
) -> str:
    """Create a transfer recipient for instant settlement. Returns recipient_code."""
    payload = {
        "type": "nuban",
        "name": name,
        "account_number": account_number,
        "bank_code": bank_code,
        "currency": "NGN"
    }
    data = _request("POST", "/transferrecipient", payload)
    return data["recipient_code"]


def initiate_transfer(
    amount_kobo: int,
    recipient_code: str,
    reference: str,
    reason: str = "Bizzy instant settlement"
) -> Dict[str, Any]:
    """
    Initiate instant transfer to merchant's bank.
    Deducts from your Paystack balance (float).
    """
    payload = {
        "source": "balance",
        "amount": amount_kobo,
        "recipient": recipient_code,
        "reference": reference,
        "reason": reason
    }
    return _request("POST", "/transfer", payload)


# =============================================================================
# WEBHOOK SECURITY
# =============================================================================

def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """Verify Paystack webhook signature."""
    expected = hmac.new(
        PAYSTACK_SECRET.encode(),
        payload,
        hashlib.sha512
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


# =============================================================================
# FEE CALCULATIONS
# =============================================================================

def calculate_settlement(amount: Decimal) -> Dict[str, Decimal]:
    """
    Calculate fee breakdown for a transaction.
    Returns: gross, paystack_fee, platform_fee, merchant_gets
    """
    paystack_fee = (amount * PAYSTACK_FEE_PERCENT / 100) + PAYSTACK_FEE_FLAT
    platform_fee = amount * PLATFORM_FEE_PERCENT / 100
    merchant_gets = amount - paystack_fee - platform_fee
    
    return {
        "gross": amount,
        "paystack_fee": paystack_fee,
        "platform_fee": platform_fee,
        "merchant_gets": merchant_gets
    }


def is_above_floor(amount: Decimal) -> bool:
    """Check if transaction meets minimum floor."""
    return amount >= MINIMUM_TRANSACTION