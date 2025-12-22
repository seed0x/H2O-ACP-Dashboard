"""
Background tasks for automation
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from datetime import datetime, timezone, timedelta
from typing import List
import logging

from ..db.session import AsyncSessionLocal
from .. import models

logger = logging.getLogger(__name__)


async def topoff_marketing_slots():
    """Top-off marketing post slots for all tenants (runs daily)"""
    try:
        # Import here to avoid circular dependency
        from ..api.marketing_scheduler import topoff_scheduler_logic
        
        async with AsyncSessionLocal() as db:
            # Get all unique tenant_ids from channel_accounts
            tenants_result = await db.execute(
                select(models.ChannelAccount.tenant_id).distinct()
            )
            tenants = [row[0] for row in tenants_result.all()]
            
            for tenant_id in tenants:
                try:
                    # Call the logic function with the db session
                    result = await topoff_scheduler_logic(tenant_id, days=28, db=db)
                    logger.info(f"Marketing slots top-off for {tenant_id}: {result['instances_created']} created, {result['instances_skipped']} skipped")
                except Exception as e:
                    logger.error(f"Error top-off slots for tenant {tenant_id}: {e}", exc_info=True)
                    await db.rollback()
            
    except Exception as e:
        logger.error(f"Error in topoff_marketing_slots: {e}", exc_info=True)


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


async def check_overdue_items():
    """Check for overdue items and create notifications (runs hourly)"""
    try:
        async with AsyncSessionLocal() as db:
            now = datetime.now(timezone.utc)
            
            # Check overdue jobs
            jobs_query = select(models.Job).where(
                and_(
                    models.Job.scheduled_end.isnot(None),
                    models.Job.scheduled_end < now,
                    models.Job.status != 'Completed'
                )
            )
            result = await db.execute(jobs_query)
            overdue_jobs = result.scalars().all()
            
            for job in overdue_jobs:
                days_overdue = (now - job.scheduled_end).days
                # Only notify if assigned to someone
                if job.assigned_to:
                    # Find user by username/name
                    user_query = select(models.User).where(
                        or_(
                            models.User.username == job.assigned_to,
                            models.User.full_name == job.assigned_to
                        )
                    )
                    user_result = await db.execute(user_query)
                    user = user_result.scalar_one_or_none()
                    
                    if user:
                        await create_notification(
                            db,
                            job.tenant_id,
                            'overdue',
                            f'Job Overdue: {job.community} - Lot {job.lot_number}',
                            f'This job is {days_overdue} day(s) overdue. Scheduled end: {job.scheduled_end.strftime("%Y-%m-%d")}',
                            'job',
                            str(job.id),
                            user.id
                        )
            
            # Check overdue service calls
            calls_query = select(models.ServiceCall).where(
                and_(
                    models.ServiceCall.scheduled_end.isnot(None),
                    models.ServiceCall.scheduled_end < now,
                    models.ServiceCall.status != 'Completed'
                )
            )
            result = await db.execute(calls_query)
            overdue_calls = result.scalars().all()
            
            for call in overdue_calls:
                days_overdue = (now - call.scheduled_end).days
                if call.assigned_to:
                    user_query = select(models.User).where(
                        or_(
                            models.User.username == call.assigned_to,
                            models.User.full_name == call.assigned_to
                        )
                    )
                    user_result = await db.execute(user_query)
                    user = user_result.scalar_one_or_none()
                    
                    if user:
                        await create_notification(
                            db,
                            call.tenant_id,
                            'overdue',
                            f'Service Call Overdue: {call.customer_name}',
                            f'This service call is {days_overdue} day(s) overdue. Scheduled end: {call.scheduled_end.strftime("%Y-%m-%d")}',
                            'service_call',
                            str(call.id),
                            user.id
                        )
            
            logger.info(f"Checked overdue items: {len(overdue_jobs)} jobs, {len(overdue_calls)} service calls")
            
    except Exception as e:
        logger.error(f"Error checking overdue items: {e}", exc_info=True)


async def automate_review_requests():
    """Auto-send pending review requests and send reminders (runs every 15 minutes)"""
    try:
        async with AsyncSessionLocal() as db:
            now = datetime.now(timezone.utc)
            one_day_ago = now - timedelta(days=1)
            seven_days_ago = now - timedelta(days=7)
            
            # Auto-send pending requests older than 1 day
            pending_query = select(models.ReviewRequest).where(
                and_(
                    models.ReviewRequest.status == 'pending',
                    models.ReviewRequest.created_at < one_day_ago,
                    models.ReviewRequest.customer_email.isnot(None)
                )
            )
            result = await db.execute(pending_query)
            pending_requests = result.scalars().all()
            
            sent_count = 0
            for request in pending_requests:
                try:
                    from ..core.review_utils import send_review_request
                    success = await send_review_request(db, request)
                    if success:
                        sent_count += 1
                except Exception as e:
                    logger.error(f"Error auto-sending review request {request.id}: {e}")
            
            # Send reminders for requests older than 7 days
            reminder_query = select(models.ReviewRequest).where(
                and_(
                    models.ReviewRequest.status == 'sent',
                    models.ReviewRequest.created_at < seven_days_ago,
                    models.ReviewRequest.reminder_sent == False,
                    models.ReviewRequest.customer_email.isnot(None)
                )
            )
            result = await db.execute(reminder_query)
            reminder_requests = result.scalars().all()
            
            reminder_count = 0
            for request in reminder_requests:
                try:
                    from ..core.review_utils import send_review_reminder
                    success = await send_review_reminder(db, request)
                    if success:
                        reminder_count += 1
                except Exception as e:
                    logger.error(f"Error sending reminder for review request {request.id}: {e}")
            
            logger.info(f"Review automation: {sent_count} sent, {reminder_count} reminders")
            
    except Exception as e:
        logger.error(f"Error automating review requests: {e}", exc_info=True)


async def escalate_stale_items():
    """Auto-escalate items in 'New' status for > 48 hours (runs every 6 hours)"""
    try:
        async with AsyncSessionLocal() as db:
            now = datetime.now(timezone.utc)
            two_days_ago = now - timedelta(hours=48)
            
            # Find stale jobs
            stale_jobs_query = select(models.Job).where(
                and_(
                    models.Job.status == 'New',
                    models.Job.created_at < two_days_ago
                )
            )
            result = await db.execute(stale_jobs_query)
            stale_jobs = result.scalars().all()
            
            # Find stale service calls
            stale_calls_query = select(models.ServiceCall).where(
                and_(
                    models.ServiceCall.status == 'New',
                    models.ServiceCall.created_at < two_days_ago
                )
            )
            result = await db.execute(stale_calls_query)
            stale_calls = result.scalars().all()
            
            # Create notifications for admins/managers
            admin_query = select(models.User).where(models.User.role == 'admin')
            result = await db.execute(admin_query)
            admins = result.scalars().all()
            
            for job in stale_jobs:
                for admin in admins:
                    await create_notification(
                        db,
                        job.tenant_id,
                        'escalation',
                        f'Stale Job: {job.community} - Lot {job.lot_number}',
                        f'This job has been in "New" status for over 48 hours and may need attention.',
                        'job',
                        str(job.id),
                        admin.id
                    )
            
            for call in stale_calls:
                for admin in admins:
                    await create_notification(
                        db,
                        call.tenant_id,
                        'escalation',
                        f'Stale Service Call: {call.customer_name}',
                        f'This service call has been in "New" status for over 48 hours and may need attention.',
                        'service_call',
                        str(call.id),
                        admin.id
                    )
            
            logger.info(f"Escalation check: {len(stale_jobs)} stale jobs, {len(stale_calls)} stale service calls")
            
    except Exception as e:
        logger.error(f"Error escalating stale items: {e}", exc_info=True)


async def daily_summary():
    """Generate daily summary of overdue items (runs at 8 AM)"""
    try:
        async with AsyncSessionLocal() as db:
            # Count overdue items
            now = datetime.now(timezone.utc)
            
            jobs_query = select(models.Job).where(
                and_(
                    models.Job.scheduled_end.isnot(None),
                    models.Job.scheduled_end < now,
                    models.Job.status != 'Completed'
                )
            )
            result = await db.execute(jobs_query)
            overdue_jobs_count = len(result.scalars().all())
            
            calls_query = select(models.ServiceCall).where(
                and_(
                    models.ServiceCall.scheduled_end.isnot(None),
                    models.ServiceCall.scheduled_end < now,
                    models.ServiceCall.status != 'Completed'
                )
            )
            result = await db.execute(calls_query)
            overdue_calls_count = len(result.scalars().all())
            
            # Create summary notification for admins
            admin_query = select(models.User).where(models.User.role == 'admin')
            result = await db.execute(admin_query)
            admins = result.scalars().all()
            
            for admin in admins:
                await create_notification(
                    db,
                    'all_county',  # Default tenant
                    'reminder',
                    'Daily Summary: Overdue Items',
                    f'Today there are {overdue_jobs_count} overdue jobs and {overdue_calls_count} overdue service calls requiring attention.',
                    None,
                    None,
                    admin.id
                )
            
            logger.info(f"Daily summary: {overdue_jobs_count} overdue jobs, {overdue_calls_count} overdue service calls")
            
    except Exception as e:
        logger.error(f"Error generating daily summary: {e}", exc_info=True)

