from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
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
    ContentItem as ContentItemSchema,
    ContentItemCreate,
    ContentItemUpdate,
    PostInstance as PostInstanceSchema,
    PostInstanceCreate,
    PostInstanceUpdate,
    CreatePostInstancesRequest,
    MarkPostInstancePostedRequest,
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
async def get_channels(
    tenant_id: Optional[str] = Query(None),  # Frontend sends this but we don't need it
    db: AsyncSession = Depends(get_session)
):
    """Get all marketing channels (reference list for creating accounts)"""
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


# Calendar View

@router.get("/calendar")
async def get_calendar(
    tenant_id: str = Query(...),
    date_from: datetime = Query(...),
    date_to: datetime = Query(...),
    db: AsyncSession = Depends(get_session)
):
    """Get post instances for calendar view"""
    result = await db.execute(
        select(models.PostInstance)
        .options(
            selectinload(models.PostInstance.content_item),
            selectinload(models.PostInstance.channel_account)
        )
        .where(
            and_(
                models.PostInstance.tenant_id == tenant_id,
                models.PostInstance.scheduled_for >= date_from,
                models.PostInstance.scheduled_for <= date_to
            )
        )
        .order_by(models.PostInstance.scheduled_for)
    )
    instances = result.scalars().all()
    
    # Group by date
    calendar_data = {}
    for instance in instances:
        if instance.scheduled_for:
            date_key = instance.scheduled_for.date().isoformat()
            if date_key not in calendar_data:
                calendar_data[date_key] = []
            calendar_data[date_key].append(instance)
    
    # Return as array of {date, instances} objects for easier frontend consumption
    return [
        {'date': date, 'instances': instances}
        for date, instances in calendar_data.items()
    ]


# Weekly Scoreboard

@router.get("/scoreboard")
async def get_weekly_scoreboard(
    tenant_id: str = Query(...),
    week_start: datetime = Query(...),
    week_end: datetime = Query(...),
    db: AsyncSession = Depends(get_session)
):
    """Get weekly accountability scoreboard by owner (using post instances)"""
    # Get post instances in the date range
    instances_result = await db.execute(
        select(models.PostInstance).where(
            and_(
                models.PostInstance.tenant_id == tenant_id,
                or_(
                    and_(
                        models.PostInstance.scheduled_for >= week_start,
                        models.PostInstance.scheduled_for <= week_end
                    ),
                    and_(
                        models.PostInstance.created_at >= week_start,
                        models.PostInstance.created_at <= week_end
                    )
                )
            )
        )
    )
    instances = instances_result.scalars().all()
    
    # Get content items for owner information
    content_item_ids = {instance.content_item_id for instance in instances}
    if content_item_ids:
        items_result = await db.execute(
            select(models.ContentItem).where(models.ContentItem.id.in_(content_item_ids))
        )
        items = {item.id: item for item in items_result.scalars().all()}
    else:
        items = {}
    
    # Group by owner
    scoreboard = {}
    for instance in instances:
        content_item = items.get(instance.content_item_id)
        if not content_item:
            continue
        
        owner = content_item.owner or 'Unassigned'
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
        if (instance.created_at >= week_start and instance.created_at <= week_end) or \
           (instance.scheduled_for and instance.scheduled_for >= week_start and instance.scheduled_for <= week_end):
            scoreboard[owner]['planned'] += 1
        
        # Count by status
        if instance.status == 'Posted':
            scoreboard[owner]['posted'] += 1
        elif instance.status == 'Failed':
            scoreboard[owner]['failed'] += 1
        
        # Check if missed scheduled post
        if instance.status == 'Scheduled' and instance.scheduled_for:
            if instance.scheduled_for < datetime.utcnow():
                scoreboard[owner]['missed'] += 1
    
    # Also count overdue drafts from content items
    items_result = await db.execute(
        select(models.ContentItem).where(
            and_(
                models.ContentItem.tenant_id == tenant_id,
                models.ContentItem.status.in_(['Idea', 'Draft']),
                models.ContentItem.draft_due_date < datetime.utcnow()
            )
        )
    )
    overdue_items = items_result.scalars().all()
    for item in overdue_items:
        owner = item.owner or 'Unassigned'
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
        scoreboard[owner]['overdue_drafts'] += 1
    
    return list(scoreboard.values())


# Audit Trail

@router.get("/audit-trail/{entity_id}")
async def get_audit_trail(
    entity_id: UUID,
    entity_type: str = Query("content_item"),
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


# Content Items

@router.get("/content-items", response_model=List[ContentItemSchema])
async def get_content_items(
    tenant_id: str = Query(...),
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_session)
):
    """Get content items with filters"""
    query = select(models.ContentItem).where(models.ContentItem.tenant_id == tenant_id)
    
    if status:
        query = query.where(models.ContentItem.status == status)
    
    if search:
        query = query.where(
            or_(
                models.ContentItem.title.ilike(f"%{search}%"),
                models.ContentItem.base_caption.ilike(f"%{search}%"),
            )
        )
    
    query = query.order_by(models.ContentItem.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/content-items", response_model=ContentItemSchema)
async def create_content_item(
    item: ContentItemCreate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Create a new content item"""
    db_item = models.ContentItem(**item.model_dump())
    db.add(db_item)
    await db.flush()
    
    await write_audit_marketing(
        db, item.tenant_id, "content_item", db_item.id, "create", current_user.username
    )
    
    await db.commit()
    await db.refresh(db_item)
    
    return db_item


@router.get("/content-items/{item_id}", response_model=ContentItemSchema)
async def get_content_item(item_id: UUID, db: AsyncSession = Depends(get_session)):
    """Get a specific content item"""
    result = await db.execute(
        select(models.ContentItem).where(models.ContentItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")
    return item


@router.patch("/content-items/{item_id}", response_model=ContentItemSchema)
async def update_content_item(
    item_id: UUID,
    item_update: ContentItemUpdate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Update a content item"""
    result = await db.execute(
        select(models.ContentItem).where(models.ContentItem.id == item_id)
    )
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Content item not found")
    
    update_data = item_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        old_value = getattr(db_item, field)
        setattr(db_item, field, value)
        await write_audit_marketing(
            db,
            db_item.tenant_id,
            "content_item",
            db_item.id,
            "update",
            current_user.username,
            field,
            str(old_value) if old_value is not None else None,
            str(value) if value is not None else None,
        )
    
    await db.commit()
    await db.refresh(db_item)
    
    return db_item


@router.delete("/content-items/{item_id}")
async def delete_content_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Delete a content item"""
    result = await db.execute(
        select(models.ContentItem).where(models.ContentItem.id == item_id)
    )
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Content item not found")
    
    tenant_id = db_item.tenant_id
    await write_audit_marketing(
        db, tenant_id, "content_item", db_item.id, "delete", current_user.username
    )
    
    await db.delete(db_item)
    await db.commit()
    
    return {"message": "Content item deleted"}


# Content Posts (aliases for content-items to match frontend)
# The frontend uses "content-posts" but the API uses "content-items"
# These endpoints provide compatibility

@router.get("/content-posts/{item_id}", response_model=ContentItemSchema)
async def get_content_post(item_id: UUID, db: AsyncSession = Depends(get_session)):
    """Get a content post (alias for content-item)"""
    result = await db.execute(
        select(models.ContentItem).where(models.ContentItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Content post not found")
    return item

@router.patch("/content-posts/{item_id}", response_model=ContentItemSchema)
async def update_content_post(
    item_id: UUID,
    item_update: ContentItemUpdate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Update a content post (alias for content-item)"""
    result = await db.execute(
        select(models.ContentItem).where(models.ContentItem.id == item_id)
    )
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Content post not found")
    
    update_data = item_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(db_item, field)
        setattr(db_item, field, value)
        await write_audit_marketing(
            db,
            db_item.tenant_id,
            "content_item",
            db_item.id,
            "update",
            current_user.username,
            field,
            str(old_value) if old_value is not None else None,
            str(value) if value is not None else None,
        )
    
    await db.commit()
    await db.refresh(db_item)
    
    return db_item

@router.post("/content-posts/{item_id}/mark-posted")
async def mark_content_post_posted(
    item_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Mark all post instances for a content item as posted"""
    # Get the content item
    item_result = await db.execute(
        select(models.ContentItem).where(models.ContentItem.id == item_id)
    )
    db_item = item_result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Content post not found")
    
    # Get all post instances for this content item
    instances_result = await db.execute(
        select(models.PostInstance).where(models.PostInstance.content_item_id == item_id)
    )
    instances = instances_result.scalars().all()
    
    # Mark all instances as posted
    for instance in instances:
        if instance.status != 'Posted':
            instance.status = 'Posted'
            instance.posted_at = datetime.utcnow()
            instance.posted_manually = True
            await write_audit_marketing(
                db, instance.tenant_id, "post_instance", instance.id, "mark_posted", current_user.username
            )
    
    # Update content item status if all instances are posted
    if instances and all(inst.status == 'Posted' for inst in instances):
        db_item.status = 'Posted'
        await write_audit_marketing(
            db, db_item.tenant_id, "content_item", db_item.id, "mark_posted", current_user.username
        )
    
    await db.commit()
    return {"message": "Content post marked as posted", "instances_updated": len(instances)}

@router.post("/content-posts/{item_id}/mark-failed")
async def mark_content_post_failed(
    item_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Mark all post instances for a content item as failed"""
    # Get the content item
    item_result = await db.execute(
        select(models.ContentItem).where(models.ContentItem.id == item_id)
    )
    db_item = item_result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Content post not found")
    
    # Get all post instances for this content item
    instances_result = await db.execute(
        select(models.PostInstance).where(models.PostInstance.content_item_id == item_id)
    )
    instances = instances_result.scalars().all()
    
    # Mark all instances as failed
    for instance in instances:
        if instance.status != 'Failed':
            instance.status = 'Failed'
            instance.last_error = "Manually marked as failed"
            await write_audit_marketing(
                db, instance.tenant_id, "post_instance", instance.id, "mark_failed", current_user.username
            )
    
    # Update content item status
    db_item.status = 'Failed'
    await write_audit_marketing(
        db, db_item.tenant_id, "content_item", db_item.id, "mark_failed", current_user.username
    )
    
    await db.commit()
    return {"message": "Content post marked as failed", "instances_updated": len(instances)}


# Post Instances

@router.get("/post-instances", response_model=List[PostInstanceSchema])
async def get_post_instances(
    tenant_id: str = Query(...),
    content_item_id: Optional[UUID] = None,
    channel_account_id: Optional[UUID] = None,
    status: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: AsyncSession = Depends(get_session)
):
    """Get post instances with filters"""
    query = select(models.PostInstance).where(models.PostInstance.tenant_id == tenant_id)
    
    if content_item_id:
        query = query.where(models.PostInstance.content_item_id == content_item_id)
    
    if channel_account_id:
        query = query.where(models.PostInstance.channel_account_id == channel_account_id)
    
    if status:
        query = query.where(models.PostInstance.status == status)
    
    if date_from:
        query = query.where(models.PostInstance.scheduled_for >= date_from)
    
    if date_to:
        query = query.where(models.PostInstance.scheduled_for <= date_to)
    
    query = query.order_by(models.PostInstance.scheduled_for.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/post-instances", response_model=PostInstanceSchema)
async def create_post_instance(
    instance: PostInstanceCreate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Create a new post instance"""
    db_instance = models.PostInstance(**instance.model_dump())
    db.add(db_instance)
    await db.flush()
    
    await write_audit_marketing(
        db, instance.tenant_id, "post_instance", db_instance.id, "create", current_user.username
    )
    
    await db.commit()
    await db.refresh(db_instance)
    
    return db_instance


@router.post("/post-instances/bulk-create", response_model=List[PostInstanceSchema])
async def create_post_instances_bulk(
    request: CreatePostInstancesRequest,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Create multiple post instances from a content item and selected accounts"""
    # Verify content item exists
    content_item_result = await db.execute(
        select(models.ContentItem).where(models.ContentItem.id == request.content_item_id)
    )
    content_item = content_item_result.scalar_one_or_none()
    if not content_item:
        raise HTTPException(status_code=404, detail="Content item not found")
    
    # Verify all channel accounts exist
    accounts_result = await db.execute(
        select(models.ChannelAccount).where(
            models.ChannelAccount.id.in_(request.channel_account_ids)
        )
    )
    accounts = accounts_result.scalars().all()
    if len(accounts) != len(request.channel_account_ids):
        raise HTTPException(status_code=404, detail="One or more channel accounts not found")
    
    # Create post instances
    # Enforce rules: If scheduled_for is provided, check if caption exists
    # If both exist, set status to Scheduled, otherwise Draft
    instances = []
    has_caption = bool(content_item.base_caption)
    has_scheduled = bool(request.scheduled_for)
    
    for account_id in request.channel_account_ids:
        # Determine status: Scheduled requires both caption and datetime
        instance_status = 'Scheduled' if (has_caption and has_scheduled) else 'Draft'
        
        instance = models.PostInstance(
            tenant_id=content_item.tenant_id,
            content_item_id=request.content_item_id,
            channel_account_id=account_id,
            scheduled_for=request.scheduled_for if has_scheduled else None,
            status=instance_status
        )
        db.add(instance)
        instances.append(instance)
    
    await db.flush()
    
    # Audit log for each instance
    for instance in instances:
        await write_audit_marketing(
            db, content_item.tenant_id, "post_instance", instance.id, "create", current_user.username
        )
    
    await db.commit()
    
    # Refresh all instances
    for instance in instances:
        await db.refresh(instance)
    
    return instances


@router.get("/post-instances/{instance_id}", response_model=PostInstanceSchema)
async def get_post_instance(instance_id: UUID, db: AsyncSession = Depends(get_session)):
    """Get a specific post instance"""
    result = await db.execute(
        select(models.PostInstance).where(models.PostInstance.id == instance_id)
    )
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Post instance not found")
    return instance


@router.patch("/post-instances/{instance_id}", response_model=PostInstanceSchema)
async def update_post_instance(
    instance_id: UUID,
    instance_update: PostInstanceUpdate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Update a post instance"""
    result = await db.execute(
        select(models.PostInstance).where(models.PostInstance.id == instance_id)
    )
    db_instance = result.scalar_one_or_none()
    if not db_instance:
        raise HTTPException(status_code=404, detail="Post instance not found")
    
    update_data = instance_update.model_dump(exclude_unset=True)
    
    # Handle status transitions and enforce rules
    if 'status' in update_data:
        new_status = update_data['status']
        if new_status == 'Posted' and not db_instance.posted_at:
            update_data['posted_at'] = datetime.utcnow()
        if new_status == 'Scheduled':
            # Enforce: Scheduled requires both caption and datetime
            if not db_instance.scheduled_for and not update_data.get('scheduled_for'):
                raise HTTPException(status_code=400, detail="Scheduled time required for Scheduled status")
            # Check if caption exists (either override or from content item)
            content_item_result = await db.execute(
                select(models.ContentItem).where(models.ContentItem.id == db_instance.content_item_id)
            )
            content_item = content_item_result.scalar_one_or_none()
            has_caption = (update_data.get('caption_override') or db_instance.caption_override or 
                          (content_item and content_item.base_caption))
            if not has_caption:
                raise HTTPException(status_code=400, detail="Caption required for Scheduled status. Set caption_override or ensure content item has base_caption.")
    
    for field, value in update_data.items():
        old_value = getattr(db_instance, field)
        setattr(db_instance, field, value)
        await write_audit_marketing(
            db,
            db_instance.tenant_id,
            "post_instance",
            db_instance.id,
            "update",
            current_user.username,
            field,
            str(old_value) if old_value is not None else None,
            str(value) if value is not None else None,
        )
    
    await db.commit()
    await db.refresh(db_instance)
    
    return db_instance


@router.post("/post-instances/{instance_id}/mark-posted", response_model=PostInstanceSchema)
async def mark_post_instance_posted(
    instance_id: UUID,
    request: MarkPostInstancePostedRequest,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Mark a post instance as manually posted"""
    result = await db.execute(
        select(models.PostInstance).where(models.PostInstance.id == instance_id)
    )
    db_instance = result.scalar_one_or_none()
    if not db_instance:
        raise HTTPException(status_code=404, detail="Post instance not found")
    
    db_instance.status = 'Posted'
    db_instance.posted_at = request.posted_at or datetime.utcnow()
    db_instance.post_url = request.post_url
    db_instance.screenshot_url = request.screenshot_url
    db_instance.posted_manually = request.posted_manually
    db_instance.last_error = None
    
    await write_audit_marketing(
        db, db_instance.tenant_id, "post_instance", db_instance.id, "mark_posted", current_user.username
    )
    
    await db.commit()
    await db.refresh(db_instance)
    
    return db_instance


@router.delete("/post-instances/{instance_id}")
async def delete_post_instance(
    instance_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Delete a post instance"""
    result = await db.execute(
        select(models.PostInstance).where(models.PostInstance.id == instance_id)
    )
    db_instance = result.scalar_one_or_none()
    if not db_instance:
        raise HTTPException(status_code=404, detail="Post instance not found")
    
    tenant_id = db_instance.tenant_id
    await write_audit_marketing(
        db, tenant_id, "post_instance", db_instance.id, "delete", current_user.username
    )
    
    await db.delete(db_instance)
    await db.commit()
    
    return {"message": "Post instance deleted"}
