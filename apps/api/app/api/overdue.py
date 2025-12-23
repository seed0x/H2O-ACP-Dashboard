"""
Overdue tracking endpoints for accountability
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from ..db.session import get_session
from .. import models
from ..core.auth import get_current_user

router = APIRouter()


@router.get('/jobs/overdue')
async def get_overdue_jobs(
    tenant_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get jobs that are past their scheduled_end date and not completed"""
    query = select(models.Job).where(
        and_(
            models.Job.scheduled_end.isnot(None),
            models.Job.scheduled_end < datetime.now(timezone.utc),
            models.Job.status != 'Completed'
        )
    )
    
    if tenant_id:
        query = query.where(models.Job.tenant_id == tenant_id)
    
    result = await db.execute(query)
    jobs = result.scalars().all()
    
    # Calculate days overdue for each job
    overdue_jobs = []
    for job in jobs:
        days_overdue = (datetime.now(timezone.utc) - job.scheduled_end).days
        job_dict = {
            'id': str(job.id),
            'community': job.community,
            'lot_number': job.lot_number,
            'phase': job.phase,
            'status': job.status,
            'scheduled_end': job.scheduled_end.isoformat() if job.scheduled_end else None,
            'assigned_to': job.assigned_to,
            'days_overdue': days_overdue,
            'address_line1': job.address_line1,
            'city': job.city,
        }
        overdue_jobs.append(job_dict)
    
    return sorted(overdue_jobs, key=lambda x: x['days_overdue'], reverse=True)


@router.get('/service-calls/overdue')
async def get_overdue_service_calls(
    tenant_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get service calls that are past their scheduled_end date and not completed"""
    query = select(models.ServiceCall).where(
        and_(
            models.ServiceCall.scheduled_end.isnot(None),
            models.ServiceCall.scheduled_end < datetime.now(timezone.utc),
            models.ServiceCall.status != 'Completed'
        )
    )
    
    if tenant_id:
        query = query.where(models.ServiceCall.tenant_id == tenant_id)
    
    result = await db.execute(query)
    calls = result.scalars().all()
    
    # Calculate days overdue for each call
    overdue_calls = []
    for call in calls:
        days_overdue = (datetime.now(timezone.utc) - call.scheduled_end).days
        call_dict = {
            'id': str(call.id),
            'customer_name': call.customer_name,
            'issue_description': call.issue_description,
            'status': call.status,
            'priority': call.priority,
            'scheduled_end': call.scheduled_end.isoformat() if call.scheduled_end else None,
            'assigned_to': call.assigned_to,
            'days_overdue': days_overdue,
            'address_line1': call.address_line1,
            'city': call.city,
        }
        overdue_calls.append(call_dict)
    
    return sorted(overdue_calls, key=lambda x: x['days_overdue'], reverse=True)


@router.get('/reviews/requests/overdue')
async def get_overdue_review_requests(
    tenant_id: Optional[str] = Query(None, description="Tenant ID filter"),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get review requests that are pending and older than 3 days"""
    three_days_ago = datetime.now(timezone.utc) - timedelta(days=3)
    
    query = select(models.ReviewRequest).where(
        and_(
            models.ReviewRequest.status == 'pending',
            models.ReviewRequest.created_at < three_days_ago
        )
    )
    
    if tenant_id:
        query = query.where(models.ReviewRequest.tenant_id == tenant_id)
    
    result = await db.execute(query)
    requests = result.scalars().all()
    
    # Calculate days since creation
    overdue_requests = []
    for req in requests:
        days_old = (datetime.now(timezone.utc) - req.created_at).days
        req_dict = {
            'id': str(req.id),
            'customer_name': req.customer_name,
            'customer_email': req.customer_email,
            'status': req.status,
            'created_at': req.created_at.isoformat(),
            'days_old': days_old,
            'service_call_id': str(req.service_call_id) if req.service_call_id else None,
            'job_id': str(req.job_id) if req.job_id else None,
        }
        overdue_requests.append(req_dict)
    
    return sorted(overdue_requests, key=lambda x: x['days_old'], reverse=True)


@router.get('/recovery-tickets/overdue')
async def get_overdue_recovery_tickets(
    tenant_id: Optional[str] = Query(None, description="Tenant ID filter"),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get recovery tickets that are open/in_progress and older than 7 days"""
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    conditions = [
        models.RecoveryTicket.status.in_(['open', 'in_progress']),
        models.RecoveryTicket.created_at < seven_days_ago
    ]
    
    if tenant_id:
        conditions.append(models.RecoveryTicket.tenant_id == tenant_id)
    
    query = select(models.RecoveryTicket).where(and_(*conditions))
    
    result = await db.execute(query)
    tickets = result.scalars().all()
    
    # Calculate days old
    overdue_tickets = []
    for ticket in tickets:
        days_old = (datetime.now(timezone.utc) - ticket.created_at).days
        ticket_dict = {
            'id': str(ticket.id),
            'customer_name': ticket.customer_name,
            'issue_description': ticket.issue_description,
            'status': ticket.status,
            'assigned_to': ticket.assigned_to,
            'created_at': ticket.created_at.isoformat(),
            'days_old': days_old,
            'review_id': str(ticket.review_id),
        }
        overdue_tickets.append(ticket_dict)
    
    return sorted(overdue_tickets, key=lambda x: x['days_old'], reverse=True)

