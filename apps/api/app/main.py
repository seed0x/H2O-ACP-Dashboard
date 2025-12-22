from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .api.router import router
from .core.config import settings
from .core.rate_limit import limiter
from .core.auth import get_current_user
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
            return True
    except Exception as e:
        logger.warning(f"⚠ Could not create admin user: {e}", exc_info=True)
        return False

async def ensure_default_users():
    """Create default users (max and northwynd) if they don't exist"""
    try:
        from .db.session import AsyncSessionLocal
        from .models import User
        from .core.password import hash_password
        from sqlalchemy import select
        
        default_users = [
            {"username": "max", "password": "max123", "full_name": "Max", "role": "user", "tenant_id": "h2o"},
            {"username": "northwynd", "password": "user123", "full_name": "Northwynd", "role": "user", "tenant_id": "h2o"}
        ]
        
        async with AsyncSessionLocal() as db:
            for user_data in default_users:
                result = await db.execute(
                    select(User).where(User.username == user_data["username"])
                )
                existing_user = result.scalar_one_or_none()
                
                if not existing_user:
                    # Create user
                    new_user = User(
                        username=user_data["username"],
                        email=f"{user_data['username']}@h2oplumbers.com",
                        hashed_password=hash_password(user_data["password"]),
                        full_name=user_data["full_name"],
                        role=user_data["role"],
                        tenant_id=user_data["tenant_id"],
                        is_active=True
                    )
                    db.add(new_user)
                    logger.info(f"✓ Created user: {user_data['username']}")
                else:
                    # Update password if user exists
                    existing_user.hashed_password = hash_password(user_data["password"])
                    existing_user.is_active = True
                    logger.info(f"✓ Updated user: {user_data['username']}")
            
            await db.commit()
            return True
    except Exception as e:
        logger.warning(f"⚠ Could not create default users: {e}", exc_info=True)
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown"""
    logger.info("=" * 50)
    logger.info("Starting Plumbing Ops API")
    logger.info("=" * 50)
    
    try:
        # Check DATABASE_URL
        if not settings.database_url or settings.database_url == "postgresql+asyncpg://postgres:postgres@db:5432/plumbing":
            logger.error("ERROR: DATABASE_URL not set correctly!")
        else:
            logger.info("Database URL configured")
            
            # Test database connection
            try:
                from .db.session import engine
                from sqlalchemy import text
                
                async with engine.begin() as conn:
                    await conn.execute(text("SELECT 1"))
                
                logger.info("✓ Database connection successful")
                
                # Create admin user
                await ensure_admin_user()
                
                # Create default users (max and northwynd)
                await ensure_default_users()
                
                # Start background scheduler
                try:
                    from .core.scheduler import start_scheduler, get_scheduler
                    from .core.tasks import check_overdue_items, automate_review_requests, escalate_stale_items, daily_summary, topoff_marketing_slots
                    from apscheduler.triggers.cron import CronTrigger
                    from apscheduler.triggers.interval import IntervalTrigger
                    
                    scheduler = get_scheduler()
                    
                    # Schedule tasks
                    scheduler.add_job(
                        check_overdue_items,
                        trigger=IntervalTrigger(hours=1),
                        id='check_overdue_items',
                        replace_existing=True
                    )
                    
                    scheduler.add_job(
                        automate_review_requests,
                        trigger=IntervalTrigger(minutes=15),
                        id='automate_review_requests',
                        replace_existing=True
                    )
                    
                    scheduler.add_job(
                        escalate_stale_items,
                        trigger=IntervalTrigger(hours=6),
                        id='escalate_stale_items',
                        replace_existing=True
                    )
                    
                    scheduler.add_job(
                        daily_summary,
                        trigger=CronTrigger(hour=8, minute=0),
                        id='daily_summary',
                        replace_existing=True
                    )
                    
                    # Marketing slot top-off: run daily at 2 AM
                    scheduler.add_job(
                        topoff_marketing_slots,
                        trigger=CronTrigger(hour=2, minute=0),
                        id='topoff_marketing_slots',
                        replace_existing=True
                    )
                    
                    start_scheduler()
                    logger.info("✓ Background scheduler configured and started")
                except Exception as e:
                    logger.warning(f"⚠ Could not start scheduler: {e}", exc_info=True)
                    
            except Exception as e:
                logger.error(f"✗ Database connection failed: {e}", exc_info=True)
        
        logger.info("Startup complete - API ready!")
        global _startup_complete
        _startup_complete = True
    except Exception as e:
        logger.error(f"Startup error: {e}", exc_info=True)
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    try:
        from .core.scheduler import shutdown_scheduler
        shutdown_scheduler()
    except Exception as e:
        logger.warning(f"Error shutting down scheduler: {e}")

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
async def debug_startup(current_user=Depends(get_current_user)):
    """Debug endpoint to check startup status (admin only)"""
    from .db.session import AsyncSessionLocal
    from .models import User
    from sqlalchemy import select
    
    # Only allow admins to access debug endpoint
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
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
