from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.webhooks import router as webhook_router
from app.api.v1.endpoints import router as api_router
from app.api.v1.analytics import router as analytics_router

# 1. Initialize the FastAPI core instance
app = FastAPI(
    title="Bizzy AI Engine",
    description="Multi-tenant AI-powered WhatsApp business assistant for Nigerian SMEs",
    version="1.0.0"
)

# 2. Enable CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:3000",
    "https://bizzy-livid.vercel.app",
],

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "healthy", "service": "Bizzy Central Engine"}

# 3. Mount all routers
app.include_router(webhook_router, prefix="/api/v1", tags=["Webhooks"])
app.include_router(api_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")