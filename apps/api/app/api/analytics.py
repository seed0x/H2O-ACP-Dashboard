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
    
    # Jobs stats
    jobs_query = select(models.Job)
    if tenant_id:
        jobs_query = jobs_query.where(models.Job.tenant_id == tenant_id)
    
    jobs_result = await db.execute(jobs_query)
    all_jobs = jobs_result.scalars().all()
    
    active_jobs = [j for j in all_jobs if j.status != 'Completed']
    completed_jobs = [j for j in all_jobs if j.status == 'Completed']
    completed_this_week = [j for j in completed_jobs if j.completion_date and j.completion_date >= week_ago.date()]
    
    # Service calls stats
    sc_query = select(models.ServiceCall)
    if tenant_id:
        sc_query = sc_query.where(models.ServiceCall.tenant_id == tenant_id)
    
    sc_result = await db.execute(sc_query)
    all_service_calls = sc_result.scalars().all()
    
    pending_service_calls = [sc for sc in all_service_calls if sc.status in ['New', 'Scheduled']]
    completed_service_calls = [sc for sc in all_service_calls if sc.status == 'Completed']
    
    # Review stats
    review_requests_query = select(models.ReviewRequest)
    if tenant_id:
        review_requests_query = review_requests_query.where(models.ReviewRequest.tenant_id == tenant_id)
    
    review_requests_result = await db.execute(review_requests_query)
    all_review_requests = review_requests_result.scalars().all()
    
    pending_review_requests = [r for r in all_review_requests if r.status == 'pending']
    sent_review_requests = [r for r in all_review_requests if r.status == 'sent']
    completed_review_requests = [r for r in all_review_requests if r.status == 'completed']
    
    reviews_query = select(models.Review)
    reviews_result = await db.execute(reviews_query)
    all_reviews = reviews_result.scalars().all()
    
    # Filter reviews by tenant through review requests
    if tenant_id:
        all_reviews = [r for r in all_reviews if r.review_request and r.review_request.tenant_id == tenant_id]
    
    public_reviews = [r for r in all_reviews if r.is_public]
    avg_rating = sum(r.rating for r in all_reviews) / len(all_reviews) if all_reviews else 0
    
    # Recovery tickets
    tickets_query = select(models.RecoveryTicket)
    if tenant_id:
        tickets_query = tickets_query.where(models.RecoveryTicket.tenant_id == tenant_id)
    
    tickets_result = await db.execute(tickets_query)
    all_tickets = tickets_result.scalars().all()
    
    open_tickets = [t for t in all_tickets if t.status in ['open', 'in_progress']]
    
    # Calculate metrics
    review_request_rate = len(completed_review_requests) / len(completed_service_calls) if completed_service_calls else 0
    review_completion_rate = len(completed_review_requests) / len(sent_review_requests) if sent_review_requests else 0
    recovery_ticket_rate = len(all_tickets) / len(all_reviews) if all_reviews else 0
    recovery_resolution_rate = len([t for t in all_tickets if t.status in ['resolved', 'closed']]) / len(all_tickets) if all_tickets else 0
    
    return {
        'jobs': {
            'active': len(active_jobs),
            'completed': len(completed_jobs),
            'completed_this_week': len(completed_this_week),
        },
        'service_calls': {
            'pending': len(pending_service_calls),
            'completed': len(completed_service_calls),
        },
        'reviews': {
            'requests_pending': len(pending_review_requests),
            'requests_sent': len(sent_review_requests),
            'requests_completed': len(completed_review_requests),
            'total_reviews': len(all_reviews),
            'public_reviews': len(public_reviews),
            'average_rating': round(avg_rating, 2),
        },
        'recovery_tickets': {
            'open': len(open_tickets),
            'total': len(all_tickets),
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







