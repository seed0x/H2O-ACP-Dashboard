from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.router import router
from .core.config import settings

app = FastAPI(title="Plumbing Ops Platform API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)

@app.get("/health")
async def health():
    return {"status": "ok"}

# Add a root path for quick check
@app.get("/")
async def root():
    return {"message": "Plumbing Ops API"}
