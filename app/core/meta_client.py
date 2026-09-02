import os
import httpx
import logging

logger = logging.getLogger(__name__)

PHONE_NUMBER_ID = os.getenv("META_PHONE_NUMBER_ID", "")
ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "")
API_VERSION = os.getenv("META_API_VERSION", "v20.0")

async def send_whatsapp_message(to_number: str, body_text: str):
    """Send WhatsApp message via Meta Cloud API."""
    clean_number = to_number.replace("whatsapp:", "").replace("+", "").replace(" ", "")
    
    url = f"https://graph.facebook.com/{API_VERSION}/{PHONE_NUMBER_ID}/messages"
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_number,
        "type": "text",
        "text": {"body": body_text}
    }
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            logger.info(f"✅ Meta message sent to {clean_number}")
            return response.json()
    except Exception as e:
        logger.error(f"❌ Meta send failed: {e}")
        raise

async def send_whatsapp_template(to_number: str, template_name: str, language_code: str = "en"):
    """Send pre-approved template."""
    clean_number = to_number.replace("whatsapp:", "").replace("+", "").replace(" ", "")
    
    url = f"https://graph.facebook.com/{API_VERSION}/{PHONE_NUMBER_ID}/messages"
    
    payload = {
        "messaging_product": "whatsapp",
        "to": clean_number,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language_code}
        }
    }
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"❌ Meta template send failed: {e}")
        raise