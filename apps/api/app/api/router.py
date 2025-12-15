from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import JSONResponse
from typing import Optional
from pydantic import BaseModel
from .. schemas import (
    BuilderCreate, BuilderOut, BuilderUpdate, BuilderContactCreate, BuilderContactOut, BuilderContactUpdate, Token,
    BidCreate, BidOut, BidUpdate, BidLineItemCreate, BidLineItemOut, BidLineItemUpdate,
    JobCreate, JobOut, JobUpdate,
    ServiceCallCreate, ServiceCallOut, ServiceCallUpdate,
    AuditLogOut,
)
from ..core.auth import create_access_token, get_current_user
from ..core.config import settings
from ..db.session import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .. import crud, models
from uuid import UUID

router = APIRouter()

class LoginRequest(BaseModel):
    password: str

@router.post('/login')
async def login(login_data: LoginRequest, response: Response):
    if login_data.password != settings.admin_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"username": "admin", "role": "admin"})
    
    # Set httpOnly cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=28800  # 8 hours
    )
    
    return {"message": "Login successful", "username": "admin"}

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
    if job_in.tenant_id != 'all_county':
        raise HTTPException(status_code=400, detail='tenant_id must be all_county for jobs')
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
    if sc_in.tenant_id != 'h2o':
        raise HTTPException(status_code=400, detail='tenant_id must be h2o for service calls')
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
