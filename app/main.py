from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.webhooks import router as webhook_router
from app.api.v1.endpoints import router as api_router
from app.api.v1.analytics import router as analytics_router
from app.core.scheduler import start_scheduler
from app.api.v1.merchants import router as merchants_router


# 1. Initialize the FastAPI core instance
app = FastAPI(
    title="Bizzy AI Engine",
    description="Multi-tenant AI-powered WhatsApp business assistant for Nigerian SMEs",
    version="1.0.0"
)

# 2. Handle OPTIONS preflight requests BEFORE CORS middleware
@app.middleware("http")
async def options_handler(request: Request, call_next):
    if request.method == "OPTIONS":
        return JSONResponse(
            content={"ok": True},
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "true",
            }
        )
    return await call_next(request)

# 3. Enable CORS for your frontend
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

@app.on_event("startup")
async def startup_event():
    start_scheduler()

# 4. Mount all routers
app.include_router(webhook_router, prefix="/api/v1", tags=["Webhooks"])
app.include_router(api_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(merchants_router, prefix="/api/v1/merchants", tags=["merchants"])