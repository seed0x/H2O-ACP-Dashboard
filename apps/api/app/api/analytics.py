"""
Analytics endpoints for business intelligence
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from ..db.session import get_session
from .. import models
from ..core.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get('/overview')
async def get_analytics_overview(
    tenant_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get overview analytics for dashboard"""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Jobs stats - filter in database, not Python
    active_jobs_query = select(func.count(models.Job.id)).where(models.Job.status != 'Completed')
    completed_jobs_query = select(func.count(models.Job.id)).where(models.Job.status == 'Completed')
    completed_this_week_query = select(func.count(models.Job.id)).where(
        and_(
            models.Job.status == 'Completed',
            models.Job.completion_date.isnot(None),
            models.Job.completion_date >= week_ago.date()
        )
    )
    
    if tenant_id:
        active_jobs_query = active_jobs_query.where(models.Job.tenant_id == tenant_id)
        completed_jobs_query = completed_jobs_query.where(models.Job.tenant_id == tenant_id)
        completed_this_week_query = completed_this_week_query.where(models.Job.tenant_id == tenant_id)
    
    active_jobs_count = (await db.execute(active_jobs_query)).scalar() or 0
    completed_jobs_count = (await db.execute(completed_jobs_query)).scalar() or 0
    completed_this_week_count = (await db.execute(completed_this_week_query)).scalar() or 0
    
    # Service calls stats - filter in database
    pending_sc_query = select(func.count(models.ServiceCall.id)).where(
        models.ServiceCall.status.in_(['New', 'Scheduled'])
    )
    completed_sc_query = select(func.count(models.ServiceCall.id)).where(
        models.ServiceCall.status == 'Completed'
    )
    
    if tenant_id:
        pending_sc_query = pending_sc_query.where(models.ServiceCall.tenant_id == tenant_id)
        completed_sc_query = completed_sc_query.where(models.ServiceCall.tenant_id == tenant_id)
    
    pending_service_calls_count = (await db.execute(pending_sc_query)).scalar() or 0
    completed_service_calls_count = (await db.execute(completed_sc_query)).scalar() or 0
    
    # Review stats - filter in database
    pending_rr_query = select(func.count(models.ReviewRequest.id)).where(models.ReviewRequest.status == 'pending')
    sent_rr_query = select(func.count(models.ReviewRequest.id)).where(models.ReviewRequest.status == 'sent')
    completed_rr_query = select(func.count(models.ReviewRequest.id)).where(models.ReviewRequest.status == 'completed')
    
    if tenant_id:
        pending_rr_query = pending_rr_query.where(models.ReviewRequest.tenant_id == tenant_id)
        sent_rr_query = sent_rr_query.where(models.ReviewRequest.tenant_id == tenant_id)
        completed_rr_query = completed_rr_query.where(models.ReviewRequest.tenant_id == tenant_id)
    
    pending_review_requests_count = (await db.execute(pending_rr_query)).scalar() or 0
    sent_review_requests_count = (await db.execute(sent_rr_query)).scalar() or 0
    completed_review_requests_count = (await db.execute(completed_rr_query)).scalar() or 0
    
    # Reviews - join with review_requests for tenant filtering
    reviews_query = select(
        func.count(models.Review.id).label('total'),
        func.count(models.Review.id).filter(models.Review.is_public == True).label('public'),
        func.avg(models.Review.rating).label('avg_rating')
    ).join(models.ReviewRequest, models.Review.review_request_id == models.ReviewRequest.id)
    
    if tenant_id:
        reviews_query = reviews_query.where(models.ReviewRequest.tenant_id == tenant_id)
    
    reviews_stats = (await db.execute(reviews_query)).first()
    all_reviews_count = reviews_stats.total or 0
    public_reviews_count = reviews_stats.public or 0
    avg_rating = float(reviews_stats.avg_rating) if reviews_stats.avg_rating else 0.0
    
    # Recovery tickets - filter in database
    open_tickets_query = select(func.count(models.RecoveryTicket.id)).where(
        models.RecoveryTicket.status.in_(['open', 'in_progress'])
    )
    total_tickets_query = select(func.count(models.RecoveryTicket.id))
    resolved_tickets_query = select(func.count(models.RecoveryTicket.id)).where(
        models.RecoveryTicket.status.in_(['resolved', 'closed'])
    )
    
    if tenant_id:
        open_tickets_query = open_tickets_query.where(models.RecoveryTicket.tenant_id == tenant_id)
        total_tickets_query = total_tickets_query.where(models.RecoveryTicket.tenant_id == tenant_id)
        resolved_tickets_query = resolved_tickets_query.where(models.RecoveryTicket.tenant_id == tenant_id)
    
    open_tickets_count = (await db.execute(open_tickets_query)).scalar() or 0
    all_tickets_count = (await db.execute(total_tickets_query)).scalar() or 0
    resolved_tickets_count = (await db.execute(resolved_tickets_query)).scalar() or 0
    
    # Calculate metrics
    review_request_rate = completed_review_requests_count / completed_service_calls_count if completed_service_calls_count > 0 else 0
    review_completion_rate = completed_review_requests_count / sent_review_requests_count if sent_review_requests_count > 0 else 0
    recovery_ticket_rate = all_tickets_count / all_reviews_count if all_reviews_count > 0 else 0
    recovery_resolution_rate = resolved_tickets_count / all_tickets_count if all_tickets_count > 0 else 0
    
    return {
        'jobs': {
            'active': active_jobs_count,
            'completed': completed_jobs_count,
            'completed_this_week': completed_this_week_count,
        },
        'service_calls': {
            'pending': pending_service_calls_count,
            'completed': completed_service_calls_count,
        },
        'reviews': {
            'requests_pending': pending_review_requests_count,
            'requests_sent': sent_review_requests_count,
            'requests_completed': completed_review_requests_count,
            'total_reviews': all_reviews_count,
            'public_reviews': public_reviews_count,
            'average_rating': round(avg_rating, 2),
        },
        'recovery_tickets': {
            'open': open_tickets_count,
            'total': all_tickets_count,
        },
        'metrics': {
            'review_request_rate': round(review_request_rate, 2),
            'review_completion_rate': round(review_completion_rate, 2),
            'recovery_ticket_rate': round(recovery_ticket_rate, 2),
            'recovery_resolution_rate': round(recovery_resolution_rate, 2),
        }
    }


@router.get('/reviews')
async def get_review_analytics(
    tenant_id: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get review analytics with trends"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Get reviews
    reviews_query = select(models.Review).join(models.ReviewRequest).where(
        models.Review.created_at >= start_date
    )
    if tenant_id:
        reviews_query = reviews_query.where(models.ReviewRequest.tenant_id == tenant_id)
    
    reviews_result = await db.execute(reviews_query)
    reviews = reviews_result.scalars().all()
    
    # Group by week
    weekly_data = {}
    for review in reviews:
        week_start = (review.created_at - timedelta(days=review.created_at.weekday())).date()
        if week_start not in weekly_data:
            weekly_data[week_start] = {'count': 0, 'ratings': []}
        weekly_data[week_start]['count'] += 1
        weekly_data[week_start]['ratings'].append(review.rating)
    
    # Calculate weekly averages
    weekly_trend = []
    for week_start in sorted(weekly_data.keys()):
        week_data = weekly_data[week_start]
        avg_rating = sum(week_data['ratings']) / len(week_data['ratings']) if week_data['ratings'] else 0
        weekly_trend.append({
            'week': week_start.isoformat(),
            'count': week_data['count'],
            'average_rating': round(avg_rating, 2)
        })
    
    # Rating distribution
    rating_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for review in reviews:
        if 1 <= review.rating <= 5:
            rating_dist[review.rating] += 1
    
    # Public vs private
    public_count = len([r for r in reviews if r.is_public])
    private_count = len(reviews) - public_count
    
    return {
        'total_reviews': len(reviews),
        'average_rating': round(sum(r.rating for r in reviews) / len(reviews), 2) if reviews else 0,
        'weekly_trend': weekly_trend,
        'rating_distribution': rating_dist,
        'public_vs_private': {
            'public': public_count,
            'private': private_count
        }
    }


@router.get('/performance')
async def get_performance_analytics(
    tenant_id: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get performance metrics (completion times, win rates)"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Service call completion times
    sc_query = select(models.ServiceCall).where(
        and_(
            models.ServiceCall.status == 'Completed',
            models.ServiceCall.updated_at >= start_date
        )
    )
    if tenant_id:
        sc_query = sc_query.where(models.ServiceCall.tenant_id == tenant_id)
    
    sc_result = await db.execute(sc_query)
    completed_calls = sc_result.scalars().all()
    
    completion_times = []
    for call in completed_calls:
        if call.created_at and call.updated_at:
            duration = (call.updated_at - call.created_at).total_seconds() / 3600  # hours
            completion_times.append(duration)
    
    avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
    
    # Job completion times
    jobs_query = select(models.Job).where(
        and_(
            models.Job.status == 'Completed',
            models.Job.updated_at >= start_date
        )
    )
    if tenant_id:
        jobs_query = jobs_query.where(models.Job.tenant_id == tenant_id)
    
    jobs_result = await db.execute(jobs_query)
    completed_jobs = jobs_result.scalars().all()
    
    job_completion_times = []
    for job in completed_jobs:
        if job.created_at and job.updated_at:
            duration = (job.updated_at - job.created_at).total_seconds() / (24 * 3600)  # days
            job_completion_times.append(duration)
    
    avg_job_completion_time = sum(job_completion_times) / len(job_completion_times) if job_completion_times else 0
    
    # Bid win rate
    bids_query = select(models.Bid).where(models.Bid.created_at >= start_date)
    if tenant_id:
        bids_query = bids_query.where(models.Bid.tenant_id == tenant_id)
    
    bids_result = await db.execute(bids_query)
    all_bids = bids_result.scalars().all()
    
    won_bids = [b for b in all_bids if b.status == 'Won']
    win_rate = len(won_bids) / len(all_bids) if all_bids else 0
    
    return {
        'service_calls': {
            'completed_count': len(completed_calls),
            'average_completion_hours': round(avg_completion_time, 2),
        },
        'jobs': {
            'completed_count': len(completed_jobs),
            'average_completion_days': round(avg_job_completion_time, 2),
        },
        'bids': {
            'total': len(all_bids),
            'won': len(won_bids),
            'win_rate': round(win_rate, 2),
        }
    }







