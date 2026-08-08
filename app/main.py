from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.webhooks import router as webhook_router
from app.api.v1.endpoints import router as api_router
from app.api.v1.analytics import router as analytics_router
from app.core.scheduler import start_scheduler
from app.api.v1.merchants import router as merchants_router
from app.api.v1.paystack import router as paystack_router
from app.api.v1.africastalking_webhook import router as at_webhook_router  # ← ADD THIS


app = FastAPI(
    title="Bizzy AI Engine",
    description="Multi-tenant AI-powered WhatsApp business assistant for Nigerian SMEs",
    version="1.0.0"
)

# ============================================================================
# CORS — Single source of truth. Remove custom options_handler.
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:3000",
        "https://bizzy-livid.vercel.app",
        "https://bizzydigitalhub.com",          # ← NEW
        "https://www.bizzydigitalhub.com",      # ← NEW
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)

@app.get("/")
def read_root():
    return {"status": "healthy", "service": "Bizzy Central Engine"}

@app.on_event("startup")
async def startup_event():
    start_scheduler()

# Mount all routers
app.include_router(webhook_router, prefix="/api/v1", tags=["Webhooks"])
app.include_router(api_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(merchants_router, prefix="/api/v1/merchants", tags=["merchants"])
app.include_router(paystack_router, prefix="/api/v1/paystack", tags=["paystack"])
app.include_router(at_webhook_router, prefix="/api/v1/africastalking", tags=["africastalking"])  # ← ADD THIS