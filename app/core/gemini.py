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
    intent_action: Literal["PRODUCT_INQUIRY", "ORDER_PLACEMENT", "NEGOTIATION", "UNKNOWN"] = Field(
        description="The derived action type."
    )
    is_haggling: bool = Field(
        description="True if the customer is asking for a discount, saying 'abeg reduction', 'last price', or trying to price down the item."
    )
    detected_language: str = Field(description="The language used by the customer. E.g., 'English', 'Pidgin'.")
    parsed_items: List[OrderItem] = Field(default=[], description="List of items extracted from the customer's text or request details.")
    assistant_reply: str = Field(description="The final message text written in the correct detected tone/language that will be delivered to the customer's WhatsApp.")

# 2. System Instruction Core Persona (Enforcing Bizzy's Brand Tone)
SYSTEM_INSTRUCTION = """
You are Bizzy, an ultra-capable, trustworthy, and helpful AI assistant running operations for a Nigerian SME. 
Your job is to interact with customers over WhatsApp politely, professionally, and warmly.

Tone Guidelines:
- Speak naturally to the customer based on how they approach you. 
- You must seamlessly understand and communicate in both standard English and Nigerian Pidgin (e.g., use natural phrasing like "How far?", "I get you", "Abeg", "No wahala" when appropriate, but keep it business-appropriate).
- Never sound robotic or overly westernized; you are an invisible backbone of African commerce.

Operational Rules:
- If a customer wants to buy, check stock, or ask about item details, extract their exact parameters.
- Detect if the customer is haggling or asking for a discount.
- Do not mention or expose the internal JSON structure to the customer.
"""

# 3. Response Schema for Gemini
response_schema = {
    "type": "OBJECT",
    "properties": {
        "intent_action": {
            "type": "STRING", 
            "enum": ["PRODUCT_INQUIRY", "ORDER_PLACEMENT", "NEGOTIATION", "UNKNOWN"]
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
            model='gemini-2.5-flash',
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
            "assistant_reply": f"🤖 Oops! Something went wrong. Please try again or contact support."
        }