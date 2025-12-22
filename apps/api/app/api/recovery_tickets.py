from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID

from ..db.session import get_session
from ..core.auth import get_current_user, CurrentUser
from .. import crud_reviews, schemas
from ..core.tenant_config import validate_tenant_feature, TenantFeature

router = APIRouter(prefix="/recovery-tickets", tags=["recovery-tickets"])

@router.post("", response_model=schemas.RecoveryTicketOut, status_code=status.HTTP_201_CREATED)
async def create_recovery_ticket(
    ticket_in: schemas.RecoveryTicketCreate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a recovery ticket from a negative review"""
    validate_tenant_feature(ticket_in.tenant_id, TenantFeature.SERVICE_CALLS)
    
    try:
        ticket = await crud_reviews.create_recovery_ticket(
            db, ticket_in, changed_by=current_user.username
        )
        return ticket
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("", response_model=List[schemas.RecoveryTicketOut])
async def list_recovery_tickets(
    tenant_id: str = Query(..., description="Tenant ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List recovery tickets"""
    validate_tenant_feature(tenant_id, TenantFeature.SERVICE_CALLS)
    
    tickets = await crud_reviews.list_recovery_tickets(
        db, tenant_id=tenant_id, status=status, limit=limit, offset=offset
    )
    return tickets

@router.get("/{ticket_id}", response_model=schemas.RecoveryTicketOut)
async def get_recovery_ticket(
    ticket_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a recovery ticket by ID"""
    ticket = await crud_reviews.get_recovery_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recovery ticket not found")
    
    validate_tenant_feature(ticket.tenant_id, TenantFeature.SERVICE_CALLS)
    return ticket

@router.patch("/{ticket_id}", response_model=schemas.RecoveryTicketOut)
async def update_recovery_ticket(
    ticket_id: UUID,
    ticket_in: schemas.RecoveryTicketUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update a recovery ticket"""
    ticket = await crud_reviews.get_recovery_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recovery ticket not found")
    
    validate_tenant_feature(ticket.tenant_id, TenantFeature.SERVICE_CALLS)
    
    try:
        updated = await crud_reviews.update_recovery_ticket(
            db, ticket, ticket_in, changed_by=current_user.username
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))



