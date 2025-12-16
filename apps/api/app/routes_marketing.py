from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from ..db.session import get_session
from ..core.auth import get_current_user
from .. import models
from .schemas_marketing import (
    MarketingChannel as MarketingChannelSchema,
    ChannelAccount as ChannelAccountSchema,
    ChannelAccountCreate,
    ChannelAccountUpdate,
    ContentPost as ContentPostSchema,
    ContentPostCreate,
    ContentPostUpdate,
    MarkPostedRequest,
    MarkFailedRequest,
    QueuePublishRequest,
)

router = APIRouter(prefix="/marketing", tags=["marketing"])


# Helper function for async audit logging
async def write_audit_marketing(
    db: AsyncSession,
    tenant_id: str | None,
    entity_type: str,
    entity_id: UUID,
    action: str,
    changed_by: str,
    field: str | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
):
    """Write audit log entry for marketing module"""
    await db.execute(
        models.AuditLog.__table__.insert().values(
            tenant_id=tenant_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            field=field,
            old_value=old_value,
            new_value=new_value,
            changed_by=changed_by,
        )
    )


# Marketing Channels

@router.get("/channels", response_model=List[MarketingChannelSchema])
async def get_channels(db: AsyncSession = Depends(get_session)):
    """Get all marketing channels"""
    result = await db.execute(select(models.MarketingChannel))
    return result.scalars().all()


# Channel Accounts

@router.get("/channel-accounts", response_model=List[ChannelAccountSchema])
async def get_channel_accounts(
    tenant_id: str = Query(...),
    channel_key: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_session)
):
    """Get channel accounts with filters"""
    query = select(models.ChannelAccount).where(models.ChannelAccount.tenant_id == tenant_id)
    
    if channel_key:
        query = query.join(models.MarketingChannel).where(models.MarketingChannel.key == channel_key)
    
    if status:
        query = query.where(models.ChannelAccount.status == status)
    
    if search:
        query = query.where(
            or_(
                models.ChannelAccount.name.ilike(f"%{search}%"),
                models.ChannelAccount.login_email.ilike(f"%{search}%")
            )
        )
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/channel-accounts", response_model=ChannelAccountSchema)
async def create_channel_account(
    account: ChannelAccountCreate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Create a new channel account"""
    db_account = models.ChannelAccount(**account.model_dump())
    db.add(db_account)
    await db.flush()
    
    await write_audit_marketing(
        db, account.tenant_id, "channel_account", db_account.id, "create", current_user.username
    )
    
    await db.commit()
    await db.refresh(db_account)
    
    return db_account


@router.get("/channel-accounts/{account_id}", response_model=ChannelAccountSchema)
async def get_channel_account(account_id: UUID, db: AsyncSession = Depends(get_session)):
    """Get a specific channel account"""
    result = await db.execute(
        select(models.ChannelAccount).where(models.ChannelAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    return account


@router.patch("/channel-accounts/{account_id}", response_model=ChannelAccountSchema)
async def update_channel_account(
    account_id: UUID,
    account_update: ChannelAccountUpdate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Update a channel account"""
    result = await db.execute(
        select(models.ChannelAccount).where(models.ChannelAccount.id == account_id)
    )
    db_account = result.scalar_one_or_none()
    if not db_account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    update_data = account_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(db_account, field)
        setattr(db_account, field, value)
        await write_audit_marketing(
            db,
            db_account.tenant_id,
            "channel_account",
            db_account.id,
            "update",
            current_user.username,
            field,
            str(old_value) if old_value is not None else None,
            str(value) if value is not None else None,
        )
    
    await db.commit()
    await db.refresh(db_account)
    
    return db_account


@router.delete("/channel-accounts/{account_id}")
async def delete_channel_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Delete a channel account"""
    result = await db.execute(
        select(models.ChannelAccount).where(models.ChannelAccount.id == account_id)
    )
    db_account = result.scalar_one_or_none()
    if not db_account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    tenant_id = db_account.tenant_id
    await write_audit_marketing(
        db, tenant_id, "channel_account", db_account.id, "delete", current_user.username
    )
    
    await db.delete(db_account)
    await db.commit()
    
    return {"message": "Channel account deleted"}


# Content Posts

@router.get("/content-posts", response_model=List[ContentPostSchema])
async def get_content_posts(
    tenant_id: str = Query(...),
    status: Optional[str] = None,
    channel_key: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_session)
):
    """Get content posts with filters"""
    query = select(models.ContentPost).where(models.ContentPost.tenant_id == tenant_id)
    
    if status:
        query = query.where(models.ContentPost.status == status)
    
    if channel_key:
        # For channel_key filter, we need to check if any channel_ids match accounts with that channel
        # This is complex with async, so we'll filter in Python after fetching
        pass  # Will handle after query
    
    if date_from:
        query = query.where(models.ContentPost.scheduled_for >= date_from)
    
    if date_to:
        query = query.where(models.ContentPost.scheduled_for <= date_to)
    
    if search:
        query = query.where(
            or_(
                models.ContentPost.title.ilike(f"%{search}%"),
                models.ContentPost.body_text.ilike(f"%{search}%"),
            )
        )
    
    query = query.order_by(models.ContentPost.scheduled_for.desc())
    
    result = await db.execute(query)
    posts = result.scalars().all()
    
    # Filter by channel_key if specified (post-processing)
    if channel_key:
        # Get channel ID for the key
        channel_result = await db.execute(
            select(models.MarketingChannel).where(models.MarketingChannel.key == channel_key)
        )
        channel = channel_result.scalar_one_or_none()
        if channel:
            # Get account IDs for this channel
            accounts_result = await db.execute(
                select(models.ChannelAccount.id).where(models.ChannelAccount.channel_id == channel.id)
            )
            account_ids = {str(acc_id) for acc_id in accounts_result.scalars().all()}
            # Filter posts that have any matching channel_id
            posts = [p for p in posts if p.channel_ids and any(str(cid) in account_ids for cid in p.channel_ids)]
    
    return posts


@router.post("/content-posts", response_model=ContentPostSchema)
async def create_content_post(
    post: ContentPostCreate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Create a new content post"""
    db_post = models.ContentPost(**post.model_dump())
    db.add(db_post)
    await db.flush()
    
    await write_audit_marketing(
        db, post.tenant_id, "content_post", db_post.id, "create", current_user.username
    )
    
    await db.commit()
    await db.refresh(db_post)
    
    return db_post


@router.get("/content-posts/{post_id}", response_model=ContentPostSchema)
async def get_content_post(post_id: UUID, db: AsyncSession = Depends(get_session)):
    """Get a specific content post"""
    result = await db.execute(
        select(models.ContentPost).where(models.ContentPost.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Content post not found")
    return post


@router.patch("/content-posts/{post_id}", response_model=ContentPostSchema)
async def update_content_post(
    post_id: UUID,
    post_update: ContentPostUpdate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Update a content post"""
    result = await db.execute(
        select(models.ContentPost).where(models.ContentPost.id == post_id)
    )
    db_post = result.scalar_one_or_none()
    if not db_post:
        raise HTTPException(status_code=404, detail="Content post not found")
    
    update_data = post_update.model_dump(exclude_unset=True)
    
    # Validate status transitions
    if 'status' in update_data:
        new_status = update_data['status']
        
        if new_status == 'Needs_Approval' and not (db_post.body_text or db_post.notes):
            raise HTTPException(status_code=400, detail="Body text or notes required for approval")
        
        if new_status == 'Approved' and not db_post.reviewer:
            raise HTTPException(status_code=400, detail="Reviewer required for approval")
        
        if new_status == 'Scheduled' and not db_post.scheduled_for:
            raise HTTPException(status_code=400, detail="Scheduled time required")
        
        if new_status == 'Posted' and not db_post.posted_at:
            update_data['posted_at'] = datetime.utcnow()
    
    for field, value in update_data.items():
        old_value = getattr(db_post, field)
        setattr(db_post, field, value)
        await write_audit_marketing(
            db,
            db_post.tenant_id,
            "content_post",
            db_post.id,
            "update",
            current_user.username,
            field,
            str(old_value) if old_value is not None else None,
            str(value) if value is not None else None,
        )
    
    await db.commit()
    await db.refresh(db_post)
    
    return db_post


@router.delete("/content-posts/{post_id}")
async def delete_content_post(
    post_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Delete a content post"""
    result = await db.execute(
        select(models.ContentPost).where(models.ContentPost.id == post_id)
    )
    db_post = result.scalar_one_or_none()
    if not db_post:
        raise HTTPException(status_code=404, detail="Content post not found")
    
    tenant_id = db_post.tenant_id
    await write_audit_marketing(
        db, tenant_id, "content_post", db_post.id, "delete", current_user.username
    )
    
    await db.delete(db_post)
    await db.commit()
    
    return {"message": "Content post deleted"}


# Calendar View

@router.get("/calendar")
async def get_calendar(
    tenant_id: str = Query(...),
    date_from: datetime = Query(...),
    date_to: datetime = Query(...),
    db: AsyncSession = Depends(get_session)
):
    """Get content posts for calendar view"""
    result = await db.execute(
        select(models.ContentPost).where(
            and_(
                models.ContentPost.tenant_id == tenant_id,
                models.ContentPost.scheduled_for >= date_from,
                models.ContentPost.scheduled_for <= date_to
            )
        ).order_by(models.ContentPost.scheduled_for)
    )
    posts = result.scalars().all()
    
    # Group by date
    calendar_data = {}
    for post in posts:
        if post.scheduled_for:
            date_key = post.scheduled_for.date().isoformat()
            if date_key not in calendar_data:
                calendar_data[date_key] = []
            calendar_data[date_key].append(post)
    
    # Return as array of {date, posts} objects for easier frontend consumption
    return [
        {'date': date, 'posts': posts}
        for date, posts in calendar_data.items()
    ]


# Publishing Actions

@router.post("/content-posts/{post_id}/mark-posted", response_model=ContentPostSchema)
async def mark_post_as_posted(
    post_id: UUID,
    request: MarkPostedRequest,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Mark a post as manually posted"""
    result = await db.execute(
        select(models.ContentPost).where(models.ContentPost.id == post_id)
    )
    db_post = result.scalar_one_or_none()
    if not db_post:
        raise HTTPException(status_code=404, detail="Content post not found")
    
    db_post.status = 'Posted'
    db_post.posted_at = request.posted_at or datetime.utcnow()
    db_post.last_error = None
    
    await write_audit_marketing(
        db, db_post.tenant_id, "content_post", db_post.id, "mark_posted", current_user.username
    )
    
    await db.commit()
    await db.refresh(db_post)
    
    return db_post


@router.post("/content-posts/{post_id}/mark-failed", response_model=ContentPostSchema)
async def mark_post_as_failed(
    post_id: UUID,
    request: MarkFailedRequest,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Mark a post as failed with error"""
    result = await db.execute(
        select(models.ContentPost).where(models.ContentPost.id == post_id)
    )
    db_post = result.scalar_one_or_none()
    if not db_post:
        raise HTTPException(status_code=404, detail="Content post not found")
    
    db_post.status = 'Failed'
    db_post.last_error = request.error
    
    await write_audit_marketing(
        db, db_post.tenant_id, "content_post", db_post.id, "mark_failed", current_user.username
    )
    
    await db.commit()
    await db.refresh(db_post)
    
    return db_post


@router.post("/content-posts/{post_id}/queue-publish")
async def queue_publish(
    post_id: UUID,
    request: QueuePublishRequest,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Queue a post for API publishing (stub for now)"""
    result = await db.execute(
        select(models.ContentPost).where(models.ContentPost.id == post_id)
    )
    db_post = result.scalar_one_or_none()
    if not db_post:
        raise HTTPException(status_code=404, detail="Content post not found")
    
    # Check if any account supports autopost (using first channel for now)
    if not db_post.channel_ids:
        raise HTTPException(status_code=400, detail="No channels assigned to post")
    
    account_result = await db.execute(
        select(models.ChannelAccount).where(models.ChannelAccount.id == db_post.channel_ids[0])
    )
    account = account_result.scalar_one_or_none()
    if not account or not account.oauth_connected:
        raise HTTPException(status_code=400, detail="Account not connected for auto-posting")
    
    # Create publish job (stub - actual publishing would be done by worker)
    job = models.PublishJob(
        tenant_id=db_post.tenant_id,
        content_post_id=db_post.id,
        attempt_no=1,
        method='api',
        provider=account.oauth_provider or 'unknown',
        status='queued'
    )
    db.add(job)
    await db.flush()
    
    await write_audit_marketing(
        db, db_post.tenant_id, "publish_job", job.id, "create", current_user.username
    )
    
    await db.commit()
    
    return {"message": "Post queued for publishing", "job_id": str(job.id)}


# Weekly Scoreboard

@router.get("/scoreboard")
async def get_weekly_scoreboard(
    tenant_id: str = Query(...),
    week_start: datetime = Query(...),
    week_end: datetime = Query(...),
    db: AsyncSession = Depends(get_session)
):
    """Get weekly accountability scoreboard by owner"""
    result = await db.execute(
        select(models.ContentPost).where(
            and_(
                models.ContentPost.tenant_id == tenant_id,
                or_(
                    and_(
                        models.ContentPost.scheduled_for >= week_start,
                        models.ContentPost.scheduled_for <= week_end
                    ),
                    and_(
                        models.ContentPost.created_at >= week_start,
                        models.ContentPost.created_at <= week_end
                    )
                )
            )
        )
    )
    posts = result.scalars().all()
    
    # Group by owner
    scoreboard = {}
    for post in posts:
        owner = post.owner or 'Unassigned'
        if owner not in scoreboard:
            scoreboard[owner] = {
                'owner': owner,
                'planned': 0,
                'posted': 0,
                'missed': 0,
                'failed': 0,
                'canceled': 0,
                'overdue_drafts': 0
            }
        
        # Count planned (created this week or scheduled this week)
        if (post.created_at >= week_start and post.created_at <= week_end) or \
           (post.scheduled_for and post.scheduled_for >= week_start and post.scheduled_for <= week_end):
            scoreboard[owner]['planned'] += 1
        
        # Count by status
        if post.status == 'Posted':
            scoreboard[owner]['posted'] += 1
        elif post.status == 'Failed':
            scoreboard[owner]['failed'] += 1
        elif post.status == 'Canceled':
            scoreboard[owner]['canceled'] += 1
        
        # Check if overdue draft
        if post.status in ['Draft', 'Idea'] and post.draft_due_date:
            if post.draft_due_date < datetime.utcnow():
                scoreboard[owner]['overdue_drafts'] += 1
        
        # Check if missed scheduled post
        if post.status == 'Scheduled' and post.scheduled_for:
            if post.scheduled_for < datetime.utcnow():
                scoreboard[owner]['missed'] += 1
    
    return list(scoreboard.values())


# Audit Trail

@router.get("/audit-trail/{entity_id}")
async def get_audit_trail(
    entity_id: UUID,
    entity_type: str = Query("content_post"),
    db: AsyncSession = Depends(get_session)
):
    """Get audit trail for an entity"""
    result = await db.execute(
        select(models.AuditLog).where(
            and_(
                models.AuditLog.entity_type == entity_type,
                models.AuditLog.entity_id == entity_id
            )
        ).order_by(models.AuditLog.changed_at.desc())
    )
    logs = result.scalars().all()
    
    return [
        {
            'id': str(log.id),
            'action': log.action,
            'field': log.field,
            'old_value': log.old_value,
            'new_value': log.new_value,
            'changed_by': log.changed_by,
            'changed_at': log.changed_at.isoformat()
        }
        for log in logs
    ]
