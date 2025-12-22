"""
Signals API - Aggregates actionable items across Reviews, Marketing, and Dispatch
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from ..db.session import get_session
from ..core.auth import get_current_user
from ..core.signal_config import get_default_owner
from .. import models

router = APIRouter(prefix="/signals", tags=["signals"])


@router.get("/all")
async def get_all_signals(
    tenant_id: str = Query(...),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get all actionable signals across Reviews, Marketing, and Dispatch"""
    signals = []
    
    # Reviews signals
    reviews_signals = await get_reviews_signals(tenant_id, db)
    signals.extend(reviews_signals)
    
    # Marketing signals
    marketing_signals = await get_marketing_signals(tenant_id, db)
    signals.extend(marketing_signals)
    
    # Dispatch signals
    dispatch_signals = await get_dispatch_signals(tenant_id, db)
    signals.extend(dispatch_signals)
    
    return signals


@router.get("/reviews")
async def get_reviews_signals_endpoint(
    tenant_id: str = Query(...),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get review-related signals"""
    return await get_reviews_signals(tenant_id, db)


@router.get("/marketing")
async def get_marketing_signals_endpoint(
    tenant_id: str = Query(...),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get marketing-related signals"""
    return await get_marketing_signals(tenant_id, db)


@router.get("/dispatch")
async def get_dispatch_signals_endpoint(
    tenant_id: str = Query(...),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get dispatch-related signals"""
    return await get_dispatch_signals(tenant_id, db)


async def get_reviews_signals(tenant_id: str, db: AsyncSession) -> List[dict]:
    """Get review-related actionable signals"""
    signals = []
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    
    # Signal 1: Completed service calls with review not requested
    completed_calls_result = await db.execute(
        select(models.ServiceCall).where(
            and_(
                models.ServiceCall.tenant_id == tenant_id,
                models.ServiceCall.status == 'Completed',
                models.ServiceCall.email.isnot(None)
            )
        )
    )
    completed_calls = completed_calls_result.scalars().all()
    
    # Check which ones don't have review requests
    calls_without_reviews = []
    for call in completed_calls:
        review_request_result = await db.execute(
            select(models.ReviewRequest).where(
                models.ReviewRequest.service_call_id == call.id
            )
        )
        if not review_request_result.scalar_one_or_none():
            calls_without_reviews.append(call)
    
    if calls_without_reviews:
        signals.append({
            'id': 'reviews_no_request',
            'type': 'reviews',
            'title': 'Completed Service Calls Need Review Request',
            'count': len(calls_without_reviews),
            'description': f'{len(calls_without_reviews)} completed service call(s) have customer email but no review request has been created.',
            'owner': get_default_owner('reviews_no_request'),
            'priority': 'medium',
            'actions': [
                {
                    'label': 'View Service Calls',
                    'action': 'navigate',
                    'params': {'path': '/service-calls?status=Completed'}
                }
            ],
            'icon': '📧',
            'link': '/service-calls?status=Completed'
        })
    
    # Signal 2: Review requests sent but no response (7+ days)
    old_requests_result = await db.execute(
        select(models.ReviewRequest).where(
            and_(
                models.ReviewRequest.tenant_id == tenant_id,
                models.ReviewRequest.status == 'sent',
                models.ReviewRequest.sent_at.isnot(None),
                models.ReviewRequest.sent_at <= seven_days_ago
            )
        )
    )
    old_requests = old_requests_result.scalars().all()
    
    if old_requests:
        signals.append({
            'id': 'reviews_no_response',
            'type': 'reviews',
            'title': 'Review Requests Awaiting Response',
            'count': len(old_requests),
            'description': f'{len(old_requests)} review request(s) were sent over 7 days ago with no response yet.',
            'owner': get_default_owner('reviews_no_response'),
            'priority': 'low',
            'actions': [
                {
                    'label': 'View Requests',
                    'action': 'navigate',
                    'params': {'path': '/review-requests'}
                }
            ],
            'icon': '⏳',
            'link': '/review-requests'
        })
    
    # Signal 3: Needs recovery (1-3 star reviews)
    low_rated_reviews_result = await db.execute(
        select(models.Review)
        .join(models.ReviewRequest, models.Review.review_request_id == models.ReviewRequest.id)
        .where(
            and_(
                models.ReviewRequest.tenant_id == tenant_id,
                models.Review.rating.in_([1, 2, 3])
            )
        )
    )
    low_rated_reviews = low_rated_reviews_result.scalars().all()
    
    # Check which ones don't have recovery tickets
    reviews_needing_recovery = []
    for review in low_rated_reviews:
        ticket_result = await db.execute(
            select(models.RecoveryTicket).where(
                models.RecoveryTicket.review_id == review.id
            )
        )
        if not ticket_result.scalar_one_or_none():
            reviews_needing_recovery.append(review)
    
    if reviews_needing_recovery:
        signals.append({
            'id': 'reviews_needs_recovery',
            'type': 'reviews',
            'title': 'Low-Rated Reviews Need Recovery',
            'count': len(reviews_needing_recovery),
            'description': f'{len(reviews_needing_recovery)} review(s) with 1-3 stars need recovery ticket creation.',
            'owner': get_default_owner('reviews_needs_recovery'),
            'priority': 'high',
            'actions': [
                {
                    'label': 'View Reviews',
                    'action': 'navigate',
                    'params': {'path': '/reviews'}
                }
            ],
            'icon': '⚠️',
            'link': '/reviews'
        })
    
    return signals


async def get_marketing_signals(tenant_id: str, db: AsyncSession) -> List[dict]:
    """Get marketing-related actionable signals"""
    signals = []
    now = datetime.now(timezone.utc)
    three_days_from_now = now + timedelta(hours=72)
    
    # Signal 1: Posts scheduled in next 72h but not ready
    # A post is "not ready" if it's Scheduled status but missing caption or scheduled_for
    upcoming_instances_result = await db.execute(
        select(models.PostInstance)
        .where(
            and_(
                models.PostInstance.tenant_id == tenant_id,
                models.PostInstance.scheduled_for.isnot(None),
                models.PostInstance.scheduled_for >= now,
                models.PostInstance.scheduled_for <= three_days_from_now,
                or_(
                    models.PostInstance.status == 'Scheduled',
                    models.PostInstance.status == 'Draft'
                )
            )
        )
        .options(
            joinedload(models.PostInstance.content_item),
            joinedload(models.PostInstance.channel_account)
        )
    )
    upcoming_instances = upcoming_instances_result.unique().scalars().all()
    
    not_ready = []
    for instance in upcoming_instances:
        content_item = instance.content_item
        has_caption = (instance.caption_override or content_item.base_caption)
        has_scheduled = instance.scheduled_for is not None
        
        # Scheduled status requires both caption and datetime
        if instance.status == 'Scheduled' and (not has_caption or not has_scheduled):
            not_ready.append(instance)
        # Draft status is fine, but if it has scheduled_for, it should probably be Scheduled
        elif instance.status == 'Draft' and has_scheduled and has_caption:
            not_ready.append(instance)
    
    if not_ready:
        # Get owner from content item if available
        content_owner = None
        if not_ready:
            first_item = not_ready[0].content_item
            content_owner = first_item.owner if first_item else None
        
        signals.append({
            'id': 'marketing_not_ready',
            'type': 'marketing',
            'title': 'Posts Scheduled Soon But Not Ready',
            'count': len(not_ready),
            'description': f'{len(not_ready)} post(s) scheduled in the next 72 hours are missing required information (caption or schedule).',
            'owner': get_default_owner('marketing_not_ready', content_owner),
            'priority': 'high',
            'actions': [
                {
                    'label': 'View Calendar',
                    'action': 'navigate',
                    'params': {'path': '/marketing?tab=calendar'}
                }
            ],
            'icon': '⏰',
            'link': '/marketing?tab=calendar'
        })
    
    # Signal 2: Posts past scheduled time not marked Posted
    past_due_result = await db.execute(
        select(models.PostInstance)
        .where(
            and_(
                models.PostInstance.tenant_id == tenant_id,
                models.PostInstance.scheduled_for.isnot(None),
                models.PostInstance.scheduled_for < now,
                models.PostInstance.status.in_(['Scheduled', 'Draft'])
            )
        )
        .options(
            joinedload(models.PostInstance.content_item),
            joinedload(models.PostInstance.channel_account)
        )
    )
    past_due = past_due_result.unique().scalars().all()
    
    if past_due:
        # Get owner from content item if available
        content_owner = None
        if past_due:
            first_item = past_due[0].content_item
            content_owner = first_item.owner if first_item else None
        
        signals.append({
            'id': 'marketing_past_due',
            'type': 'marketing',
            'title': 'Posts Past Scheduled Time Not Posted',
            'count': len(past_due),
            'description': f'{len(past_due)} post(s) were scheduled for a time that has passed but are not marked as Posted.',
            'owner': get_default_owner('marketing_past_due', content_owner),
            'priority': 'high',
            'actions': [
                {
                    'label': 'View Calendar',
                    'action': 'navigate',
                    'params': {'path': '/marketing?tab=calendar'}
                }
            ],
            'icon': '🚨',
            'link': '/marketing?tab=calendar'
        })
    
    # Signal 3: Needs approval (ContentItems in "Needs Approval" status)
    needs_approval_result = await db.execute(
        select(models.ContentItem).where(
            and_(
                models.ContentItem.tenant_id == tenant_id,
                models.ContentItem.status == 'Needs Approval'
            )
        )
    )
    needs_approval = needs_approval_result.scalars().all()
    
    if needs_approval:
        signals.append({
            'id': 'marketing_needs_approval',
            'type': 'marketing',
            'title': 'Content Items Need Approval',
            'count': len(needs_approval),
            'description': f'{len(needs_approval)} content item(s) are waiting for approval before they can be scheduled.',
            'owner': get_default_owner('marketing_needs_approval'),
            'priority': 'medium',
            'actions': [
                {
                    'label': 'View Posts',
                    'action': 'navigate',
                    'params': {'path': '/marketing?tab=posts&status=Needs Approval'}
                }
            ],
            'icon': '✋',
            'link': '/marketing?tab=posts&status=Needs Approval'
        })
    
    return signals


async def get_dispatch_signals(tenant_id: str, db: AsyncSession) -> List[dict]:
    """Get dispatch-related actionable signals"""
    signals = []
    now = datetime.now(timezone.utc)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # Signal 1: Unscheduled service calls
    unscheduled_calls_result = await db.execute(
        select(models.ServiceCall).where(
            and_(
                models.ServiceCall.tenant_id == tenant_id,
                models.ServiceCall.status.in_(['New', 'Scheduled']),
                or_(
                    models.ServiceCall.scheduled_start.is_(None),
                    models.ServiceCall.scheduled_start > today_end
                )
            )
        )
    )
    unscheduled_calls = unscheduled_calls_result.scalars().all()
    
    if unscheduled_calls:
        signals.append({
            'id': 'dispatch_unscheduled_calls',
            'type': 'dispatch',
            'title': 'Service Calls Need Scheduling',
            'count': len(unscheduled_calls),
            'description': f'{len(unscheduled_calls)} service call(s) are new or scheduled but have no start time set for today.',
            'owner': get_default_owner('dispatch_unscheduled_calls'),
            'priority': 'high',
            'actions': [
                {
                    'label': 'View Service Calls',
                    'action': 'navigate',
                    'params': {'path': '/service-calls'}
                }
            ],
            'icon': '📅',
            'link': '/service-calls'
        })
    
    # Signal 2: Jobs without assigned tech
    unassigned_jobs_result = await db.execute(
        select(models.Job).where(
            and_(
                models.Job.tenant_id == tenant_id,
                models.Job.status != 'Completed',
                or_(
                    models.Job.tech_name.is_(None),
                    models.Job.tech_name == ''
                )
            )
        )
    )
    unassigned_jobs = unassigned_jobs_result.scalars().all()
    
    if unassigned_jobs:
        signals.append({
            'id': 'dispatch_unassigned_jobs',
            'type': 'dispatch',
            'title': 'Jobs Without Assigned Tech',
            'count': len(unassigned_jobs),
            'description': f'{len(unassigned_jobs)} active job(s) do not have a tech assigned.',
            'owner': get_default_owner('dispatch_unassigned_jobs'),
            'priority': 'medium',
            'actions': [
                {
                    'label': 'View Jobs',
                    'action': 'navigate',
                    'params': {'path': '/jobs'}
                }
            ],
            'icon': '👤',
            'link': '/jobs'
        })
    
    # Signal 3: Today's jobs by tech (grouped)
    today_jobs_result = await db.execute(
        select(models.Job).where(
            and_(
                models.Job.tenant_id == tenant_id,
                models.Job.scheduled_start.isnot(None),
                models.Job.scheduled_start >= today_start,
                models.Job.scheduled_start < today_end,
                models.Job.status != 'Completed'
            )
        )
    )
    today_jobs = today_jobs_result.scalars().all()
    
    if today_jobs:
        # Group by tech
        jobs_by_tech: dict[str, list] = {}
        for job in today_jobs:
            tech = job.tech_name or 'Unassigned'
            if tech not in jobs_by_tech:
                jobs_by_tech[tech] = []
            jobs_by_tech[tech].append(job)
        
        # Create signal for each tech with multiple jobs
        for tech, jobs in jobs_by_tech.items():
            if len(jobs) > 0:
                signals.append({
                    'id': f'dispatch_today_tech_{tech}',
                    'type': 'dispatch',
                    'title': f"Today's Jobs - {tech}",
                    'count': len(jobs),
                    'description': f'{len(jobs)} job(s) scheduled for today for {tech}.',
                    'owner': tech,
                    'priority': 'medium',
                    'actions': [
                        {
                            'label': 'View Jobs',
                            'action': 'navigate',
                            'params': {'path': '/jobs'}
                        }
                    ],
                    'icon': '📋',
                    'link': '/jobs'
                })
    
    return signals

