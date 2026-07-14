import os
import httpx
import asyncio
from typing import Optional

# Twilio Environment variables (make sure these are set in your terminal with $env:)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "your_auth_token_here")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")  # Twilio Sandbox number

async def send_twilio_whatsapp_message(to_number: str, body_text: str) -> Optional[dict]:
    """
    Dispatch an outbound WhatsApp message via Twilio.
    """
    formatted_to = to_number if to_number.startswith("whatsapp:") else f"whatsapp:{to_number}"
    formatted_from = TWILIO_WHATSAPP_FROM if TWILIO_WHATSAPP_FROM.startswith("whatsapp:") else f"whatsapp:{TWILIO_WHATSAPP_FROM}"

    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
    data = {
        "From": formatted_from,
        "To": formatted_to,
        "Body": body_text,
    }

    print(f"📡 Sending WhatsApp message to {formatted_to}...")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                url,
                data=data,
                auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                timeout=10.0,
            )
            if response.status_code in (200, 201):
                payload = response.json()
                print(f"✅ Success! Message SID: {payload.get('sid')}")
                return payload
            else:
                print(f"❌ Twilio API Error {response.status_code}: {response.text}")
                return None
        except httpx.HTTPError as exc:
            print(f"❌ Network error: {exc}")
            return None

# Quick test runner
if __name__ == "__main__":
    # Replace with your sandbox-joined WhatsApp number
    customer_number = os.getenv("CUSTOMER_WHATSAPP_NUMBER", "whatsapp:+2349128793093")
    asyncio.run(send_twilio_whatsapp_message(customer_number, "Hello from Twilio + httpx!"))
