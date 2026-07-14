from fastapi import FastAPI
from app.api.v1.webhooks import router as webhook_router

# 1. Initialize the FastAPI core instance (Uvicorn looks specifically for this name 'app')
app = FastAPI(
    title="Bizzy AI Engine",
    description="Multi-tenant AI-powered WhatsApp business assistant for Nigerian SMEs",
    version="1.0.0"
)

@app.get("/")
def read_root():
    """
    Basic health check endpoint to confirm the server is live.
    """
    return {"status": "healthy", "service": "Bizzy Central Engine"}

# 2. Mount your verified webhooks router under the v1 API prefix
app.include_router(webhook_router, prefix="/api/v1", tags=["Webhooks"])
# Note: This changes the live webhook path to: /api/v1/webhook