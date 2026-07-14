import re
from typing import Dict, Any

# 1. Broad Expression Compilations for Fast Execution
GREETINGS_PATTERN = re.compile(
    r"^(hi|hello|hey|yo|howfar|how far|good\s*(morning|afternoon|evening)|compliments|greetings|boss|aba)\b", 
    re.IGNORECASE
)

SHORT_REPLIES_PATTERN = re.compile(
    r"^(ok|okay|yes|no|yah|nao|cool|fine|noted|alright|true|false|sure|sharp|odogwu)\b", 
    re.IGNORECASE
)

# Emojis only regex match (including skin tone modifiers and common variations)
EMOJI_ONLY_PATTERN = re.compile(
    r'^[\s\u2600-\u27BF\U0001f300-\U0001f64f\U0001f680-\U0001f6ff\U0001f900-\U0001f9ff]*$'
)

def analyze_intent_and_route(message_text: str) -> Dict[str, Any]:
    """
    Cost-Control Filter. Evaluates incoming text against local heuristics.
    Returns a routing directive dict determining if the message triggers an LLM pipeline.
    """
    if not message_text:
        return {"hit_llm": False, "action": "ignore", "type": "empty_string"}
        
    cleaned_text = message_text.strip().lower()

    # Heuristic 1: If it's purely emojis, acknowledge or ignore based on config
    if EMOJI_ONLY_PATTERN.match(cleaned_text):
        return {"hit_llm": False, "action": "template_reply", "type": "emoji_acknowledgment"}

    # Heuristic 2: Match common structural greetings (English + Pidgin)
    if GREETINGS_PATTERN.match(cleaned_text) and len(cleaned_text.split()) <= 4:
        return {"hit_llm": False, "action": "template_reply", "type": "greeting"}

    # Heuristic 3: Single/Double word acknowledgement replies
    if SHORT_REPLIES_PATTERN.match(cleaned_text) and len(cleaned_text.split()) <= 2:
        return {"hit_llm": False, "action": "template_reply", "type": "acknowledgment"}

    # Heuristic 4: Direct Business Triggers (Forces immediate Gemini Pipeline bypass override)
    # Catching local slang and purchase intent indicators early
    business_triggers = [
        "how much", "price", "cost", "amount", "buy", "order", "want", "size", 
        "avail", "stock", "send account", "i look for", "you get", "how many", "deliver"
    ]
    if any(trigger in cleaned_text for trigger in business_triggers):
        return {"hit_llm": True, "action": "process_with_llm", "type": "business_intent"}

    # Fallback Case: If the message length is long, it contains structural detail 
    # that requires complex linguistic interpretation via the Intelligence Layer.
    if len(cleaned_text.split()) > 3:
        return {"hit_llm": True, "action": "process_with_llm", "type": "complex_inquiry"}

    # Default safety fallback
    return {"hit_llm": True, "action": "process_with_llm", "type": "fallback"}