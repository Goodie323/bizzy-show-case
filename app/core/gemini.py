import os
import json
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from typing import Literal
from google import genai
from google.genai import types

# Initialize the Gemini Client (ensure GEMINI_API_KEY is set in your environment)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# 1. Pydantic Schemas to Enforce Structured Outputs
class OrderItem(BaseModel):
    product_name: str = Field(description="The name of the product matched against the merchant's catalog.")
    quantity: int = Field(description="The exact count or quantity ordered by the customer.")
    variant: str = Field("none", description="The size, color, volume or design variation if specified (e.g., 'size 42', '50ml').")

class StructuredOrderExtraction(BaseModel):
    intent_action: Literal["PRODUCT_INQUIRY", "ORDER_PLACEMENT", "NEGOTIATION", "PAYMENT_REQUEST", "DELIVERY_REQUEST", "ORDER_CONFIRMATION", "UNKNOWN"] = Field(
        description="The derived action type. PRODUCT_INQUIRY=asking about items, ORDER_PLACEMENT=wants to buy, NEGOTIATION=haggling, PAYMENT_REQUEST=deal struck/ready to pay, DELIVERY_REQUEST=customer says they paid, ORDER_CONFIRMATION=customer gives address."
    )
    is_haggling: bool = Field(
        description="True if the customer is asking for a discount, saying 'abeg reduction', 'last price', or trying to price down the item."
    )
    detected_language: str = Field(description="The language used by the customer. E.g., 'English', 'Pidgin'.")
    parsed_items: List[OrderItem] = Field(default=[], description="List of items extracted from the customer's text or request details.")
    offered_price: float = Field(default=0.0, description="The price the customer offered during negotiation. Only relevant for NEGOTIATION intent.")
    delivery_address: str = Field(default="", description="The delivery address provided by the customer. Only relevant for ORDER_CONFIRMATION intent.")
    assistant_reply: str = Field(description="The final message text written in the correct detected tone/language that will be delivered to the customer's WhatsApp.")

# 2. System Instruction Core Persona (Enforcing Bizzy's Brand Tone)
SYSTEM_INSTRUCTION = """
You are Bizzy, an ultra-smart, localized AI sales assistant managing automated customer interactions for Nigerian WhatsApp SMEs.
Your goal is to maximize sales conversions while protecting the merchant's profit margins.

STRICT SALES FLOW — NEVER SKIP STEPS:
1. CUSTOMER ASKS ABOUT PRODUCT → Set intent_action to "PRODUCT_INQUIRY". Reply with price, availability, options.
2. CUSTOMER WANTS TO BUY → Set intent_action to "ORDER_PLACEMENT". Negotiate if needed.
3. CUSTOMER AGREES TO PRICE / DEAL STRUCK → Set intent_action to "PAYMENT_REQUEST". Include exact payment details (bank name, account number, account name) and amount to pay. Tell customer to send proof of payment.
4. CUSTOMER SAYS "I HAVE PAID" / SENDS PROOF → Set intent_action to "DELIVERY_REQUEST". Ask for full delivery address. Do NOT confirm order yet.
5. CUSTOMER GIVES ADDRESS → Set intent_action to "ORDER_CONFIRMATION". Confirm order with summary, thank customer.
NEVER confirm an order before receiving payment and delivery address.

INTENT ACTION DEFINITIONS:
- "PRODUCT_INQUIRY": Customer is asking about products, prices, stock, availability.
- "ORDER_PLACEMENT": Customer explicitly wants to buy/order items.
- "NEGOTIATION": Customer is haggling, asking for discount, "last price", "abeg reduce".
- "PAYMENT_REQUEST": Deal is struck or customer agreed to buy. You are asking them to pay.
- "DELIVERY_REQUEST": Customer said they have paid. You need their address.
- "ORDER_CONFIRMATION": Customer provided delivery address. Order is complete.
- "UNKNOWN": Cannot determine intent from message.

BARGAINING & NEGOTIATION PROTOCOL:
If the customer asks for a discount ("abeg slash am", "do normal level", "last price?", "customer price"):
- Set is_haggling to true and intent_action to "NEGOTIATION".
- HAGGLE STAGE 1: Offer 50% split between retail and floor. Formula: Counter = Retail - ((Retail - Floor) / 2)
- HAGGLE STAGE 2: Drop to floor price if they push again. Frame as "last card".
- BEYOND FLOOR: Firmly decline. Hold the line.
- Set offered_price to the price the customer offered.

PAYMENT PROTOCOL:
When deal is struck or customer agrees to buy:
- Set intent_action to "PAYMENT_REQUEST"
- Include exact payment details: bank name, account number, account name
- Include exact amount to pay
- Tell customer to send proof of payment

DELIVERY PROTOCOL:
When customer says they have paid:
- Set intent_action to "DELIVERY_REQUEST"
- Ask for full delivery address
- Do NOT confirm order yet

CONFIRMATION PROTOCOL:
When customer provides address:
- Set intent_action to "ORDER_CONFIRMATION"
- Extract delivery_address from the message
- Confirm order with summary
- Thank customer

CONTEXT HANDLING RULES:
1. You will be provided with a Merchant Inventory Context containing: Product Name, Retail Price, and a hidden Min Floor Price.
2. NEVER explicitly mention or reveal the phrase "Min Floor Price" or let the customer know a hard lower limit exists.
3. ALWAYS include merchant payment details when asking for payment.

LINGUISTIC & TONE:
- Blend casual business English and Nigerian Pidgin ("Odogwu", "Abeg", "Boss", "Sharp")
- Keep energy high, trustworthy, entrepreneurial
- Never sound robotic or overly westernized; you are an invisible backbone of African commerce.
- Do not mention or expose the internal JSON structure to the customer.
"""

# 3. Response Schema for Gemini
response_schema = {
    "type": "OBJECT",
    "properties": {
        "intent_action": {
            "type": "STRING", 
            "enum": ["PRODUCT_INQUIRY", "ORDER_PLACEMENT", "NEGOTIATION", "PAYMENT_REQUEST", "DELIVERY_REQUEST", "ORDER_CONFIRMATION", "UNKNOWN"]
        },
        "is_haggling": {
            "type": "BOOLEAN",
            "description": "True if the customer is asking for a discount, saying 'abeg reduction', 'last price', or trying to price down the item."
        },
        "detected_language": {
            "type": "STRING",
            "description": "The language used by the customer. E.g., 'English', 'Pidgin'."
        },
        "parsed_items": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "product_name": {"type": "STRING"},
                    "quantity": {"type": "INTEGER"},
                    "variant": {"type": "STRING"}
                }
            }
        },
        "offered_price": {
            "type": "NUMBER",
            "description": "The price the customer offered during negotiation. Only relevant for NEGOTIATION intent."
        },
        "delivery_address": {
            "type": "STRING",
            "description": "The delivery address provided by the customer. Only relevant for ORDER_CONFIRMATION intent."
        },
        "assistant_reply": {
            "type": "STRING",
            "description": "The natural language response generated for the customer in the matching tone."
        }
    },
    "required": ["intent_action", "is_haggling", "parsed_items", "assistant_reply"]
}

# 4. Processing Function
def process_customer_message(
    message_text: str, 
    merchant_context: Dict[str, Any], 
    chat_history: List[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Executes the intelligence pipeline using the Gemini API.
    Injects specific merchant catalog context, enforces structured data extraction, 
    detects haggling, and handles conversational responses in a single call.
    """
    catalog_string = json.dumps(merchant_context.get("catalog", []), indent=2)
    business_name = merchant_context.get("business_name", "the merchant")
    payment_details = merchant_context.get("payment_details", "")
    
    user_prompt = f"""
    Current Business Context:
    - Business Name: {business_name}
    - Available Catalog/Products: {catalog_string}
    - Merchant Payment Details: {payment_details}
    
    Incoming Customer Message: "{message_text}"
    
    Analyze the customer's intent, detect if they are haggling, decide the language choice, 
    match items against the catalog rules, and provide your helpful conversational response.
    """

    try:
        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=response_schema,
                temperature=0.2,
            ),
        )
        return json.loads(response.text)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"❌ GEMINI API ERROR: {str(e)}")
        return {
            "intent_action": "UNKNOWN",
            "is_haggling": False,
            "detected_language": "English",
            "parsed_items": [],
            "offered_price": 0.0,
            "delivery_address": "",
            "assistant_reply": f"🤖 Oops! Something went wrong. Please try again or contact support."
        }
