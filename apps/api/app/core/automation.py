"""
Automation triggers for workflow events
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from typing import Optional
import logging

from .. import models

logger = logging.getLogger(__name__)


async def create_notification(
    db: AsyncSession,
    tenant_id: str,
    notification_type: str,
    title: str,
    message: str,
    entity_type: str = None,
    entity_id: str = None,
    user_id: str = None
):
    """Helper to create a notification"""
    notification = models.Notification(
        tenant_id=tenant_id,
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        read=False
    )
    db.add(notification)
    await db.commit()
    return notification


async def on_job_status_changed(
    db: AsyncSession,
    job: models.Job,
    old_status: str,
    new_status: str,
    changed_by: str
):
    """Triggered when job status changes"""
    try:
        # If job completed, create notification and potentially review request
        if new_status == 'Completed' and old_status != 'Completed':
            # Auto-update completion_date if not set
            if not job.completion_date:
                job.completion_date = datetime.now(timezone.utc).date()
            
            # Create notification for assigned user
            if job.assigned_to:
                user_query = select(models.User).where(
                    models.User.username == job.assigned_to
                )
                result = await db.execute(user_query)
                user = result.scalar_one_or_none()
                
                if user:
                    await create_notification(
                        db,
                        job.tenant_id,
                        'status_change',
                        f'Job Completed: {job.community} - Lot {job.lot_number}',
                        f'The job has been marked as completed.',
                        'job',
                        str(job.id),
                        user.id
                    )
            
            # Check if builder contact exists and create review request
            builder_query = select(models.BuilderContact).where(
                models.BuilderContact.builder_id == job.builder_id
            )
            result = await db.execute(builder_query)
            contacts = result.scalars().all()
            
            if contacts and contacts[0].email:
                # Check if review request already exists
                existing_query = select(models.ReviewRequest).where(
                    models.ReviewRequest.job_id == job.id
                )
                result = await db.execute(existing_query)
                existing = result.scalar_one_or_none()
                
                if not existing:
                    from .. import crud_reviews, schemas
                    try:
                        review_request = await crud_reviews.create_review_request(
                            db,
                            schemas.ReviewRequestCreate(
                                tenant_id=job.tenant_id,
                                job_id=job.id,
                                customer_name=contacts[0].name,
                                customer_email=contacts[0].email,
                                customer_phone=contacts[0].phone
                            ),
                            changed_by=changed_by
                        )
                        logger.info(f"Created review request for completed job {job.id}")
                    except Exception as e:
                        logger.error(f"Error creating review request for job {job.id}: {e}")
                        
    except Exception as e:
        logger.error(f"Error in on_job_status_changed: {e}", exc_info=True)


async def on_service_call_status_changed(
    db: AsyncSession,
    service_call: models.ServiceCall,
    old_status: str,
    new_status: str,
    changed_by: str
):
    """Triggered when service call status changes"""
    try:
        # If service call completed, trigger review request automation
        if new_status == 'Completed' and old_status != 'Completed':
            # Create notification for assigned user
            if service_call.assigned_to:
                user_query = select(models.User).where(
                    models.User.username == service_call.assigned_to
                )
                result = await db.execute(user_query)
                user = result.scalar_one_or_none()
                
                if user:
                    await create_notification(
                        db,
                        service_call.tenant_id,
                        'status_change',
                        f'Service Call Completed: {service_call.customer_name}',
                        f'The service call has been marked as completed.',
                        'service_call',
                        str(service_call.id),
                        user.id
                    )
            
            # Trigger existing automation (creates review request)
            from ..core.service_call_automation import on_service_call_completed
            await on_service_call_completed(db, service_call, changed_by)
            
    except Exception as e:
        logger.error(f"Error in on_service_call_status_changed: {e}", exc_info=True)


async def on_review_received(
    db: AsyncSession,
    review: models.Review,
    changed_by: str
):
    """Triggered when a review is submitted"""
    try:
        # If rating < 3 stars, auto-create recovery ticket
        if review.rating < 3:
            # Check if recovery ticket already exists
            existing_query = select(models.RecoveryTicket).where(
                models.RecoveryTicket.review_id == review.id
            )
            result = await db.execute(existing_query)
            existing = result.scalar_one_or_none()
            
            if not existing:
                from .. import crud_reviews, schemas
                try:
                    recovery_ticket = await crud_reviews.create_recovery_ticket(
                        db,
                        schemas.RecoveryTicketCreate(
                            tenant_id=review.review_request.tenant_id,
                            review_id=review.id,
                            service_call_id=review.review_request.service_call_id,
                            customer_name=review.customer_name,
                            customer_email=review.customer_email,
                            customer_phone=review.review_request.customer_phone,
                            issue_description=f"Low rating received: {review.rating} stars. Review: {review.comment or 'No comment'}"
                        ),
                        changed_by=changed_by
                    )
                    
                    # Notify admins
                    admin_query = select(models.User).where(models.User.role == 'admin')
                    result = await db.execute(admin_query)
                    admins = result.scalars().all()
                    
                    for admin in admins:
                        await create_notification(
                            db,
                            review.review_request.tenant_id,
                            'review_received',
                            f'Low Rating Alert: {review.customer_name}',
                            f'A {review.rating}-star review was received. Recovery ticket created.',
                            'recovery_ticket',
                            str(recovery_ticket.id),
                            admin.id
                        )
                    
                    logger.info(f"Created recovery ticket for low rating review {review.id}")
                except Exception as e:
                    logger.error(f"Error creating recovery ticket for review {review.id}: {e}")
        else:
            # Positive review - notify admins
            admin_query = select(models.User).where(models.User.role == 'admin')
            result = await db.execute(admin_query)
            admins = result.scalars().all()
            
            for admin in admins:
                await create_notification(
                    db,
                    review.review_request.tenant_id,
                    'review_received',
                    f'New Review: {review.customer_name}',
                    f'A {review.rating}-star review was received.',
                    'review',
                    str(review.id),
                    admin.id
                )
                    
    except Exception as e:
        logger.error(f"Error in on_review_received: {e}", exc_info=True)


