import os
import json
import logging
from typing import Dict, Any, List, Literal
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Initialize the Gemini Client (ensure GEMINI_API_KEY is set in your environment)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


# =============================================================================
# 1. PYDANTIC SCHEMAS — Enforce Structured Outputs
# =============================================================================

class OrderItem(BaseModel):
    product_name: str = Field(description="The name of the product matched against the merchant's catalog.")
    quantity: int = Field(description="The exact count or quantity ordered by the customer.")
    unit_price: float = Field(default=0.0, description="The agreed unit price per item in Naira (NGN).")
    total_price: float = Field(default=0.0, description="The calculated total for this line item (quantity * unit_price).")
    variant: str = Field(default="none", description="The size, color, volume or design variation if specified (e.g., 'size 42', '50ml').")


class StructuredOrderExtraction(BaseModel):
    intent_action: Literal[
        "PRODUCT_INQUIRY", 
        "ORDER_PLACEMENT", 
        "NEGOTIATION", 
        "PAYMENT_REQUEST", 
        "DELIVERY_REQUEST", 
        "ORDER_CONFIRMATION", 
        "UNKNOWN"
    ] = Field(
        description="The derived action type. PRODUCT_INQUIRY=asking about items, ORDER_PLACEMENT=wants to buy, NEGOTIATION=haggling, PAYMENT_REQUEST=deal struck/ready to pay with total bill, DELIVERY_REQUEST=customer says they paid, ORDER_CONFIRMATION=customer gives address."
    )
    is_haggling: bool = Field(
        description="True if the customer is asking for a discount, saying 'abeg reduction', 'last price', or making a counter-offer."
    )
    detected_language: str = Field(
        description="Language or dialect used by the customer. E.g., 'English', 'Nigerian Pidgin', 'Yoruba-English Hybrid'."
    )
    parsed_items: List[OrderItem] = Field(
        default=[],
        description="List of items extracted from the customer message matching the catalog."
    )
    subtotal_amount: float = Field(
        default=0.0, 
        description="Sum of all line item totals before additional discounts."
    )
    total_amount: float = Field(
        default=0.0, 
        description="Final grand total amount in NGN to be paid by the customer."
    )
    offered_price: float = Field(
        default=0.0, 
        description="Specific cash offer numeric value made by the customer during bargaining. 0.0 if not haggling."
    )
    delivery_address: str = Field(
        default="", 
        description="Extracted drop-off physical delivery location if provided by customer."
    )
    assistant_reply: str = Field(
        description="The exact, highly localized, persuasive WhatsApp response string generated for the customer."
    )


# =============================================================================
# 2. SYSTEM INSTRUCTION — Enforce Strict Sales Flow & Localized Persona
# =============================================================================

SYSTEM_INSTRUCTION = """
You are Bizzy, an ultra-smart, localized AI sales assistant managing automated customer interactions for Nigerian WhatsApp SMEs.
Your goal is to maximize sales conversions while strictly protecting the merchant's profit margins and accurately tracking customer bills.

STRICT SALES FLOW STATE MACHINE — NEVER SKIP STEPS:
1. CUSTOMER ASKS ABOUT PRODUCT -> Set intent_action to "PRODUCT_INQUIRY". Reply with retail price, availability, and description.
2. CUSTOMER WANTS TO BUY / ADDS ITEMS -> Set intent_action to "ORDER_PLACEMENT".
3. CUSTOMER HAGGLES / ASKS DISCOUNT -> Set intent_action to "NEGOTIATION". Apply bargaining rules.
4. DEAL STRUCK / READY TO PAY -> Set intent_action to "PAYMENT_REQUEST".
   - You MUST compute line item prices: total_price = quantity * unit_price.
   - You MUST sum line totals to set subtotal_amount and total_amount.
   - You MUST generate an itemized cart summary in assistant_reply along with payment account details.
5. CUSTOMER SAYS "I HAVE PAID" / SENDS PROOF -> Set intent_action to "DELIVERY_REQUEST". Ask for their full delivery address.
6. CUSTOMER PROVIDES ADDRESS -> Set intent_action to "ORDER_CONFIRMATION". Confirm full order details, address, and total paid.

CART & BILLING COMPUTATION PROTOCOL:
- When building order items: set unit_price to retail price (or negotiated price if discount agreed).
- Calculate total_price = quantity * unit_price.
- Calculate subtotal_amount = sum of all total_price values.
- Calculate total_amount = final grand bill sum.
- Format the order recap explicitly in assistant_reply like:
  🛒 *Your Order Cart:*
  • 2x White Tee @ ₦5,000 = ₦10,000
  • 1x Sneakers (Size 43) @ ₦25,000 = ₦25,000
  💰 *Total Bill:* ₦35,000

BARGAINING & NEGOTIATION PROTOCOL:
If the customer asks for a discount ("abeg slash am", "do normal level", "last price?", "customer price"):
- Set is_haggling to true and intent_action to "NEGOTIATION".
- HAGGLE STAGE 1: Offer 50% split between retail and floor price. Formula: Counter = Retail - ((Retail - Floor) / 2).
- HAGGLE STAGE 2: Drop to floor price if customer pushes again. Frame as "last card".
- BEYOND FLOOR: Firmly decline lower offers. Hold the floor price.
- Set unit_price in parsed_items to reflect the negotiated rate.

PAYMENT PROTOCOL:
When intent_action is "PAYMENT_REQUEST":
- Display the itemized Cart Summary and total_amount.
- Provide payment details (Bank name, Account Number, Account Name).
- Direct customer to send proof of transfer.

LINGUISTIC & TONE RULES:
- Blend professional English with vibrant Nigerian Pidgin ("Odogwu", "Boss", "Abeg", "Sharp", "No wahala").
- Energetic, polite, and persuasive.
"""


# =============================================================================
# 3. PROCESSING FUNCTION
# =============================================================================

def process_customer_message(
    message_text: str, 
    merchant_context: Dict[str, Any], 
    chat_history: List[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Analyzes an incoming customer WhatsApp message against the merchant's catalog context
    and chat history, generating a structured JSON payload response.
    """
    catalog_string = json.dumps(merchant_context.get("catalog", []), indent=2)
    business_name = merchant_context.get("business_name", "the merchant")
    payment_details = merchant_context.get("payment_details", "")
    
    # Format prior chat history if provided
    history_str = ""
    if chat_history:
        formatted_history = []
        for msg in chat_history:
            role = msg.get("role", "user").capitalize()
            content = msg.get("content", "")
            formatted_history.append(f"{role}: {content}")
        history_str = "\n".join(formatted_history)

    user_prompt = f"""
    Current Business Context:
    - Business Name: {business_name}
    - Available Catalog/Products: {catalog_string}
    - Merchant Payment Details: {payment_details}
    
    Recent Chat History Context:
    {history_str if history_str else "No prior history available."}
    
    Incoming Customer Message: "{message_text}"
    
    Analyze the customer's intent, detect haggling, match catalog items, compute item line prices and total_amount, 
    and provide your localized conversational response in assistant_reply.
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=StructuredOrderExtraction,
                temperature=0.2,
            ),
        )
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"❌ GEMINI API ERROR: {str(e)}")
        return StructuredOrderExtraction(
            intent_action="UNKNOWN",
            is_haggling=False,
            detected_language="English",
            parsed_items=[],
            subtotal_amount=0.0,
            total_amount=0.0,
            offered_price=0.0,
            delivery_address="",
            assistant_reply="🤖 Network issue dey, abeg try send your message again small time."
        ).model_dump()