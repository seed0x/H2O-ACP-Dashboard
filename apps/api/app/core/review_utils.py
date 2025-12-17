"""Review system utilities"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from .. import models, crud_reviews
from .config import settings
from .email_service import send_review_request_email, send_review_reminder_email

def get_review_url(token: str) -> str:
    """Generate the public review URL for a token"""
    base_url = settings.frontend_url.rstrip('/')
    return f"{base_url}/review/{token}"

async def send_review_request(
    db: AsyncSession,
    review_request: models.ReviewRequest
) -> bool:
    """
    Send a review request email
    
    Args:
        db: Database session
        review_request: Review request to send
    
    Returns:
        True if email sent successfully
    """
    if not review_request.customer_email:
        return False
    
    review_url = get_review_url(review_request.token)
    
    success = send_review_request_email(
        to_email=review_request.customer_email,
        customer_name=review_request.customer_name,
        review_url=review_url
    )
    
    if success:
        from datetime import datetime, timezone
        from .. import schemas
        await crud_reviews.update_review_request(
            db,
            review_request,
            schemas.ReviewRequestUpdate(
                status='sent',
                sent_at=datetime.now(timezone.utc)
            ),
            changed_by='system'
        )
    
    return success

async def send_review_reminder(
    db: AsyncSession,
    review_request: models.ReviewRequest
) -> bool:
    """
    Send a reminder email for a pending review request
    
    Args:
        db: Database session
        review_request: Review request to remind
    
    Returns:
        True if email sent successfully
    """
    if not review_request.customer_email:
        return False
    
    if review_request.reminder_sent:
        return False  # Already sent reminder
    
    review_url = get_review_url(review_request.token)
    
    success = send_review_reminder_email(
        to_email=review_request.customer_email,
        customer_name=review_request.customer_name,
        review_url=review_url
    )
    
    if success:
        from .. import schemas
        await crud_reviews.update_review_request(
            db,
            review_request,
            schemas.ReviewRequestUpdate(reminder_sent=True),
            changed_by='system'
        )
    
    return success

async def check_and_expire_review_requests(db: AsyncSession) -> int:
    """
    Check for expired review requests and mark them as expired
    
    Returns:
        Number of requests expired
    """
    from sqlalchemy import update
    
    now = datetime.now(timezone.utc)
    
    result = await db.execute(
        update(models.ReviewRequest)
        .where(
            models.ReviewRequest.status.in_(['pending', 'sent']),
            models.ReviewRequest.expires_at < now
        )
        .values(status='expired')
    )
    
    await db.commit()
    return result.rowcount

async def auto_create_recovery_ticket_for_negative_review(
    db: AsyncSession,
    review: models.Review
) -> Optional[models.RecoveryTicket]:
    """
    Automatically create a recovery ticket if review rating is 3 or less
    
    Args:
        db: Database session
        review: Review that was just submitted
    
    Returns:
        RecoveryTicket if created, None otherwise
    """
    if review.rating > 3:
        return None  # Only create tickets for 3 stars or less
    
    # Get the review request to get tenant_id
    from .. import crud_reviews
    review_request = await crud_reviews.get_review_request(db, review.review_request_id)
    if not review_request:
        return None
    
    # Check if ticket already exists for this review
    existing = await db.execute(
        select(models.RecoveryTicket).where(models.RecoveryTicket.review_id == review.id)
    )
    if existing.scalar_one_or_none():
        return None  # Ticket already exists
    
    # Create recovery ticket
    from .. import schemas
    ticket = await crud_reviews.create_recovery_ticket(
        db,
        schemas.RecoveryTicketCreate(
            tenant_id=review_request.tenant_id,
            review_id=review.id,
            service_call_id=review_request.service_call_id,
            customer_name=review.customer_name,
            customer_email=review.customer_email,
            customer_phone=review_request.customer_phone,
            issue_description=f"Negative review received: {review.rating} stars. {review.comment or 'No comment provided.'}"
        ),
        changed_by='system'
    )
    
    return ticket

