from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class WhatsAppProfile(BaseModel):
    name: Optional[str] = None

class WhatsAppContact(BaseModel):
    wa_id: str
    profile: Optional[WhatsAppProfile] = None

class TextContent(BaseModel):
    body: str

class AudioContent(BaseModel):
    id: str
    mime_type: str

class WhatsAppMessage(BaseModel):
    id: str
    from_field: str = Field(..., alias="from")  # Maps Meta's 'from' to a valid Python variable [cite: 99]
    timestamp: str
    type: str                                    # text, audio, button, interactive 
    text: Optional[TextContent] = None
    audio: Optional[AudioContent] = None

class Metadata(BaseModel):
    display_phone_number: str                    # The Bizzy line number hit by the customer [cite: 99]
    phone_number_id: str

class ValueObject(BaseModel):
    messaging_product: str = "whatsapp"
    metadata: Metadata
    contacts: Optional[List[WhatsAppContact]] = None
    messages: Optional[List[WhatsAppMessage]] = None

class ChangeObject(BaseModel):
    value: ValueObject
    field: str

class EntryObject(BaseModel):
    id: str
    changes: List[ChangeObject]

class WhatsAppWebhookPayload(BaseModel):
    """
    The top-level schema validating incoming Meta WhatsApp Cloud API webhooks[cite: 98].
    """
    object: str = "whatsapp_business_account"
    entry: List[EntryObject]