"""
Tech Stats API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import Optional
from datetime import datetime, timedelta

from ..db.session import get_session
from .. import models
from ..core.auth import get_current_user, CurrentUser

router = APIRouter(prefix="/tech-stats", tags=["tech-stats"])


@router.get("/all")
async def get_all_tech_stats(
    tenant_id: Optional[str] = Query('h2o'),
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get stats for all tech users"""
    
    # Verify tenant access if user has tenant_id
    if current_user.tenant_id and tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied to this tenant's data")
    
    # Validate tenant_id
    if not tenant_id or tenant_id.strip() == '':
        raise HTTPException(status_code=400, detail="tenant_id is required")
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Get all unique tech usernames from service calls (include scheduled calls, not just created_at)
    techs_query = select(models.ServiceCall.assigned_to).where(
        and_(
            models.ServiceCall.tenant_id == tenant_id,
            models.ServiceCall.assigned_to.isnot(None),
            or_(
                models.ServiceCall.created_at >= start_date,
                models.ServiceCall.scheduled_start >= start_date
            )
        )
    ).distinct()
    techs_result = await db.execute(techs_query)
    tech_usernames = [row[0] for row in techs_result.all() if row[0]]
    
    if not tech_usernames:
        return []
    
    stats_list = []
    
    for username in tech_usernames:
        # Get completed service calls count
        completed_sc_query = select(func.count(models.ServiceCall.id)).where(
            and_(
                models.ServiceCall.assigned_to == username,
                models.ServiceCall.tenant_id == tenant_id,
                models.ServiceCall.status == 'Completed',
                or_(
                    models.ServiceCall.created_at >= start_date,
                    models.ServiceCall.scheduled_start >= start_date
                )
            )
        )
        completed_result = await db.execute(completed_sc_query)
        completed = completed_result.scalar() or 0
        
        # Get scheduled service calls count (upcoming work)
        scheduled_sc_query = select(func.count(models.ServiceCall.id)).where(
            and_(
                models.ServiceCall.assigned_to == username,
                models.ServiceCall.tenant_id == tenant_id,
                models.ServiceCall.status == 'Scheduled',
                models.ServiceCall.scheduled_start >= start_date
            )
        )
        scheduled_result = await db.execute(scheduled_sc_query)
        scheduled = scheduled_result.scalar() or 0
        
        # Get sold count (bids won linked to service calls assigned to this tech)
        sold_query = select(func.count(models.Bid.id)).select_from(
            models.ServiceCallWorkflow
        ).join(
            models.ServiceCall,
            models.ServiceCallWorkflow.service_call_id == models.ServiceCall.id
        ).join(
            models.Bid,
            models.ServiceCallWorkflow.bid_id == models.Bid.id
        ).where(
            and_(
                models.ServiceCall.assigned_to == username,
                models.ServiceCall.tenant_id == tenant_id,
                models.Bid.status == 'Won',
                models.Bid.created_at >= start_date
            )
        )
        sold_result = await db.execute(sold_query)
        sold = sold_result.scalar() or 0
        
        # Get lost count (bids lost linked to service calls assigned to this tech)
        lost_query = select(func.count(models.Bid.id)).select_from(
            models.ServiceCallWorkflow
        ).join(
            models.ServiceCall,
            models.ServiceCallWorkflow.service_call_id == models.ServiceCall.id
        ).join(
            models.Bid,
            models.ServiceCallWorkflow.bid_id == models.Bid.id
        ).where(
            and_(
                models.ServiceCall.assigned_to == username,
                models.ServiceCall.tenant_id == tenant_id,
                models.Bid.status == 'Lost',
                models.Bid.created_at >= start_date
            )
        )
        lost_result = await db.execute(lost_query)
        lost = lost_result.scalar() or 0
        
        # Calculate conversion rate (handle division by zero)
        conversion_rate = None
        total_outcomes = sold + lost
        if total_outcomes > 0:
            conversion_rate = round((sold / total_outcomes) * 100, 1)
        elif sold > 0 and lost == 0:
            conversion_rate = 100.0  # All outcomes were wins
        elif lost > 0 and sold == 0:
            conversion_rate = 0.0  # All outcomes were losses
        
        stats_list.append({
            "username": username,
            "completed": completed,
            "scheduled": scheduled,
            "sold": sold,
            "lost": lost,
            "conversion_rate": conversion_rate,
            "total_outcomes": total_outcomes
        })
    
    # Sort by scheduled + completed count (descending)
    stats_list.sort(key=lambda x: (x["scheduled"] + x["completed"]), reverse=True)
    
    return stats_list


@router.get("/{username}")
async def get_tech_stats(
    username: str,
    tenant_id: Optional[str] = Query('h2o'),
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get stats for a specific tech user"""
    
    # Verify tenant access if user has tenant_id
    if current_user.tenant_id and tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied to this tenant's data")
    
    # Validate inputs
    if not username or username.strip() == '':
        raise HTTPException(status_code=400, detail="username is required")
    
    if not tenant_id or tenant_id.strip() == '':
        raise HTTPException(status_code=400, detail="tenant_id is required")
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Get completed service calls count
    completed_sc_query = select(func.count(models.ServiceCall.id)).where(
        and_(
            models.ServiceCall.assigned_to == username,
            models.ServiceCall.tenant_id == tenant_id,
            models.ServiceCall.status == 'Completed',
            models.ServiceCall.created_at >= start_date
        )
    )
    completed_result = await db.execute(completed_sc_query)
    completed = completed_result.scalar() or 0
    
    # Get sold count (bids won linked to service calls assigned to this tech)
    sold_query = select(func.count(models.Bid.id)).select_from(
        models.ServiceCallWorkflow
    ).join(
        models.ServiceCall,
        models.ServiceCallWorkflow.service_call_id == models.ServiceCall.id
    ).join(
        models.Bid,
        models.ServiceCallWorkflow.bid_id == models.Bid.id
    ).where(
        and_(
            models.ServiceCall.assigned_to == username,
            models.ServiceCall.tenant_id == tenant_id,
            models.Bid.status == 'Won',
            models.Bid.created_at >= start_date
        )
    )
    sold_result = await db.execute(sold_query)
    sold = sold_result.scalar() or 0
    
    # Get lost count (bids lost linked to service calls assigned to this tech)
    lost_query = select(func.count(models.Bid.id)).select_from(
        models.ServiceCallWorkflow
    ).join(
        models.ServiceCall,
        models.ServiceCallWorkflow.service_call_id == models.ServiceCall.id
    ).join(
        models.Bid,
        models.ServiceCallWorkflow.bid_id == models.Bid.id
    ).where(
        and_(
            models.ServiceCall.assigned_to == username,
            models.ServiceCall.tenant_id == tenant_id,
            models.Bid.status == 'Lost',
            models.Bid.created_at >= start_date
        )
    )
    lost_result = await db.execute(lost_query)
    lost = lost_result.scalar() or 0
    
    # Calculate conversion rate (handle division by zero)
    conversion_rate = None
    total_outcomes = sold + lost
    if total_outcomes > 0:
        conversion_rate = round((sold / total_outcomes) * 100, 1)
    elif sold > 0 and lost == 0:
        conversion_rate = 100.0  # All outcomes were wins
    elif lost > 0 and sold == 0:
        conversion_rate = 0.0  # All outcomes were losses
    
    return {
        "username": username,
        "period_days": days,
        "completed": completed,
        "sold": sold,
        "lost": lost,
        "conversion_rate": conversion_rate,
        "total_outcomes": total_outcomes
    }

