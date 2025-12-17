from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID

from ..db.session import get_session
from ..core.auth import get_current_user, CurrentUser
from .. import crud_reviews, schemas, models
from ..core.tenant_config import validate_tenant_feature, TenantFeature
from ..core.review_utils import send_review_request

router = APIRouter(prefix="/reviews", tags=["reviews"])

@router.post("/requests", response_model=schemas.ReviewRequestOut, status_code=status.HTTP_201_CREATED)
async def create_review_request(
    review_request_in: schemas.ReviewRequestCreate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new review request"""
    validate_tenant_feature(review_request_in.tenant_id, TenantFeature.SERVICE_CALLS)
    
    try:
        review_request = await crud_reviews.create_review_request(
            db, review_request_in, changed_by=current_user.username
        )
        return review_request
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/requests", response_model=List[schemas.ReviewRequestOut])
async def list_review_requests(
    tenant_id: str = Query(..., description="Tenant ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    service_call_id: Optional[UUID] = Query(None, description="Filter by service call ID"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List review requests"""
    validate_tenant_feature(tenant_id, TenantFeature.SERVICE_CALLS)
    
    review_requests = await crud_reviews.list_review_requests(
        db, tenant_id=tenant_id, status=status, service_call_id=service_call_id,
        limit=limit, offset=offset
    )
    return review_requests

@router.get("/requests/{request_id}", response_model=schemas.ReviewRequestOut)
async def get_review_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a review request by ID"""
    review_request = await crud_reviews.get_review_request(db, request_id)
    if not review_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review request not found")
    
    validate_tenant_feature(review_request.tenant_id, TenantFeature.SERVICE_CALLS)
    return review_request

@router.patch("/requests/{request_id}", response_model=schemas.ReviewRequestOut)
async def update_review_request(
    request_id: UUID,
    review_request_in: schemas.ReviewRequestUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update a review request"""
    review_request = await crud_reviews.get_review_request(db, request_id)
    if not review_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review request not found")
    
    validate_tenant_feature(review_request.tenant_id, TenantFeature.SERVICE_CALLS)
    
    try:
        updated = await crud_reviews.update_review_request(
            db, review_request, review_request_in, changed_by=current_user.username
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/requests/{request_id}/send", response_model=schemas.ReviewRequestOut)
async def send_review_request_endpoint(
    request_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Send a review request email to the customer"""
    review_request = await crud_reviews.get_review_request(db, request_id)
    if not review_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review request not found")
    
    validate_tenant_feature(review_request.tenant_id, TenantFeature.SERVICE_CALLS)
    
    if review_request.status == 'completed':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot send a completed review request")
    
    if not review_request.customer_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Customer email is required to send review request")
    
    success = await send_review_request(db, review_request)
    
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send review request email")
    
    # Refresh to get updated status
    await db.refresh(review_request)
    return review_request

@router.get("", response_model=List[schemas.ReviewOut])
async def list_reviews(
    tenant_id: Optional[str] = Query(None, description="Filter by tenant ID"),
    is_public: Optional[bool] = Query(None, description="Filter by public status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List reviews"""
    reviews = await crud_reviews.list_reviews(
        db, tenant_id=tenant_id, is_public=is_public, limit=limit, offset=offset
    )
    return reviews

@router.get("/{review_id}", response_model=schemas.ReviewOut)
async def get_review(
    review_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a review by ID"""
    review = await crud_reviews.get_review(db, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return review

@router.patch("/{review_id}", response_model=schemas.ReviewOut)
async def update_review(
    review_id: UUID,
    review_in: schemas.ReviewUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update a review (e.g., make it public)"""
    review = await crud_reviews.get_review(db, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    
    try:
        updated = await crud_reviews.update_review(
            db, review, review_in, changed_by=current_user.username
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

