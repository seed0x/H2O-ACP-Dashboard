"""
Marketing module endpoints for content management and social media posting
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload, joinedload
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
import os

from ..db.session import get_session
from .. import models
from .. import schemas_marketing
from ..core.auth import get_current_user, CurrentUser
from .. import crud

router = APIRouter(prefix="/marketing", tags=["marketing"])


# Marketing Channels

# Default channels to seed if none exist
DEFAULT_CHANNELS = [
    {"key": "google_business_profile", "display_name": "Google Business Profile", "supports_autopost": True},
    {"key": "facebook_page", "display_name": "Facebook Page", "supports_autopost": True},
    {"key": "instagram_business", "display_name": "Instagram Business", "supports_autopost": True},
    {"key": "nextdoor", "display_name": "Nextdoor", "supports_autopost": False},
]


async def ensure_channels_seeded(db: AsyncSession):
    """Ensure default marketing channels exist in database"""
    result = await db.execute(select(models.MarketingChannel))
    existing = result.scalars().all()
    
    if len(existing) == 0:
        # No channels exist, seed them
        for channel_data in DEFAULT_CHANNELS:
            channel = models.MarketingChannel(**channel_data)
            db.add(channel)
        await db.commit()


# Optional seed secret: if set, callers must provide it as ?secret=... to the seed endpoint.
_MARKETING_SEED_SECRET = os.getenv("MARKETING_SEED_SECRET")


@router.get("/channels", response_model=List[schemas_marketing.MarketingChannel])
async def list_channels(
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List all available marketing channels"""
    # Auto-seed channels if none exist
    await ensure_channels_seeded(db)
    
    result = await db.execute(select(models.MarketingChannel).order_by(models.MarketingChannel.display_name))
    return result.scalars().all()


@router.post("/seed-channels", response_model=List[schemas_marketing.MarketingChannel])
async def seed_channels(
    db: AsyncSession = Depends(get_session),
    secret: Optional[str] = Query(None, description="Optional seed secret")
):
    """Seed default marketing channels into the database.

    This endpoint is intentionally lightweight so you can seed channels without access to the Render shell.
    If the environment variable MARKETING_SEED_SECRET is set, callers must provide the same value as the
    `secret` query parameter; otherwise the endpoint is open.
    The seeding is idempotent: it will only populate channels if none exist.
    """
    if _MARKETING_SEED_SECRET and secret != _MARKETING_SEED_SECRET:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid seed secret")

    await ensure_channels_seeded(db)
    result = await db.execute(select(models.MarketingChannel).order_by(models.MarketingChannel.display_name))
    return result.scalars().all()


# Channel Accounts

@router.get("/channel-accounts", response_model=List[schemas_marketing.ChannelAccount])
async def list_channel_accounts(
    tenant_id: str = Query(..., description="Tenant ID"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List channel accounts for a tenant"""
    result = await db.execute(
        select(models.ChannelAccount)
        .where(models.ChannelAccount.tenant_id == tenant_id)
        .order_by(models.ChannelAccount.name)
    )
    return result.scalars().all()


@router.post("/channel-accounts", response_model=schemas_marketing.ChannelAccount, status_code=status.HTTP_201_CREATED)
async def create_channel_account(
    account_in: schemas_marketing.ChannelAccountCreate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a new channel account"""
    # Verify channel exists
    channel_result = await db.execute(
        select(models.MarketingChannel).where(models.MarketingChannel.id == account_in.channel_id)
    )
    channel = channel_result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Marketing channel not found")
    
    account = models.ChannelAccount(**account_in.model_dump())
    db.add(account)
    await db.flush()
    
    # Audit log
    await crud.write_audit(
        db, None, 'channel_account', account.id, 'create', current_user.username
    )
    
    await db.commit()
    await db.refresh(account)
    return account


@router.get("/channel-accounts/{account_id}", response_model=schemas_marketing.ChannelAccount)
async def get_channel_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get a channel account by ID"""
    result = await db.execute(
        select(models.ChannelAccount).where(models.ChannelAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    return account


@router.patch("/channel-accounts/{account_id}", response_model=schemas_marketing.ChannelAccount)
async def update_channel_account(
    account_id: UUID,
    account_update: schemas_marketing.ChannelAccountUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update a channel account"""
    result = await db.execute(
        select(models.ChannelAccount).where(models.ChannelAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    update_data = account_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(account, field)
        setattr(account, field, value)
        await crud.write_audit(
            db, None, 'channel_account', account.id, 'update', current_user.username,
            field, str(old_value) if old_value is not None else None, str(value) if value is not None else None
        )
    
    await db.commit()
    await db.refresh(account)
    return account


@router.delete("/channel-accounts/{account_id}")
async def delete_channel_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Delete a channel account"""
    result = await db.execute(
        select(models.ChannelAccount).where(models.ChannelAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    # Audit log
    await crud.write_audit(
        db, None, 'channel_account', account.id, 'delete', current_user.username
    )
    
    await db.delete(account)
    await db.commit()
    return {"deleted": True}


# Content Items

@router.get("/content-items", response_model=List[schemas_marketing.ContentItem])
async def list_content_items(
    tenant_id: str = Query(..., description="Tenant ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search in title"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List content items for a tenant"""
    query = select(models.ContentItem).where(models.ContentItem.tenant_id == tenant_id)
    
    if status:
        query = query.where(models.ContentItem.status == status)
    
    if search:
        query = query.where(models.ContentItem.title.ilike(f"%{search}%"))
    
    query = query.order_by(models.ContentItem.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(
        query.options(selectinload(models.ContentItem.media_assets))
    )
    return result.scalars().all()


@router.post("/content-items", response_model=schemas_marketing.ContentItem, status_code=status.HTTP_201_CREATED)
async def create_content_item(
    item_in: schemas_marketing.ContentItemCreate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a new content item"""
    item = models.ContentItem(**item_in.model_dump())
    db.add(item)
    await db.flush()
    
    # Audit log
    await crud.write_audit(
        db, None, 'content_item', item.id, 'create', current_user.username
    )
    
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/content-items/{item_id}", response_model=schemas_marketing.ContentItem)
async def get_content_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get a content item by ID"""
    result = await db.execute(
        select(models.ContentItem)
        .where(models.ContentItem.id == item_id)
        .options(selectinload(models.ContentItem.media_assets))
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")
    return item


@router.patch("/content-items/{item_id}", response_model=schemas_marketing.ContentItem)
async def update_content_item(
    item_id: UUID,
    item_update: schemas_marketing.ContentItemUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update a content item"""
    result = await db.execute(
        select(models.ContentItem).where(models.ContentItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")
    
    update_data = item_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(item, field)
        setattr(item, field, value)
        await crud.write_audit(
            db, None, 'content_item', item.id, 'update', current_user.username,
            field, str(old_value) if old_value is not None else None, str(value) if value is not None else None
        )
    
    await db.commit()
    # Re-query with relationships
    result = await db.execute(
        select(models.ContentItem)
        .where(models.ContentItem.id == item.id)
        .options(selectinload(models.ContentItem.media_assets))
    )
    item = result.scalar_one()
    return item


@router.delete("/content-items/{item_id}")
async def delete_content_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Delete a content item"""
    result = await db.execute(
        select(models.ContentItem).where(models.ContentItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")
    
    # Audit log
    await crud.write_audit(
        db, None, 'content_item', item.id, 'delete', current_user.username
    )
    
    await db.delete(item)
    await db.commit()
    return {"deleted": True}


# Post Instances

@router.get("/post-instances", response_model=List[schemas_marketing.PostInstance])
async def list_post_instances(
    tenant_id: str = Query(..., description="Tenant ID"),
    content_item_id: Optional[UUID] = Query(None, description="Filter by content item"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List post instances for a tenant"""
    query = select(models.PostInstance).where(models.PostInstance.tenant_id == tenant_id)
    
    if content_item_id:
        query = query.where(models.PostInstance.content_item_id == content_item_id)
    
    if status:
        query = query.where(models.PostInstance.status == status)
    
    query = query.order_by(models.PostInstance.scheduled_for.desc().nullslast(), models.PostInstance.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(
        query.options(
            joinedload(models.PostInstance.content_item).selectinload(models.ContentItem.media_assets), 
            joinedload(models.PostInstance.channel_account)
        )
    )
    instances = result.unique().scalars().all()
    
    # Explicitly serialize while still in async session context
    return [schemas_marketing.PostInstance.model_validate(instance) for instance in instances]


@router.post("/post-instances", response_model=schemas_marketing.PostInstance, status_code=status.HTTP_201_CREATED)
async def create_post_instance(
    instance_in: schemas_marketing.PostInstanceCreate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a new post instance"""
    # Verify content item exists
    content_result = await db.execute(
        select(models.ContentItem).where(models.ContentItem.id == instance_in.content_item_id)
    )
    content_item = content_result.scalar_one_or_none()
    if not content_item:
        raise HTTPException(status_code=404, detail="Content item not found")
    
    # Verify channel account exists
    account_result = await db.execute(
        select(models.ChannelAccount).where(models.ChannelAccount.id == instance_in.channel_account_id)
    )
    account = account_result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    instance = models.PostInstance(**instance_in.model_dump())
    db.add(instance)
    await db.flush()
    
    # Audit log
    await crud.write_audit(
        db, None, 'post_instance', instance.id, 'create', current_user.username
    )
    
    await db.commit()
    # Re-query with relationships after commit to ensure they're loaded
    result = await db.execute(
        select(models.PostInstance)
        .where(models.PostInstance.id == instance.id)
        .options(
            joinedload(models.PostInstance.content_item), 
            joinedload(models.PostInstance.channel_account)
        )
    )
    instance = result.scalar_one()
    # Explicitly serialize while still in async session context
    return schemas_marketing.PostInstance.model_validate(instance)


@router.post("/post-instances/bulk", response_model=List[schemas_marketing.PostInstance], status_code=status.HTTP_201_CREATED)
async def create_post_instances_bulk(
    request: schemas_marketing.CreatePostInstancesRequest,
    tenant_id: str = Query(..., description="Tenant ID"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create multiple post instances from a content item"""
    # Verify content item exists
    content_result = await db.execute(
        select(models.ContentItem).where(models.ContentItem.id == request.content_item_id)
    )
    content_item = content_result.scalar_one_or_none()
    if not content_item:
        raise HTTPException(status_code=404, detail="Content item not found")
    
    instances = []
    for channel_account_id in request.channel_account_ids:
        # Verify channel account exists
        account_result = await db.execute(
            select(models.ChannelAccount).where(models.ChannelAccount.id == channel_account_id)
        )
        account = account_result.scalar_one_or_none()
        if not account:
            raise HTTPException(status_code=404, detail=f"Channel account {channel_account_id} not found")
        
        instance = models.PostInstance(
            tenant_id=tenant_id,
            content_item_id=request.content_item_id,
            channel_account_id=channel_account_id,
            scheduled_for=request.scheduled_for,
            status='Scheduled' if request.scheduled_for else 'Draft'
        )
        db.add(instance)
        instances.append(instance)
    
    await db.flush()
    
    # Audit log for each instance
    for instance in instances:
        await crud.write_audit(
            db, None, 'post_instance', instance.id, 'create', current_user.username
        )
    
    await db.commit()
    # Re-query all instances with relationships after commit
    instance_ids = [inst.id for inst in instances]
    result = await db.execute(
        select(models.PostInstance)
        .where(models.PostInstance.id.in_(instance_ids))
        .options(
            joinedload(models.PostInstance.content_item), 
            joinedload(models.PostInstance.channel_account)
        )
    )
    loaded_instances = result.unique().scalars().all()
    # Explicitly serialize while still in async session context
    return [schemas_marketing.PostInstance.model_validate(instance) for instance in loaded_instances]


@router.get("/post-instances/{instance_id}", response_model=schemas_marketing.PostInstance)
async def get_post_instance(
    instance_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get a post instance by ID"""
    result = await db.execute(
        select(models.PostInstance)
        .where(models.PostInstance.id == instance_id)
        .options(
            joinedload(models.PostInstance.content_item), 
            joinedload(models.PostInstance.channel_account)
        )
    )
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Post instance not found")
    # Explicitly serialize while still in async session context
    return schemas_marketing.PostInstance.model_validate(instance)


@router.patch("/post-instances/{instance_id}", response_model=schemas_marketing.PostInstance)
async def update_post_instance(
    instance_id: UUID,
    instance_update: schemas_marketing.PostInstanceUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update a post instance"""
    result = await db.execute(
        select(models.PostInstance)
        .where(models.PostInstance.id == instance_id)
        .options(
            joinedload(models.PostInstance.content_item), 
            joinedload(models.PostInstance.channel_account)
        )
    )
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Post instance not found")
    
    update_data = instance_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(instance, field)
        setattr(instance, field, value)
        await crud.write_audit(
            db, None, 'post_instance', instance.id, 'update', current_user.username,
            field, str(old_value) if old_value is not None else None, str(value) if value is not None else None
        )
    
    await db.commit()
    # Re-query with relationships after commit to ensure they're loaded
    result = await db.execute(
        select(models.PostInstance)
        .where(models.PostInstance.id == instance.id)
        .options(
            joinedload(models.PostInstance.content_item), 
            joinedload(models.PostInstance.channel_account)
        )
    )
    instance = result.scalar_one()
    # Explicitly serialize while still in async session context
    return schemas_marketing.PostInstance.model_validate(instance)


@router.delete("/post-instances/{instance_id}")
async def delete_post_instance(
    instance_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Delete a post instance"""
    result = await db.execute(
        select(models.PostInstance).where(models.PostInstance.id == instance_id)
    )
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Post instance not found")
    
    # Audit log
    await crud.write_audit(
        db, None, 'post_instance', instance.id, 'delete', current_user.username
    )
    
    await db.delete(instance)
    await db.commit()
    return {"deleted": True}


@router.post("/post-instances/{instance_id}/mark-posted", response_model=schemas_marketing.PostInstance)
async def mark_post_instance_posted(
    instance_id: UUID,
    request: schemas_marketing.MarkPostInstancePostedRequest,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Mark a post instance as posted"""
    result = await db.execute(
        select(models.PostInstance)
        .where(models.PostInstance.id == instance_id)
        .options(
            joinedload(models.PostInstance.content_item), 
            joinedload(models.PostInstance.channel_account)
        )
    )
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Post instance not found")
    
    instance.status = 'Posted'
    instance.posted_at = request.posted_at or datetime.now(timezone.utc)
    instance.post_url = request.post_url
    instance.screenshot_url = request.screenshot_url
    instance.posted_manually = request.posted_manually
    
    await crud.write_audit(
        db, None, 'post_instance', instance.id, 'update', current_user.username,
        'status', 'Scheduled', 'Posted'
    )
    
    await db.commit()
    # Re-query with relationships after commit to ensure they're loaded
    result = await db.execute(
        select(models.PostInstance)
        .where(models.PostInstance.id == instance.id)
        .options(
            joinedload(models.PostInstance.content_item), 
            joinedload(models.PostInstance.channel_account)
        )
    )
    instance = result.scalar_one()
    # Explicitly serialize while still in async session context
    return schemas_marketing.PostInstance.model_validate(instance)


@router.post("/post-instances/{instance_id}/mark-failed", response_model=schemas_marketing.PostInstance)
async def mark_post_instance_failed(
    instance_id: UUID,
    error_message: str = Query(..., description="Error message"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Mark a post instance as failed"""
    result = await db.execute(
        select(models.PostInstance)
        .where(models.PostInstance.id == instance_id)
        .options(
            joinedload(models.PostInstance.content_item), 
            joinedload(models.PostInstance.channel_account)
        )
    )
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Post instance not found")
    
    old_status = instance.status
    instance.status = 'Failed'
    instance.last_error = error_message
    
    await crud.write_audit(
        db, None, 'post_instance', instance.id, 'update', current_user.username,
        'status', old_status, 'Failed'
    )
    
    await db.commit()
    # Re-query with relationships after commit to ensure they're loaded
    result = await db.execute(
        select(models.PostInstance)
        .where(models.PostInstance.id == instance.id)
        .options(
            joinedload(models.PostInstance.content_item), 
            joinedload(models.PostInstance.channel_account)
        )
    )
    instance = result.scalar_one()
    # Explicitly serialize while still in async session context
    return schemas_marketing.PostInstance.model_validate(instance)


# Calendar View

@router.get("/calendar")
async def get_calendar_view(
    tenant_id: str = Query(..., description="Tenant ID"),
    start_date: Optional[datetime] = Query(None, description="Start date for calendar view"),
    end_date: Optional[datetime] = Query(None, description="End date for calendar view"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get calendar view of scheduled posts grouped by date"""
    query = select(models.PostInstance).where(models.PostInstance.tenant_id == tenant_id)
    
    if start_date:
        query = query.where(models.PostInstance.scheduled_for >= start_date)
    if end_date:
        query = query.where(models.PostInstance.scheduled_for <= end_date)
    
    query = query.where(models.PostInstance.scheduled_for.isnot(None))
    query = query.order_by(models.PostInstance.scheduled_for)
    
    # Use joinedload to ensure relationships are loaded in the same query (avoids lazy loading issues)
    # Use outerjoin for content_item since it can be null for planned slots
    from sqlalchemy.orm import joinedload
    result = await db.execute(
        query.options(
            joinedload(models.PostInstance.content_item).selectinload(models.ContentItem.media_assets),  # This will be None for planned slots
            joinedload(models.PostInstance.channel_account)  # This should always exist
        )
    )
    instances = result.unique().scalars().all()
    
    # Group by date - serialize while still in async session context
    calendar = {}
    for instance in instances:
        if instance.scheduled_for:
            date_key = instance.scheduled_for.date().isoformat()
            if date_key not in calendar:
                calendar[date_key] = []
            # Serialize using model_validate - joinedload ensures relationships are loaded
            # For planned slots, content_item will be None, which is handled by Optional in schema
            try:
                serialized = schemas_marketing.PostInstance.model_validate(instance)
                calendar[date_key].append(serialized)
            except Exception as e:
                # Log but don't fail - skip problematic instances
                import logging
                logging.warning(f"Failed to serialize PostInstance {instance.id}: {e}")
                continue
    
    return calendar


# Media Assets

@router.post("/media/upload", response_model=schemas_marketing.MediaAsset, status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
    tenant_id: str = Query(..., description="Tenant ID"),
    content_item_id: Optional[UUID] = Query(None, description="Optional content item ID to attach to"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Upload a media file to S3/R2 storage"""
    try:
        from ..core.storage import upload_file, validate_file
        
        # Read file content
        file_content = await file.read()
        
        # Determine file type from mime type
        mime_type = file.content_type
        if mime_type and mime_type.startswith('image/'):
            file_type = 'image'
        elif mime_type and mime_type.startswith('video/'):
            file_type = 'video'
        else:
            # Try to infer from extension
            file_ext = os.path.splitext(file.filename)[1].lower()
            if file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
                file_type = 'image'
            elif file_ext in ['.mp4', '.mov', '.avi']:
                file_type = 'video'
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Unsupported file type. Only images and videos are allowed."
                )
        
        # Upload to storage
        file_url = upload_file(
            file_content=file_content,
            file_name=file.filename,
            tenant_id=tenant_id,
            folder="media",
            mime_type=mime_type
        )
        
        # Create MediaAsset record
        media_asset = models.MediaAsset(
            tenant_id=tenant_id,
            content_item_id=content_item_id,
            file_name=file.filename,
            file_url=file_url,
            file_type=file_type,
            file_size=len(file_content),
            mime_type=mime_type
        )
        db.add(media_asset)
        await db.flush()
        
        # Audit log
        await crud.write_audit(
            db, None, 'media_asset', media_asset.id, 'create', current_user.username
        )
        
        await db.commit()
        await db.refresh(media_asset)
        return media_asset
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload media: {str(e)}"
        )

