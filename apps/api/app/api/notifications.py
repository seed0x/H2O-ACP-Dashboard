"""
Notification endpoints for in-app alerts
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone

from ..db.session import get_session
from .. import models, schemas
from ..core.auth import get_current_user, CurrentUser

router = APIRouter()


@router.get("", response_model=List[schemas.NotificationOut])
async def list_notifications(
    read: Optional[bool] = Query(None, description="Filter by read status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List notifications for current user"""
    query = select(models.Notification).where(
        or_(
            models.Notification.user_id == current_user.id,
            and_(
                models.Notification.user_id.is_(None),
                models.Notification.tenant_id == current_user.tenant_id
            )
        )
    )
    
    if read is not None:
        query = query.where(models.Notification.read == read)
    
    query = query.order_by(models.Notification.created_at.desc())
    query = query.limit(limit).offset(offset)
    
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    return notifications


@router.get("/unread-count", response_model=schemas.NotificationCount)
async def get_unread_count(
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get count of unread notifications for current user"""
    query = select(models.Notification).where(
        and_(
            or_(
                models.Notification.user_id == current_user.id,
                and_(
                    models.Notification.user_id.is_(None),
                    models.Notification.tenant_id == current_user.tenant_id
                )
            ),
            models.Notification.read == False
        )
    )
    
    result = await db.execute(query)
    count = len(result.scalars().all())
    
    return {"count": count}


@router.post("/{notification_id}/read", response_model=schemas.NotificationOut)
async def mark_notification_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Mark a notification as read"""
    result = await db.execute(
        select(models.Notification).where(
            and_(
                models.Notification.id == notification_id,
                or_(
                    models.Notification.user_id == current_user.id,
                    and_(
                        models.Notification.user_id.is_(None),
                        models.Notification.tenant_id == current_user.tenant_id
                    )
                )
            )
        )
    )
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.read = True
    await db.commit()
    await db.refresh(notification)
    
    return notification


@router.post("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Mark all notifications as read for current user"""
    query = select(models.Notification).where(
        and_(
            or_(
                models.Notification.user_id == current_user.id,
                and_(
                    models.Notification.user_id.is_(None),
                    models.Notification.tenant_id == current_user.tenant_id
                )
            ),
            models.Notification.read == False
        )
    )
    
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    for notification in notifications:
        notification.read = True
    
    await db.commit()
    
    return {"marked_read": len(notifications)}

