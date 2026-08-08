import os
import requests
import logging
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

AT_USERNAME = os.getenv("AT_USERNAME", "sandbox")
AT_API_KEY = os.getenv("AT_API_KEY")
AT_SENDER_ID = os.getenv("AT_SENDER_ID", "")
AT_BASE_URL = os.getenv("AT_BASE_URL", "https://api.africastalking.com/version1/messaging")


class AfricasTalkingError(Exception):
    pass


class AfricasTalkingClient:
    def __init__(self):
        self.username = AT_USERNAME
        self.api_key = AT_API_KEY
        self.sender_id = AT_SENDER_ID
        self.base_url = AT_BASE_URL
        
    def _parse_at_response(self, text: str) -> dict:
        """Parse Africa's Talking XML or JSON response."""
        text = text.strip()
        if text.startswith("<?xml") or text.startswith("<AfricasTalkingResponse"):
            root = ET.fromstring(text)
            message = root.find(".//Message")
            recipient = root.find(".//Recipient")
            
            if recipient is not None:
                return {
                    "success": recipient.findtext("status") == "Success",
                    "message_id": recipient.findtext("messageId", ""),
                    "status": recipient.findtext("status", "Unknown"),
                    "cost": recipient.findtext("cost", ""),
                    "number": recipient.findtext("number", ""),
                    "statusCode": recipient.findtext("statusCode", ""),
                }
            elif message is not None:
                return {"success": True, "message": message.text}
            return {"success": True, "raw_xml": text[:500]}
        
        import json
        return json.loads(text)
        
    def send_whatsapp_message(self, to_number: str, body_text: str) -> dict:
        if not self.api_key:
            raise AfricasTalkingError("AT_API_KEY not configured")
            
        clean_number = to_number.replace("whatsapp:", "").replace(" ", "")
        
        headers = {
            "apiKey": self.api_key,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        }
        
        payload = {
            "username": self.username,
            "to": clean_number,
            "message": body_text,
        }
        
        if self.sender_id:
            payload["from"] = self.sender_id
            
        try:
            response = requests.post(
                self.base_url,
                data=payload,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            result = self._parse_at_response(response.text)
            logger.info(f"✅ AT → {clean_number}: {result.get('status', 'unknown')}")
            return result
                
        except requests.RequestException as e:
            logger.error(f"❌ AT send failed: {str(e)}")
            raise AfricasTalkingError(str(e))


africas_talking = AfricasTalkingClient()


# =============================================================================
# INCOMING WEBHOOK PARSER
# =============================================================================

def parse_at_webhook_payload(form_data: dict) -> Optional[Dict[str, Any]]:
    sender = form_data.get("from", "")
    recipient = form_data.get("to", "")
    message_text = form_data.get("text", "")
    link_id = form_data.get("linkId", "")
    msg_id = form_data.get("id", "")
    
    if not sender or not message_text:
        return None
    
    if not sender.startswith("+"):
        if sender.startswith("0"):
            sender = "+234" + sender[1:]
        else:
            sender = "+" + sender
    
    return {
        "from": sender,
        "to": recipient,
        "body": message_text,
        "link_id": link_id,
        "message_id": msg_id,
        "provider": "africastalking"
    }


async def send_at_whatsapp_message(to_number: str, body_text: str) -> dict:
    return africas_talking.send_whatsapp_message(to_number, body_text)