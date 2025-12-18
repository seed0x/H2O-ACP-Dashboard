"""Automation triggers for service calls"""
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from .. import models, crud_reviews, schemas
from .review_utils import send_review_request

async def on_service_call_completed(
    db: AsyncSession,
    service_call: models.ServiceCall,
    changed_by: str = "system"
) -> Optional[models.ReviewRequest]:
    """
    Automatically create and send a review request when a service call is completed
    
    Args:
        db: Database session
        service_call: Service call that was completed
        changed_by: User who triggered the completion
    
    Returns:
        ReviewRequest if created, None otherwise
    """
    # Only create review request if service call is completed and has customer email
    if service_call.status != 'completed' or not service_call.email:
        return None
    
    # Check if review request already exists for this service call
    existing = await crud_reviews.list_review_requests(
        db,
        tenant_id=service_call.tenant_id,
        service_call_id=service_call.id,
        limit=1
    )
    if existing:
        return None  # Already have a review request
    
    # Create review request
    review_request = await crud_reviews.create_review_request(
        db,
        schemas.ReviewRequestCreate(
            tenant_id=service_call.tenant_id,
            service_call_id=service_call.id,
            customer_name=service_call.customer_name,
            customer_email=service_call.email,
            customer_phone=service_call.phone,
        ),
        changed_by=changed_by
    )
    
    # Send review request email
    await send_review_request(db, review_request)
    
    return review_request


