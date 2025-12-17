from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .api.router import router
from .core.config import settings
from .core.rate_limit import limiter
import asyncio
import logging
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

# Global flag to track if startup has run
_startup_complete = False

async def ensure_admin_user():
    """Create or update admin user - can be called on startup or first request"""
    try:
        from .db.session import AsyncSessionLocal
        from .models import User
        from .core.password import hash_password
        from sqlalchemy import select
        
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(User.username == "admin")
            )
            admin_user = result.scalar_one_or_none()
            
            if admin_user:
                # Update password if needed
                admin_user.hashed_password = hash_password(settings.admin_password)
                admin_user.role = "admin"
                admin_user.is_active = True
            else:
                # Create admin user
                admin_user = User(
                    username="admin",
                    email="admin@example.com",
                    hashed_password=hash_password(settings.admin_password),
                    role="admin",
                    is_active=True
                )
                db.add(admin_user)
            
            await db.commit()
            logger.info("✓ Admin user ready")
            print("✓ Admin user ready", flush=True)
            return True
    except Exception as e:
        logger.warning(f"⚠ Could not create admin user: {e}")
        print(f"⚠ Could not create admin user: {e}", flush=True)
        import traceback
        print(traceback.format_exc(), flush=True)
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown"""
    # Startup
    print("=" * 50, flush=True)
    print("Starting Plumbing Ops API - Lifespan Startup", flush=True)
    print("=" * 50, flush=True)
    
    try:
        # #region agent log
        import json
        import os
        from urllib.parse import urlparse
        log_data = {
            "sessionId": "debug-session",
            "runId": "run1",
            "hypothesisId": "A",
            "location": "main.py:67",
            "message": "Checking DATABASE_URL configuration",
            "timestamp": int(__import__('time').time() * 1000)
        }
        try:
            raw_url = os.getenv("DATABASE_URL", "NOT_SET")
            parsed = urlparse(raw_url) if raw_url != "NOT_SET" else None
            log_data["data"] = {
                "raw_url_set": raw_url != "NOT_SET",
                "raw_url_host": parsed.hostname if parsed else None,
                "raw_url_port": parsed.port if parsed else None,
                "settings_url_host": urlparse(settings.database_url).hostname if settings.database_url else None,
                "settings_url_port": urlparse(settings.database_url).port if settings.database_url else None,
                "is_default": settings.database_url == "postgresql+asyncpg://postgres:postgres@db:5432/plumbing"
            }
            with open(r"c:\Users\user1\Desktop\Misellanious\Plumbing-ops-platform\.cursor\debug.log", "a") as f:
                f.write(json.dumps(log_data) + "\n")
        except Exception as log_err:
            pass
        # #endregion
        
        # Check DATABASE_URL
        if not settings.database_url or settings.database_url == "postgresql+asyncpg://postgres:postgres@db:5432/plumbing":
            logger.error("ERROR: DATABASE_URL not set correctly!")
            print("ERROR: DATABASE_URL not set correctly!", flush=True)
        else:
            logger.info(f"Database URL configured")
            print(f"Database URL configured", flush=True)
            
            # Test database connection
            try:
                # #region agent log
                log_data = {
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "D",
                    "location": "main.py:105",
                    "message": "Before database connection attempt",
                    "timestamp": int(__import__('time').time() * 1000),
                    "data": {
                        "connection_url_host": urlparse(settings.database_url).hostname,
                        "connection_url_port": urlparse(settings.database_url).port
                    }
                }
                try:
                    with open(r"c:\Users\user1\Desktop\Misellanious\Plumbing-ops-platform\.cursor\debug.log", "a") as f:
                        f.write(json.dumps(log_data) + "\n")
                except:
                    pass
                # #endregion
                
                from .db.session import engine
                from sqlalchemy import text
                
                # #region agent log
                log_data = {
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "E",
                    "location": "main.py:129",
                    "message": "Engine created, attempting connection",
                    "timestamp": int(__import__('time').time() * 1000),
                    "data": {"engine_created": True}
                }
                try:
                    with open(r"c:\Users\user1\Desktop\Misellanious\Plumbing-ops-platform\.cursor\debug.log", "a") as f:
                        f.write(json.dumps(log_data) + "\n")
                except:
                    pass
                # #endregion
                
                async with engine.begin() as conn:
                    await conn.execute(text("SELECT 1"))
                
                # #region agent log
                log_data = {
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "ALL",
                    "location": "main.py:145",
                    "message": "Database connection successful",
                    "timestamp": int(__import__('time').time() * 1000),
                    "data": {"connection_success": True}
                }
                try:
                    with open(r"c:\Users\user1\Desktop\Misellanious\Plumbing-ops-platform\.cursor\debug.log", "a") as f:
                        f.write(json.dumps(log_data) + "\n")
                except:
                    pass
                # #endregion
                
                logger.info("✓ Database connection successful")
                print("✓ Database connection successful", flush=True)
                
                # Create admin user
                await ensure_admin_user()
            except Exception as e:
                # #region agent log
                import traceback
                log_data = {
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "B,C,D,E",
                    "location": "main.py:165",
                    "message": "Database connection failed - full error details",
                    "timestamp": int(__import__('time').time() * 1000),
                    "data": {
                        "error_type": type(e).__name__,
                        "error_message": str(e),
                        "error_args": list(e.args) if hasattr(e, 'args') else [],
                        "traceback": traceback.format_exc()
                    }
                }
                try:
                    with open(r"c:\Users\user1\Desktop\Misellanious\Plumbing-ops-platform\.cursor\debug.log", "a") as f:
                        f.write(json.dumps(log_data) + "\n")
                except:
                    pass
                # #endregion
                
                logger.error(f"✗ Database connection failed: {e}")
                print(f"✗ Database connection failed: {e}", flush=True)
        
        logger.info("Startup complete - API ready!")
        print("Startup complete - API ready!", flush=True)
        global _startup_complete
        _startup_complete = True
    except Exception as e:
        logger.error(f"Startup error: {e}")
        print(f"Startup error: {e}", flush=True)
        import traceback
        print(traceback.format_exc(), flush=True)
    
    yield
    
    # Shutdown (if needed)
    logger.info("Shutting down...")

app = FastAPI(title="Plumbing Ops Platform API", version="1.0.0", lifespan=lifespan)

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
    """Health check endpoint"""
    try:
        from .db.session import engine
        from sqlalchemy import text
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database": "connected",
            "database_url_set": bool(settings.database_url and settings.database_url != "postgresql+asyncpg://postgres:postgres@db:5432/plumbing")
        }
    except Exception as e:
        return {
            "status": "error",
            "database": "disconnected",
            "error": str(e),
            "database_url_set": bool(settings.database_url and settings.database_url != "postgresql+asyncpg://postgres:postgres@db:5432/plumbing")
        }

@app.get("/debug/startup")
async def debug_startup():
    """Debug endpoint to check startup status"""
    try:
        from .db.session import AsyncSessionLocal
        from .models import User
        from sqlalchemy import select
        
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.username == "admin"))
            admin_user = result.scalar_one_or_none()
            
            return {
                "database_connected": True,
                "admin_user_exists": admin_user is not None,
                "admin_user_active": admin_user.is_active if admin_user else False,
                "database_url_configured": bool(settings.database_url),
                "admin_password_set": bool(settings.admin_password)
            }
    except Exception as e:
        return {
            "database_connected": False,
            "error": str(e),
            "database_url_configured": bool(settings.database_url),
            "admin_password_set": bool(settings.admin_password)
        }

# Add a root path for quick check
@app.get("/")
async def root():
    # Fallback: ensure admin user exists on first request if startup didn't run
    global _startup_complete
    if not _startup_complete:
        try:
            await ensure_admin_user()
            _startup_complete = True
        except:
            pass
    return {"message": "Plumbing Ops API"}
