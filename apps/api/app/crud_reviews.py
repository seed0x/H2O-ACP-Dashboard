from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.exc import IntegrityError
from . import models, schemas
from typing import Optional, List
from uuid import UUID
import secrets
from datetime import datetime, timedelta, timezone

def generate_review_token() -> str:
    """Generate a unique token for review requests"""
    return secrets.token_urlsafe(32)

async def create_review_request(
    db: AsyncSession, 
    review_request_in: schemas.ReviewRequestCreate,
    changed_by: str
) -> models.ReviewRequest:
    """Create a new review request with a unique token"""
    token = generate_review_token()
    # Check token uniqueness (very unlikely collision, but check anyway)
    while True:
        existing = await db.execute(
            select(models.ReviewRequest).where(models.ReviewRequest.token == token)
        )
        if existing.scalar_one_or_none() is None:
            break
        token = generate_review_token()
    
    # Set expiration to 30 days from now
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    
    review_request = models.ReviewRequest(
        tenant_id=review_request_in.tenant_id,
        service_call_id=review_request_in.service_call_id,
        job_id=review_request_in.job_id,
        customer_name=review_request_in.customer_name,
        customer_email=review_request_in.customer_email,
        customer_phone=review_request_in.customer_phone,
        token=token,
        status='pending',
        expires_at=expires_at,
    )
    db.add(review_request)
    await db.flush()
    
    # Write audit log
    await db.execute(models.AuditLog.__table__.insert().values(
        tenant_id=review_request.tenant_id,
        entity_type='review_request',
        entity_id=review_request.id,
        action='create',
        changed_by=changed_by,
    ))
    
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise ValueError('Failed to create review request')
    
    await db.refresh(review_request)
    return review_request

async def get_review_request(db: AsyncSession, request_id: UUID) -> Optional[models.ReviewRequest]:
    """Get a review request by ID"""
    q = select(models.ReviewRequest).where(models.ReviewRequest.id == request_id)
    res = await db.execute(q)
    return res.scalar_one_or_none()

async def get_review_request_by_token(db: AsyncSession, token: str) -> Optional[models.ReviewRequest]:
    """Get a review request by token (for public review submission)"""
    q = select(models.ReviewRequest).where(models.ReviewRequest.token == token)
    res = await db.execute(q)
    return res.scalar_one_or_none()

async def list_review_requests(
    db: AsyncSession,
    tenant_id: str,
    status: Optional[str] = None,
    service_call_id: Optional[UUID] = None,
    limit: int = 100,
    offset: int = 0
) -> List[models.ReviewRequest]:
    """List review requests with optional filters"""
    q = select(models.ReviewRequest).where(models.ReviewRequest.tenant_id == tenant_id)
    
    if status:
        q = q.where(models.ReviewRequest.status == status)
    if service_call_id:
        q = q.where(models.ReviewRequest.service_call_id == service_call_id)
    
    q = q.order_by(models.ReviewRequest.created_at.desc()).limit(limit).offset(offset)
    res = await db.execute(q)
    return res.scalars().all()

async def update_review_request(
    db: AsyncSession,
    review_request: models.ReviewRequest,
    review_request_in: schemas.ReviewRequestUpdate,
    changed_by: str
) -> models.ReviewRequest:
    """Update a review request"""
    if review_request_in.status is not None:
        old_status = review_request.status
        review_request.status = review_request_in.status
        await db.execute(models.AuditLog.__table__.insert().values(
            tenant_id=review_request.tenant_id,
            entity_type='review_request',
            entity_id=review_request.id,
            action='update',
            field='status',
            old_value=old_status,
            new_value=review_request_in.status,
            changed_by=changed_by,
        ))
    
    if review_request_in.sent_at is not None:
        review_request.sent_at = review_request_in.sent_at
    
    if review_request_in.completed_at is not None:
        review_request.completed_at = review_request_in.completed_at
    
    if review_request_in.reminder_sent is not None:
        review_request.reminder_sent = review_request_in.reminder_sent
    
    await db.commit()
    await db.refresh(review_request)
    return review_request

async def create_review(
    db: AsyncSession,
    review_in: schemas.PublicReviewCreate,
    changed_by: str = "customer"
) -> models.Review:
    """Create a review from a public review submission"""
    # Get the review request by token
    review_request = await get_review_request_by_token(db, review_in.token)
    if not review_request:
        raise ValueError('Invalid review token')
    
    if review_request.status == 'completed':
        raise ValueError('Review already submitted')
    
    if review_request.status == 'expired':
        raise ValueError('Review request has expired')
    
    # Check if review already exists
    existing_review = await db.execute(
        select(models.Review).where(models.Review.review_request_id == review_request.id)
    )
    if existing_review.scalar_one_or_none():
        raise ValueError('Review already submitted for this request')
    
    # Create the review
    review = models.Review(
        review_request_id=review_request.id,
        rating=review_in.rating,
        comment=review_in.comment,
        customer_name=review_in.customer_name,
        customer_email=review_in.customer_email,
        is_public=False,  # Default to not public until approved
    )
    db.add(review)
    await db.flush()
    
    # Update review request status
    review_request.status = 'completed'
    review_request.completed_at = datetime.now(timezone.utc)
    
    # Write audit log
    await db.execute(models.AuditLog.__table__.insert().values(
        tenant_id=review_request.tenant_id,
        entity_type='review',
        entity_id=review.id,
        action='create',
        changed_by=changed_by,
    ))
    
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise ValueError('Failed to create review')
    
    await db.refresh(review)
    
    # Automation: Create recovery ticket for negative reviews (3 stars or less)
    if review.rating <= 3:
        try:
            from ..core.review_utils import auto_create_recovery_ticket_for_negative_review
            await auto_create_recovery_ticket_for_negative_review(db, review)
            
            # Trigger automation notification
            try:
                from ..core.automation import on_review_received
                await on_review_received(db, review, changed_by)
            except Exception as e:
                logger.error(f"Error triggering review automation: {e}", exc_info=True)
        except Exception as e:
            # Log error but don't fail the review creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create recovery ticket for review {review.id}: {str(e)}")
    
    return review

async def get_review(db: AsyncSession, review_id: UUID) -> Optional[models.Review]:
    """Get a review by ID"""
    q = select(models.Review).where(models.Review.id == review_id)
    res = await db.execute(q)
    return res.scalar_one_or_none()

async def list_reviews(
    db: AsyncSession,
    tenant_id: Optional[str] = None,
    is_public: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0
) -> List[models.Review]:
    """List reviews with optional filters"""
    q = select(models.Review).join(models.ReviewRequest)
    
    if tenant_id:
        q = q.where(models.ReviewRequest.tenant_id == tenant_id)
    if is_public is not None:
        q = q.where(models.Review.is_public == is_public)
    
    q = q.order_by(models.Review.created_at.desc()).limit(limit).offset(offset)
    res = await db.execute(q)
    return res.scalars().all()

async def update_review(
    db: AsyncSession,
    review: models.Review,
    review_in: schemas.ReviewUpdate,
    changed_by: str
) -> models.Review:
    """Update a review (typically to make it public)"""
    if review_in.is_public is not None:
        old_value = str(review.is_public)
        review.is_public = review_in.is_public
        await db.execute(models.AuditLog.__table__.insert().values(
            tenant_id=None,  # Get from review_request if needed
            entity_type='review',
            entity_id=review.id,
            action='update',
            field='is_public',
            old_value=old_value,
            new_value=str(review_in.is_public),
            changed_by=changed_by,
        ))
    
    await db.commit()
    await db.refresh(review)
    return review

async def create_recovery_ticket(
    db: AsyncSession,
    ticket_in: schemas.RecoveryTicketCreate,
    changed_by: str
) -> models.RecoveryTicket:
    """Create a recovery ticket from a negative review"""
    ticket = models.RecoveryTicket(
        tenant_id=ticket_in.tenant_id,
        review_id=ticket_in.review_id,
        service_call_id=ticket_in.service_call_id,
        customer_name=ticket_in.customer_name,
        customer_email=ticket_in.customer_email,
        customer_phone=ticket_in.customer_phone,
        issue_description=ticket_in.issue_description,
        status='open',
    )
    db.add(ticket)
    await db.flush()
    
    # Write audit log
    await db.execute(models.AuditLog.__table__.insert().values(
        tenant_id=ticket.tenant_id,
        entity_type='recovery_ticket',
        entity_id=ticket.id,
        action='create',
        changed_by=changed_by,
    ))
    
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise ValueError('Failed to create recovery ticket')
    
    await db.refresh(ticket)
    return ticket

async def get_recovery_ticket(db: AsyncSession, ticket_id: UUID) -> Optional[models.RecoveryTicket]:
    """Get a recovery ticket by ID"""
    q = select(models.RecoveryTicket).where(models.RecoveryTicket.id == ticket_id)
    res = await db.execute(q)
    return res.scalar_one_or_none()

async def list_recovery_tickets(
    db: AsyncSession,
    tenant_id: str,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[models.RecoveryTicket]:
    """List recovery tickets with optional filters"""
    q = select(models.RecoveryTicket).where(models.RecoveryTicket.tenant_id == tenant_id)
    
    if status:
        q = q.where(models.RecoveryTicket.status == status)
    
    q = q.order_by(models.RecoveryTicket.created_at.desc()).limit(limit).offset(offset)
    res = await db.execute(q)
    return res.scalars().all()

async def update_recovery_ticket(
    db: AsyncSession,
    ticket: models.RecoveryTicket,
    ticket_in: schemas.RecoveryTicketUpdate,
    changed_by: str
) -> models.RecoveryTicket:
    """Update a recovery ticket"""
    if ticket_in.status is not None:
        old_status = ticket.status
        ticket.status = ticket_in.status
        await db.execute(models.AuditLog.__table__.insert().values(
            tenant_id=ticket.tenant_id,
            entity_type='recovery_ticket',
            entity_id=ticket.id,
            action='update',
            field='status',
            old_value=old_status,
            new_value=ticket_in.status,
            changed_by=changed_by,
        ))
    
    if ticket_in.assigned_to is not None:
        old_value = ticket.assigned_to or ''
        ticket.assigned_to = ticket_in.assigned_to
        await db.execute(models.AuditLog.__table__.insert().values(
            tenant_id=ticket.tenant_id,
            entity_type='recovery_ticket',
            entity_id=ticket.id,
            action='update',
            field='assigned_to',
            old_value=old_value,
            new_value=ticket_in.assigned_to or '',
            changed_by=changed_by,
        ))
    
    if ticket_in.resolution_notes is not None:
        ticket.resolution_notes = ticket_in.resolution_notes
    
    await db.commit()
    await db.refresh(ticket)
    return ticket

async def mark_review_request_as_lost(
    db: AsyncSession,
    review_request: models.ReviewRequest,
    changed_by: str = "system"
) -> models.ReviewRequest:
    """Mark a review request as lost (customer didn't respond)"""
    old_status = review_request.status
    review_request.status = 'lost'
    
    # Write audit log
    await db.execute(models.AuditLog.__table__.insert().values(
        tenant_id=review_request.tenant_id,
        entity_type='review_request',
        entity_id=review_request.id,
        action='update',
        field='status',
        old_value=old_status,
        new_value='lost',
        changed_by=changed_by,
    ))
    
    await db.commit()
    await db.refresh(review_request)
    return review_request

async def auto_expire_review_requests(
    db: AsyncSession,
    changed_by: str = "system"
) -> int:
    """Automatically mark expired review requests as lost
    
    Returns:
        Number of review requests expired
    """
    now = datetime.now(timezone.utc)
    
    # Find review requests that are sent but past expiration
    q = select(models.ReviewRequest).where(
        models.ReviewRequest.status == 'sent',
        models.ReviewRequest.expires_at < now
    )
    res = await db.execute(q)
    expired_requests = res.scalars().all()
    
    count = 0
    for request in expired_requests:
        await mark_review_request_as_lost(db, request, changed_by)
        count += 1
    
    return count

async def get_review_stats(
    db: AsyncSession,
    tenant_id: str
) -> dict:
    """Get review statistics for a tenant
    
    Returns:
        Dictionary with: total_requests, sent, completed (got), lost, pending, conversion_rate
    """
    # Total requests
    total_q = select(func.count(models.ReviewRequest.id)).where(
        models.ReviewRequest.tenant_id == tenant_id
    )
    total_res = await db.execute(total_q)
    total_requests = total_res.scalar() or 0
    
    # Count by status
    pending_q = select(func.count(models.ReviewRequest.id)).where(
        models.ReviewRequest.tenant_id == tenant_id,
        models.ReviewRequest.status == 'pending'
    )
    pending_res = await db.execute(pending_q)
    pending = pending_res.scalar() or 0
    
    sent_q = select(func.count(models.ReviewRequest.id)).where(
        models.ReviewRequest.tenant_id == tenant_id,
        models.ReviewRequest.status == 'sent'
    )
    sent_res = await db.execute(sent_q)
    sent = sent_res.scalar() or 0
    
    completed_q = select(func.count(models.ReviewRequest.id)).where(
        models.ReviewRequest.tenant_id == tenant_id,
        models.ReviewRequest.status == 'completed'
    )
    completed_res = await db.execute(completed_q)
    completed = completed_res.scalar() or 0
    
    lost_q = select(func.count(models.ReviewRequest.id)).where(
        models.ReviewRequest.tenant_id == tenant_id,
        models.ReviewRequest.status == 'lost'
    )
    lost_res = await db.execute(lost_q)
    lost = lost_res.scalar() or 0
    
    # Get average rating from completed reviews
    avg_rating_q = select(func.avg(models.Review.rating)).join(
        models.ReviewRequest
    ).where(
        models.ReviewRequest.tenant_id == tenant_id
    )
    avg_rating_res = await db.execute(avg_rating_q)
    avg_rating = avg_rating_res.scalar() or 0.0
    
    # Calculate conversion rate (completed / sent)
    conversion_rate = (completed / sent * 100) if sent > 0 else 0.0
    
    return {
        'total_requests': total_requests,
        'pending': pending,
        'sent': sent,
        'completed': completed,  # "got"
        'lost': lost,
        'conversion_rate': round(conversion_rate, 1),
        'average_rating': round(float(avg_rating), 1) if avg_rating else 0.0
    }

