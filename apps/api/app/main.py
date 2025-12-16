from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .api.router import router
from .core.config import settings
from .core.rate_limit import limiter

app = FastAPI(title="Plumbing Ops Platform API", version="1.0.0")

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API versioning - all routes under /api/v1
app.include_router(router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "ok"}

# Add a root path for quick check
@app.get("/")
async def root():
    return {"message": "Plumbing Ops API"}
