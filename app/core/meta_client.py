import os
import requests
import logging

logger = logging.getLogger(__name__)

PHONE_NUMBER_ID = os.getenv("META_PHONE_NUMBER_ID", "")
ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "")
GRAPH_API_URL = f"https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages"

def send_whatsapp_message(to_number: str, body_text: str):
    """Send WhatsApp message via Meta Cloud API."""
    # Strip whatsapp: prefix if present
    clean_number = to_number.replace("whatsapp:", "").replace("+", "").replace(" ", "")
    
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
        response = requests.post(GRAPH_API_URL, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        logger.info(f"✅ Meta message sent to {clean_number}")
        return response.json()
    except Exception as e:
        logger.error(f"❌ Meta send failed: {e}")
        raise

def send_whatsapp_template(to_number: str, template_name: str, language_code: str = "en"):
    """Send pre-approved template (for alerts outside 24h window)."""
    clean_number = to_number.replace("whatsapp:", "").replace("+", "").replace(" ", "")
    
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
        response = requests.post(GRAPH_API_URL, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"❌ Meta template send failed: {e}")
        raise