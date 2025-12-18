from fastapi import APIRouter, Depends, HTTPException, status, Query, Response, Request
from fastapi.responses import JSONResponse
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from .. schemas import (
    BuilderCreate, BuilderOut, BuilderUpdate, BuilderContactCreate, BuilderContactOut, BuilderContactUpdate, Token,
    BidCreate, BidOut, BidUpdate, BidLineItemCreate, BidLineItemOut, BidLineItemUpdate,
    JobCreate, JobOut, JobUpdate,
    ServiceCallCreate, ServiceCallOut, ServiceCallUpdate,
    AuditLogOut,
    ReviewRequestCreate, ReviewRequestOut, ReviewRequestUpdate,
    ReviewOut, ReviewUpdate,
    RecoveryTicketCreate, RecoveryTicketOut, RecoveryTicketUpdate,
)
from ..core.auth import create_access_token, get_current_user, CurrentUser
from ..core.config import settings
from ..core.password import hash_password, verify_password
from ..db.session import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .. import crud, models
from ..core.tenant_config import validate_tenant_feature, TenantFeature
from ..schemas import UserCreate, UserUpdate, UserOut
from uuid import UUID

# Import marketing routes (async-based)
try:
    from ..routes_marketing import router as marketing_router
except ImportError:
    marketing_router = None

# Import review system routes
try:
    from .reviews import router as reviews_router
    from .public_reviews import router as public_reviews_router
    from .recovery_tickets import router as recovery_tickets_router
except ImportError:
    reviews_router = None
    public_reviews_router = None
    recovery_tickets_router = None

# Import overdue tracking routes
try:
    from .overdue import router as overdue_router
except ImportError:
    overdue_router = None

# Import analytics routes
try:
    from .analytics import router as analytics_router
except ImportError:
    analytics_router = None

# Import notifications routes
try:
    from .notifications import router as notifications_router
except ImportError:
    notifications_router = None

# Import signals routes
try:
    from .signals import router as signals_router
except ImportError:
    signals_router = None

from ..core.rate_limit import limiter, get_rate_limit

router = APIRouter()

# Include marketing routes if available
if marketing_router:
    router.include_router(marketing_router)

# Include review system routes if available
if reviews_router:
    router.include_router(reviews_router)
if public_reviews_router:
    router.include_router(public_reviews_router)
if recovery_tickets_router:
    router.include_router(recovery_tickets_router)

# Include overdue tracking routes if available
if overdue_router:
    router.include_router(overdue_router)

# Include analytics routes if available
if analytics_router:
    router.include_router(analytics_router)

# Include notifications routes if available
if notifications_router:
    router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])

# Include signals routes if available
if signals_router:
    router.include_router(signals_router)

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post('/login')
async def login(request: Request, login_data: LoginRequest, response: Response, db: AsyncSession = Depends(get_session)):
    """Login endpoint - supports both user table and legacy admin password"""
    try:
        # Try to find user in database first
        result = await db.execute(
            select(models.User).where(models.User.username == login_data.username)
        )
        user = result.scalar_one_or_none()
        
        # If admin user doesn't exist and login is for admin, create it
        if not user and login_data.username == "admin" and settings.admin_password:
            if login_data.password == settings.admin_password:
                # Create admin user on-the-fly
                from ..core.password import hash_password
                user = models.User(
                    username="admin",
                    email="admin@example.com",
                    hashed_password=hash_password(settings.admin_password),
                    role="admin",
                    is_active=True
                )
                db.add(user)
                await db.flush()
                await db.refresh(user)
        
        if user:
            # User exists in database - verify password
            if not user.is_active:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")
            
            # Check password - if username is "admin" and password doesn't match, also try ADMIN_PASSWORD env var
            password_valid = verify_password(login_data.password, user.hashed_password)
            
            # Special case: if admin user exists but password doesn't match, check env var as fallback
            if not password_valid and user.username == "admin" and login_data.password == settings.admin_password:
                password_valid = True
                # Update admin user's password to match env var for future logins
                user.hashed_password = hash_password(settings.admin_password)
            
            if not password_valid:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
            
            # Update last login
            user.last_login = datetime.now(timezone.utc)
            await db.commit()
            
            token = create_access_token({
                "username": user.username,
                "role": user.role,
                "user_id": str(user.id),
                "tenant_id": user.tenant_id
            })
            
            username = user.username
            role = user.role
        else:
            # Fallback to legacy admin password for backward compatibility
            if not settings.admin_password:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Admin password not configured"
                )
            if login_data.username != "admin" or login_data.password != settings.admin_password:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
            
            token = create_access_token({"username": "admin", "role": "admin"})
            username = "admin"
            role = "admin"
        
        # Set httpOnly cookie
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=settings.environment == "production",
            samesite="lax",
            max_age=28800  # 8 hours
        )
        
        # Also return token in response body for frontend to store in localStorage
        return {
            "message": "Login successful", 
            "username": username, 
            "role": role,
            "access_token": token,
            "token_type": "bearer"
        }
    except HTTPException:
        # Re-raise HTTP exceptions (401, 403, etc.)
        raise
    except Exception as e:
        # Log unexpected errors and return 500 with error details
        import traceback
        import logging
        error_details = traceback.format_exc()
        logging.error(f"Login error: {error_details}")
        print(f"Login error: {error_details}")  # Log to console for debugging
        # Return more detailed error in development, generic in production
        error_message = f"Internal server error during login: {str(e)}" if settings.environment == "development" else "Internal server error during login"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_message
        )

@router.get('/health')
async def health():
    return {"status":"ok"}

# Builders
@router.post('/builders', response_model=BuilderOut)
async def create_builder(builder_in: BuilderCreate, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    try:
        builder = await crud.create_builder(db, builder_in, current_user.username)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return builder

@router.get('/builders')
async def list_builders(search: Optional[str] = None, limit: int = 25, offset: int = 0, db: AsyncSession = Depends(get_session)):
    builders = await crud.list_builders(db, search, limit, offset)
    return builders

@router.get('/builders/{builder_id}', response_model=BuilderOut)
async def get_builder(builder_id: UUID, db: AsyncSession = Depends(get_session)):
    builder = await crud.get_builder(db, builder_id)
    if not builder:
        raise HTTPException(status_code=404, detail='Builder not found')
    return builder

@router.patch('/builders/{builder_id}', response_model=BuilderOut)
async def patch_builder(builder_id: UUID, builder_in: BuilderUpdate, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    builder = await crud.get_builder(db, builder_id)
    if not builder:
        raise HTTPException(status_code=404, detail='Builder not found')
    builder = await crud.update_builder(db, builder, builder_in, current_user.username)
    return builder

@router.delete('/builders/{builder_id}')
async def delete_builder(builder_id: UUID, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    builder = await crud.get_builder(db, builder_id)
    if not builder:
        raise HTTPException(status_code=404, detail='Builder not found')
    await crud.delete_builder(db, builder, current_user.username)
    return {"deleted": True}

# Builder contacts
@router.post('/builders/{builder_id}/contacts', response_model=BuilderContactOut)
async def create_builder_contact(builder_id: UUID, contact_in: BuilderContactCreate, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    # ensure builder exists
    builder = await crud.get_builder(db, builder_id)
    if not builder:
        raise HTTPException(status_code=404, detail='Builder not found')
    contact = await crud.create_builder_contact(db, builder_id, contact_in, current_user.username)
    return contact

@router.get('/builders/{builder_id}/contacts', response_model=list[BuilderContactOut])
async def list_builder_contacts(builder_id: UUID, tenant_id: Optional[str] = None, db: AsyncSession = Depends(get_session)):
    builder = await crud.get_builder(db, builder_id)
    if not builder:
        raise HTTPException(status_code=404, detail='Builder not found')
    contacts = await crud.list_builder_contacts(db, builder_id, tenant_id)
    return contacts

@router.patch('/builder-contacts/{contact_id}', response_model=BuilderContactOut)
async def patch_builder_contact(contact_id: UUID, contact_in: BuilderContactUpdate, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    c = await crud.get_builder_contact(db, contact_id)
    if not c:
        raise HTTPException(status_code=404, detail='Contact not found')
    c = await crud.update_builder_contact(db, c, contact_in, current_user.username)
    return c

@router.delete('/builder-contacts/{contact_id}')
async def delete_builder_contact(contact_id: UUID, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    c = await crud.get_builder_contact(db, contact_id)
    if not c:
        raise HTTPException(status_code=404, detail='Contact not found')
    await crud.delete_builder_contact(db, c, current_user.username)
    return {"deleted": True}

# Bids
@router.post('/bids', response_model=BidOut)
async def create_bid(bid_in: BidCreate, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    try:
        bid = await crud.create_bid(db, bid_in, current_user.username)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return bid

@router.get('/bids')
async def list_bids(tenant_id: Optional[str] = None, status: Optional[str] = None, builder_id: Optional[UUID] = None, search: Optional[str] = None, limit: int = 25, offset: int = 0, db: AsyncSession = Depends(get_session)):
    bids = await crud.list_bids(db, tenant_id, status, builder_id, search, limit, offset)
    return bids

@router.get('/bids/{bid_id}', response_model=BidOut)
async def get_bid(bid_id: UUID, db: AsyncSession = Depends(get_session)):
    bid = await crud.get_bid(db, bid_id)
    if not bid:
        raise HTTPException(status_code=404, detail='Bid not found')
    return bid

@router.patch('/bids/{bid_id}', response_model=BidOut)
async def patch_bid(bid_id: UUID, bid_in: BidUpdate, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    bid = await crud.get_bid(db, bid_id)
    if not bid:
        raise HTTPException(status_code=404, detail='Bid not found')
    bid = await crud.update_bid(db, bid, bid_in, current_user.username)
    return bid

@router.delete('/bids/{bid_id}')
async def delete_bid(bid_id: UUID, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    bid = await crud.get_bid(db, bid_id)
    if not bid:
        raise HTTPException(status_code=404, detail='Bid not found')
    await crud.delete_bid(db, bid, current_user.username)
    return {"deleted": True}

# Bid line items
@router.post('/bids/{bid_id}/line-items', response_model=BidLineItemOut)
async def create_bid_line_item(bid_id: UUID, item_in: BidLineItemCreate, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    try:
        item = await crud.create_bid_line_item(db, bid_id, item_in, current_user.username)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return item

@router.get('/bids/{bid_id}/line-items')
async def list_bid_line_items(bid_id: UUID, db: AsyncSession = Depends(get_session)):
    items = await crud.list_bid_line_items(db, bid_id)
    return items

@router.patch('/bid-line-items/{id}', response_model=BidLineItemOut)
async def patch_bid_line_item(id: UUID, item_in: BidLineItemUpdate, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    item = await crud.get_bid_line_item(db, id)
    if not item:
        raise HTTPException(status_code=404, detail='Bid line item not found')
    item = await crud.update_bid_line_item(db, item, item_in, current_user.username)
    return item

@router.delete('/bid-line-items/{id}')
async def delete_bid_line_item(id: UUID, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    item = await crud.get_bid_line_item(db, id)
    if not item:
        raise HTTPException(status_code=404, detail='Bid line item not found')
    await crud.delete_bid_line_item(db, item, current_user.username)
    return {"deleted": True}

# Jobs
@router.post('/jobs', response_model=JobOut)
async def create_job(job_in: JobCreate, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    try:
        validate_tenant_feature(job_in.tenant_id, TenantFeature.JOBS)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    try:
        job = await crud.create_job(db, job_in, current_user.username)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return job

@router.get('/jobs')
async def list_jobs(tenant_id: Optional[str] = 'all_county', status: Optional[str] = None, builder_id: Optional[UUID] = None, community: Optional[str] = None, lot: Optional[str] = None, search: Optional[str] = None, limit: int = 25, offset: int = 0, db: AsyncSession = Depends(get_session)):
    jobs = await crud.list_jobs(db, tenant_id, status, builder_id, community, lot, search, limit, offset)
    return jobs

@router.get('/jobs/{id}', response_model=JobOut)
async def get_job(id: UUID, db: AsyncSession = Depends(get_session)):
    job = await crud.get_job(db, id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')
    return job

@router.patch('/jobs/{id}', response_model=JobOut)
async def patch_job(id: UUID, job_in: JobUpdate, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    job = await crud.get_job(db, id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')
    job = await crud.update_job(db, job, job_in, current_user.username)
    return job

@router.delete('/jobs/{id}')
async def delete_job(id: UUID, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    job = await crud.get_job(db, id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')
    await crud.delete_job(db, job, current_user.username)
    return {"deleted": True}

@router.get('/jobs/{id}/contacts')
async def get_job_contacts(id: UUID, db: AsyncSession = Depends(get_session)):
    res = await db.execute(select(models.JobContact).where(models.JobContact.job_id == id))
    return res.scalars().all()

@router.post('/jobs/{id}/contacts')
async def add_job_contact(id: UUID, contact_id: UUID, role_on_job: Optional[str] = None, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    await crud.add_job_contact(db, id, contact_id, role_on_job, current_user.username)
    return {"linked": True}

@router.delete('/jobs/{id}/contacts/{builder_contact_id}')
async def delete_job_contact(id: UUID, builder_contact_id: UUID, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    res = await crud.remove_job_contact(db, id, builder_contact_id, current_user.username)
    if not res:
        raise HTTPException(status_code=404, detail='Contact link not found')
    return {"deleted": True}

# Service calls
@router.post('/service-calls', response_model=ServiceCallOut)
async def create_service_call(sc_in: ServiceCallCreate, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    try:
        validate_tenant_feature(sc_in.tenant_id, TenantFeature.SERVICE_CALLS)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    try:
        sc = await crud.create_service_call(db, sc_in, current_user.username)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return sc

@router.get('/service-calls')
async def list_service_calls(tenant_id: Optional[str] = 'h2o', status: Optional[str] = None, builder_id: Optional[UUID] = None, search: Optional[str] = None, limit: int = 25, offset: int = 0, db: AsyncSession = Depends(get_session)):
    scs = await crud.list_service_calls(db, tenant_id, status, builder_id, search, limit, offset)
    return scs

@router.get('/service-calls/{id}', response_model=ServiceCallOut)
async def get_service_call(id: UUID, db: AsyncSession = Depends(get_session)):
    sc = await crud.get_service_call(db, id)
    if not sc:
        raise HTTPException(status_code=404, detail='Service call not found')
    return sc

@router.patch('/service-calls/{id}', response_model=ServiceCallOut)
async def patch_service_call(id: UUID, sc_in: ServiceCallUpdate, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    sc = await crud.get_service_call(db, id)
    if not sc:
        raise HTTPException(status_code=404, detail='Service call not found')
    sc = await crud.update_service_call(db, sc, sc_in, current_user.username)
    return sc

@router.delete('/service-calls/{id}')
async def delete_service_call(id: UUID, db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    sc = await crud.get_service_call(db, id)
    if not sc:
        raise HTTPException(status_code=404, detail='Service call not found')
    await crud.delete_service_call(db, sc, current_user.username)
    return {"deleted": True}

# Audit log
@router.get('/audit', response_model=list[AuditLogOut])
async def list_audit(entity_type: Optional[str] = None, entity_id: Optional[UUID] = None, tenant_id: Optional[str] = None, limit: int = 50, offset: int = 0, db: AsyncSession = Depends(get_session)):
    logs = await crud.list_audit(db, entity_type, entity_id, tenant_id, limit, offset)
    return logs

# User Management

@router.post('/users', response_model=UserOut)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a new user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can create users")
    
    # Check if username already exists
    result = await db.execute(
        select(models.User).where(models.User.username == user_in.username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already exists")
    
    # Create user
    user = models.User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        role=user_in.role,
        tenant_id=user_in.tenant_id,
        hashed_password=hash_password(user_in.password)
    )
    db.add(user)
    await db.flush()
    
    # Audit log
    await crud.write_audit(
        db, None, 'user', user.id, 'create', current_user.username
    )
    
    await db.commit()
    await db.refresh(user)
    return user

@router.get('/users', response_model=list[UserOut])
async def list_users(
    tenant_id: Optional[str] = None,
    role: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List users (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can list users")
    
    query = select(models.User)
    if tenant_id:
        query = query.where(models.User.tenant_id == tenant_id)
    if role:
        query = query.where(models.User.role == role)
    
    query = query.limit(limit).offset(offset).order_by(models.User.username)
    result = await db.execute(query)
    return result.scalars().all()

@router.get('/users/{user_id}', response_model=UserOut)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get a specific user"""
    # Users can view their own profile, admins can view any
    if current_user.role != "admin" and str(user_id) != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    result = await db.execute(
        select(models.User).where(models.User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.patch('/users/{user_id}', response_model=UserOut)
async def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update a user"""
    # Users can update their own profile (except role), admins can update any
    if current_user.role != "admin" and str(user_id) != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    result = await db.execute(
        select(models.User).where(models.User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Non-admins cannot change role
    if current_user.role != "admin" and user_update.role is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot change role")
    
    update_data = user_update.model_dump(exclude_unset=True)
    
    # Handle password update
    if "password" in update_data:
        update_data["hashed_password"] = hash_password(update_data.pop("password"))
    
    for field, value in update_data.items():
        old_value = getattr(user, field)
        setattr(user, field, value)
        await crud.write_audit(
            db,
            None,
            'user',
            user.id,
            'update',
            current_user.username,
            field,
            str(old_value) if old_value is not None else None,
            str(value) if value is not None else None,
        )
    
    await db.commit()
    await db.refresh(user)
    return user

@router.delete('/users/{user_id}')
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Delete a user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can delete users")
    
    result = await db.execute(
        select(models.User).where(models.User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow deleting yourself
    if str(user_id) == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    await crud.write_audit(
        db, None, 'user', user.id, 'delete', current_user.username
    )
    
    await db.delete(user)
    await db.commit()
    return {"deleted": True}
