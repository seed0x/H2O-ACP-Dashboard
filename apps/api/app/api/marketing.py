"""
Marketing module endpoints for content management and social media posting
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy.exc import IntegrityError
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timezone, timedelta, date
import os

from ..db.session import get_session
from .. import models
from .. import schemas_marketing
from ..core.auth import get_current_user, CurrentUser
from .. import crud

router = APIRouter(prefix="/marketing", tags=["marketing"])


class DemandSignalProcessor:
    """Process demand signals and suggest content based on search trends"""
    
    HIGH_DEMAND_THRESHOLD = 1.5  # 50% increase in search volume (change_pct >= 50)
    
    def map_keyword_to_category(self, keyword: str) -> str:
        """Map search keywords to content categories"""
        keyword_lower = keyword.lower()
        
        if any(word in keyword_lower for word in ['diy', 'how to', 'fix', 'repair', 'tip', 'guide']):
            return 'diy'
        elif any(word in keyword_lower for word in ['coupon', 'deal', 'discount', 'special', 'offer', 'promotion']):
            return 'coupon'
        elif any(word in keyword_lower for word in ['blog', 'article', 'read', 'learn', 'guide', 'tips']):
            return 'blog_post'
        elif any(word in keyword_lower for word in ['team', 'meet', 'staff', 'employee', 'about us']):
            return 'team_post'
        else:
            return 'ad_content'  # Default to ad content for general queries
    
    def generate_caption(self, keyword: str, category: str) -> str:
        """Generate SEO-friendly caption based on keyword and category"""
        keyword_clean = keyword.replace(' ', '')
        
        if category == 'diy':
            return f"🔧 Need help with {keyword}? Our experts share their top tips! #DIY #HomeTips #LocalExperts #{keyword_clean}"
        elif category == 'coupon':
            return f"🎉 Special offer on {keyword} services! Limited time only. #SpecialDeal #Discount #SaveMoney #{keyword_clean}"
        elif category == 'blog_post':
            return f"📖 New blog post: Everything you need to know about {keyword}. Link in bio! #Blog #ExpertAdvice #Tips #{keyword_clean}"
        elif category == 'team_post':
            return f"🌟 Meet our team of {keyword} experts! We're here to help. #MeetTheTeam #OurTeam #LocalExperts"
        else:
            return f"🔧 Professional {keyword} services you can trust! #Quality #Professional #Service #{keyword_clean}"
    
    async def analyze_signals(
        self,
        tenant_id: str,
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Analyze recent demand signals and suggest content"""
        try:
            # Import demand signals router function
            from .demand_signals import get_demand_signals
            
            # Fetch demand signals (last 7 days)
            # We'll use a mock CurrentUser for the internal call
            class MockUser:
                def __init__(self):
                    self.username = "system"
                    self.tenant_id = tenant_id
            
            mock_user = MockUser()
            
            # Call the demand signals endpoint logic directly
            # Since we can't easily call the endpoint, we'll import and use the fetch function
            from .demand_signals import fetch_google_search_console_data, calculate_trends, categorize_query
            import os
            
            site_url = os.getenv("GOOGLE_SEARCH_CONSOLE_SITE_URL")
            if not site_url:
                return []  # No suggestions if Search Console not configured
            
            # Fetch current and previous period data
            current_data = await fetch_google_search_console_data(site_url, 7, start_date_offset=0)
            previous_data = await fetch_google_search_console_data(site_url, 7, start_date_offset=7)
            
            # Calculate trends
            trends = calculate_trends(current_data, previous_data)
            
            suggestions = []
            for item in current_data:
                query = item.get('query', '')
                if not query:
                    continue
                
                trend = trends.get(query, {})
                change_pct = trend.get('change_pct', 0)
                
                # Only suggest if demand increased significantly
                if change_pct >= 50:  # 50% increase threshold
                    category = self.map_keyword_to_category(query)
                    
                    suggestion = {
                        "trigger": "high_demand",
                        "keyword": query,
                        "location": None,  # Could be extracted from query or tenant config
                        "suggested_category": category,
                        "suggested_title": f"Expert Tips: {query.title()}",
                        "suggested_caption": self.generate_caption(query, category),
                        "priority": "high" if change_pct > 100 else "medium",  # >100% = high priority
                        "target_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
                        "change_pct": change_pct,
                        "current_clicks": trend.get('current_clicks', item.get('clicks', 0))
                    }
                    suggestions.append(suggestion)
            
            # Sort by priority and change percentage
            suggestions.sort(key=lambda x: (x['priority'] == 'high', x['change_pct']), reverse=True)
            
            return suggestions[:10]  # Return top 10 suggestions
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error analyzing demand signals: {e}", exc_info=True)
            return []


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
    
    # Re-query with relationships loaded to avoid MissingGreenlet error
    result = await db.execute(
        select(models.ContentItem)
        .where(models.ContentItem.id == item.id)
        .options(selectinload(models.ContentItem.media_assets))
    )
    item = result.scalar_one()
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
    include_unscheduled: bool = Query(False, description="Include unscheduled posts (scheduled_for is NULL)"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get calendar view of scheduled posts grouped by date, optionally including unscheduled posts"""
    from sqlalchemy import or_
    from sqlalchemy.orm import joinedload
    
    query = select(models.PostInstance).where(models.PostInstance.tenant_id == tenant_id)
    
    # Handle date filtering and unscheduled posts
    if include_unscheduled:
        # Include both scheduled and unscheduled posts
        if start_date or end_date:
            # For scheduled posts, apply date filters
            # For unscheduled posts, include them regardless of date filters
            date_conditions = []
            if start_date:
                date_conditions.append(models.PostInstance.scheduled_for >= start_date)
            if end_date:
                date_conditions.append(models.PostInstance.scheduled_for <= end_date)
            
            if date_conditions:
                # Include posts that match date filters OR are unscheduled
                query = query.where(
                    or_(
                        *date_conditions,
                        models.PostInstance.scheduled_for.is_(None)
                    )
                )
        # If no date filters, include all posts (scheduled and unscheduled)
    else:
        # Only include scheduled posts
        if start_date:
            query = query.where(models.PostInstance.scheduled_for >= start_date)
        if end_date:
            query = query.where(models.PostInstance.scheduled_for <= end_date)
        query = query.where(models.PostInstance.scheduled_for.isnot(None))
    
    # Order by scheduled_for (NULLs last for unscheduled)
    query = query.order_by(models.PostInstance.scheduled_for.nulls_last())
    
    # Use joinedload to ensure relationships are loaded in the same query (avoids lazy loading issues)
    # Use outerjoin for content_item since it can be null for planned slots
    result = await db.execute(
        query.options(
            joinedload(models.PostInstance.content_item).selectinload(models.ContentItem.media_assets),  # This will be None for planned slots
            joinedload(models.PostInstance.channel_account)  # This should always exist
        )
    )
    instances = result.unique().scalars().all()
    
    # Group scheduled by date, unscheduled in separate array
    calendar = {}
    unscheduled = []
    
    for instance in instances:
        if instance.scheduled_for:
            # Scheduled post - group by date
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
        else:
            # Unscheduled post - add to unscheduled array
            try:
                serialized = schemas_marketing.PostInstance.model_validate(instance)
                unscheduled.append(serialized)
            except Exception as e:
                import logging
                logging.warning(f"Failed to serialize PostInstance {instance.id}: {e}")
                continue
    
    # Return format: if include_unscheduled, return both scheduled and unscheduled
    if include_unscheduled:
        return {
            "scheduled": calendar,
            "unscheduled": unscheduled
        }
    else:
        # Backward compatibility: return just calendar dict if unscheduled not requested
        return calendar


# Content Suggestions

@router.get("/content-suggestions")
async def get_content_suggestions(
    tenant_id: str = Query(..., description="Tenant ID"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get AI-suggested content based on demand signals"""
    processor = DemandSignalProcessor()
    suggestions = await processor.analyze_signals(tenant_id, db)
    return {"suggestions": suggestions}


# System Health

@router.get("/system-health")
async def get_system_health(
    tenant_id: str = Query(..., description="Tenant ID"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get marketing system health metrics"""
    from sqlalchemy import func, and_
    from datetime import datetime, timedelta, timezone
    
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    thirty_days_ago = now - timedelta(days=30)
    
    # Scheduled posts (upcoming)
    scheduled_count_result = await db.execute(
        select(func.count(models.PostInstance.id)).where(
            and_(
                models.PostInstance.tenant_id == tenant_id,
                models.PostInstance.status == 'Scheduled',
                models.PostInstance.scheduled_for >= now
            )
        )
    )
    scheduled_count = scheduled_count_result.scalar() or 0
    
    # Published posts (last 30 days)
    published_count_result = await db.execute(
        select(func.count(models.PostInstance.id)).where(
            and_(
                models.PostInstance.tenant_id == tenant_id,
                models.PostInstance.status == 'Posted',
                models.PostInstance.posted_at >= thirty_days_ago
            )
        )
    )
    published_count = published_count_result.scalar() or 0
    
    # Failed posts (need attention)
    failed_count_result = await db.execute(
        select(func.count(models.PostInstance.id)).where(
            and_(
                models.PostInstance.tenant_id == tenant_id,
                models.PostInstance.status == 'Failed'
            )
        )
    )
    failed_count = failed_count_result.scalar() or 0
    
    # Empty slots (planned slots without content)
    empty_slots_result = await db.execute(
        select(func.count(models.PostInstance.id)).where(
            and_(
                models.PostInstance.tenant_id == tenant_id,
                models.PostInstance.status == 'Planned',
                models.PostInstance.content_item_id.is_(None),
                models.PostInstance.scheduled_for >= now
            )
        )
    )
    empty_slots = empty_slots_result.scalar() or 0
    
    return {
        "scheduled_count": scheduled_count,
        "published_count": published_count,
        "failed_count": failed_count,
        "empty_slots": empty_slots,
        "timestamp": now.isoformat()
    }


# Media Assets

@router.post("/media/upload", response_model=schemas_marketing.MediaAsset, status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
    tenant_id: str = Query(..., description="Tenant ID"),
    content_item_id: Optional[UUID] = Query(None, description="Optional content item ID to attach to"),
    intent_tags: Optional[str] = Query(None, description="Comma-separated intent tags (e.g., 'before_after,crew,job_site')"),
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
        
        # Parse intent tags from comma-separated string
        tags_list = None
        if intent_tags:
            tags_list = [tag.strip() for tag in intent_tags.split(',') if tag.strip()]
        
        # Create MediaAsset record
        media_asset = models.MediaAsset(
            tenant_id=tenant_id,
            content_item_id=content_item_id,
            file_name=file.filename,
            file_url=file_url,
            file_type=file_type,
            file_size=len(file_content),
            mime_type=mime_type,
            intent_tags=tags_list
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


# Local SEO Topics (Priority 1)

@router.get("/local-seo-topics", response_model=List[schemas_marketing.LocalSEOTopic])
async def list_local_seo_topics(
    tenant_id: str = Query(..., description="Tenant ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    service_type: Optional[str] = Query(None, description="Filter by service type"),
    city: Optional[str] = Query(None, description="Filter by city"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List local SEO topics (city + service combinations)"""
    query = select(models.LocalSEOTopic).where(
        models.LocalSEOTopic.tenant_id == tenant_id
    )
    
    if status:
        query = query.where(models.LocalSEOTopic.status == status)
    if service_type:
        query = query.where(models.LocalSEOTopic.service_type.ilike(f"%{service_type}%"))
    if city:
        query = query.where(models.LocalSEOTopic.city.ilike(f"%{city}%"))
    
    query = query.order_by(
        models.LocalSEOTopic.status,
        models.LocalSEOTopic.city,
        models.LocalSEOTopic.service_type
    ).limit(limit).offset(offset)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/local-seo-topics", response_model=schemas_marketing.LocalSEOTopic, status_code=status.HTTP_201_CREATED)
async def create_local_seo_topic(
    topic_in: schemas_marketing.LocalSEOTopicCreate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a new local SEO topic"""
    topic = models.LocalSEOTopic(**topic_in.model_dump())
    db.add(topic)
    await db.flush()
    
    await crud.write_audit(
        db, topic.tenant_id, 'local_seo_topic', topic.id, 'create', current_user.username
    )
    
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail="A topic with this service type and city already exists for this tenant"
        )
    
    await db.refresh(topic)
    return topic


@router.get("/local-seo-topics/coverage-gaps", response_model=Dict[str, Any])
async def get_coverage_gaps(
    tenant_id: str = Query(..., description="Tenant ID"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get coverage gaps - topics that need content or haven't been posted recently"""
    # Topics that haven't been started
    not_started = await db.execute(
        select(func.count(models.LocalSEOTopic.id)).where(
            and_(
                models.LocalSEOTopic.tenant_id == tenant_id,
                models.LocalSEOTopic.status == 'not_started'
            )
        )
    )
    not_started_count = not_started.scalar() or 0
    
    # Topics that need update (published but old)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    needs_update = await db.execute(
        select(func.count(models.LocalSEOTopic.id)).where(
            and_(
                models.LocalSEOTopic.tenant_id == tenant_id,
                models.LocalSEOTopic.status == 'published',
                or_(
                    models.LocalSEOTopic.last_posted_at.is_(None),
                    models.LocalSEOTopic.last_posted_at < thirty_days_ago
                )
            )
        )
    )
    needs_update_count = needs_update.scalar() or 0
    
    return {
        "not_started": not_started_count,
        "needs_update": needs_update_count,
        "total_gaps": not_started_count + needs_update_count
    }


@router.get("/local-seo-topics/{topic_id}", response_model=schemas_marketing.LocalSEOTopic)
async def get_local_seo_topic(
    topic_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get a local SEO topic by ID"""
    result = await db.execute(
        select(models.LocalSEOTopic).where(models.LocalSEOTopic.id == topic_id)
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Local SEO topic not found")
    return topic


@router.patch("/local-seo-topics/{topic_id}", response_model=schemas_marketing.LocalSEOTopic)
async def update_local_seo_topic(
    topic_id: UUID,
    topic_update: schemas_marketing.LocalSEOTopicUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update a local SEO topic"""
    result = await db.execute(
        select(models.LocalSEOTopic).where(models.LocalSEOTopic.id == topic_id)
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Local SEO topic not found")
    
    update_data = topic_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(topic, field)
        setattr(topic, field, value)
        await crud.write_audit(
            db, topic.tenant_id, 'local_seo_topic', topic.id, 'update', current_user.username,
            field, str(old_value) if old_value is not None else None, str(value) if value is not None else None
        )
    
    await db.commit()
    await db.refresh(topic)
    return topic


# Offers / Promo Manager (Priority 2)

@router.get("/offers", response_model=List[schemas_marketing.Offer])
async def list_offers(
    tenant_id: str = Query(..., description="Tenant ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    service_type: Optional[str] = Query(None, description="Filter by service type"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List offers/promos"""
    query = select(models.Offer).where(
        models.Offer.tenant_id == tenant_id
    )
    
    if is_active is not None:
        query = query.where(models.Offer.is_active == is_active)
    if service_type:
        query = query.where(models.Offer.service_type.ilike(f"%{service_type}%"))
    
    query = query.order_by(
        models.Offer.valid_from.desc(),
        models.Offer.created_at.desc()
    ).limit(limit).offset(offset)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/offers/active", response_model=List[schemas_marketing.Offer])
async def list_active_offers(
    tenant_id: str = Query(..., description="Tenant ID"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get all currently active offers (within valid date range)"""
    today = date.today()
    result = await db.execute(
        select(models.Offer).where(
            and_(
                models.Offer.tenant_id == tenant_id,
                models.Offer.is_active == True,
                models.Offer.valid_from <= today,
                models.Offer.valid_to >= today
            )
        ).order_by(models.Offer.valid_to.asc())
    )
    return result.scalars().all()


@router.post("/offers", response_model=schemas_marketing.Offer, status_code=status.HTTP_201_CREATED)
async def create_offer(
    offer_in: schemas_marketing.OfferCreate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a new offer/promo"""
    offer = models.Offer(**offer_in.model_dump())
    db.add(offer)
    await db.flush()
    
    await crud.write_audit(
        db, offer.tenant_id, 'offer', offer.id, 'create', current_user.username
    )
    
    await db.commit()
    await db.refresh(offer)
    return offer


@router.get("/offers/{offer_id}", response_model=schemas_marketing.Offer)
async def get_offer(
    offer_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get an offer by ID"""
    result = await db.execute(
        select(models.Offer).where(models.Offer.id == offer_id)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer


@router.patch("/offers/{offer_id}", response_model=schemas_marketing.Offer)
async def update_offer(
    offer_id: UUID,
    offer_update: schemas_marketing.OfferUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update an offer"""
    result = await db.execute(
        select(models.Offer).where(models.Offer.id == offer_id)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    update_data = offer_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(offer, field)
        setattr(offer, field, value)
        await crud.write_audit(
            db, offer.tenant_id, 'offer', offer.id, 'update', current_user.username,
            field, str(old_value) if old_value is not None else None, str(value) if value is not None else None
        )
    
    await db.commit()
    await db.refresh(offer)
    return offer


@router.delete("/offers/{offer_id}")
async def delete_offer(
    offer_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Delete an offer"""
    result = await db.execute(
        select(models.Offer).where(models.Offer.id == offer_id)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    await crud.write_audit(
        db, offer.tenant_id, 'offer', offer.id, 'delete', current_user.username
    )
    
    await db.delete(offer)
    await db.commit()
    return {"deleted": True}


# Content Mix Tracking (Phase 2)

def get_week_start(d: date) -> date:
    """Get the Monday of the week containing the given date"""
    return d - timedelta(days=d.weekday())


@router.get("/content-mix/summary", response_model=List[schemas_marketing.ContentMixSummary])
async def get_content_mix_summary(
    tenant_id: str = Query(..., description="Tenant ID"),
    weeks: int = Query(4, ge=1, le=12, description="Number of weeks to include"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get content mix summary for all channel accounts over the specified weeks"""
    from datetime import date as date_type
    
    today = date_type.today()
    start_week = get_week_start(today - timedelta(weeks=weeks-1))
    
    # Get all channel accounts for tenant
    accounts_result = await db.execute(
        select(models.ChannelAccount).where(models.ChannelAccount.tenant_id == tenant_id)
    )
    accounts = accounts_result.scalars().all()
    
    summaries = []
    for account in accounts:
        # Calculate actual counts from PostInstances for current week
        current_week_start = get_week_start(today)
        current_week_end = current_week_start + timedelta(days=6)
        
        # Get post instances with content items for the current week
        posts_result = await db.execute(
            select(models.PostInstance)
            .join(models.ContentItem, models.PostInstance.content_item_id == models.ContentItem.id, isouter=True)
            .where(
                and_(
                    models.PostInstance.tenant_id == tenant_id,
                    models.PostInstance.channel_account_id == account.id,
                    models.PostInstance.scheduled_for >= datetime.combine(current_week_start, datetime.min.time()),
                    models.PostInstance.scheduled_for <= datetime.combine(current_week_end, datetime.max.time())
                )
            )
            .options(joinedload(models.PostInstance.content_item))
        )
        posts = posts_result.unique().scalars().all()
        
        # Count by category
        educational_count = 0
        authority_count = 0
        promo_count = 0
        local_count = 0
        
        for post in posts:
            if post.content_item:
                category = post.content_item.content_category or ''
                if category in ['diy', 'blog_post', 'educational']:
                    educational_count += 1
                elif category in ['team_post', 'authority']:
                    authority_count += 1
                elif category in ['coupon', 'promo', 'offer']:
                    promo_count += 1
                elif category in ['local', 'local_relevance']:
                    local_count += 1
        
        # Get or default targets (could be stored in tracking table or account config)
        target_educational = 2
        target_authority = 1
        target_promo = 1
        target_local = 1
        
        # Calculate health and warnings
        warnings = []
        if promo_count > target_promo + 1:
            warnings.append(f"Too many promo posts ({promo_count} vs target {target_promo})")
        if educational_count < target_educational:
            warnings.append(f"Need more educational content ({educational_count}/{target_educational})")
        if authority_count < target_authority:
            warnings.append(f"Need more authority/team content ({authority_count}/{target_authority})")
        
        total_actual = educational_count + authority_count + promo_count + local_count
        total_target = target_educational + target_authority + target_promo + target_local
        
        if len(warnings) == 0:
            overall_health = 'good'
        elif len(warnings) <= 2:
            overall_health = 'warning'
        else:
            overall_health = 'critical'
        
        summary = schemas_marketing.ContentMixSummary(
            channel_account_id=account.id,
            channel_account_name=account.name,
            week_start_date=current_week_start,
            educational={
                'actual': educational_count,
                'target': target_educational,
                'percentage': (educational_count / target_educational * 100) if target_educational > 0 else 0
            },
            authority={
                'actual': authority_count,
                'target': target_authority,
                'percentage': (authority_count / target_authority * 100) if target_authority > 0 else 0
            },
            promo={
                'actual': promo_count,
                'target': target_promo,
                'percentage': (promo_count / target_promo * 100) if target_promo > 0 else 0
            },
            local_relevance={
                'actual': local_count,
                'target': target_local,
                'percentage': (local_count / target_local * 100) if target_local > 0 else 0
            },
            overall_health=overall_health,
            warnings=warnings
        )
        summaries.append(summary)
    
    return summaries


# Seasonal Events (Phase 3)

@router.get("/seasonal-events", response_model=List[schemas_marketing.SeasonalEvent])
async def list_seasonal_events(
    tenant_id: str = Query(..., description="Tenant ID"),
    start_date: Optional[date] = Query(None, description="Filter events starting from this date"),
    end_date: Optional[date] = Query(None, description="Filter events ending before this date"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    city: Optional[str] = Query(None, description="Filter by city"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List seasonal events with optional filters"""
    query = select(models.SeasonalEvent).where(
        models.SeasonalEvent.tenant_id == tenant_id
    )
    
    if start_date:
        query = query.where(models.SeasonalEvent.end_date >= start_date)
    if end_date:
        query = query.where(models.SeasonalEvent.start_date <= end_date)
    if event_type:
        query = query.where(models.SeasonalEvent.event_type == event_type)
    if city:
        query = query.where(models.SeasonalEvent.city.ilike(f"%{city}%"))
    
    query = query.order_by(
        models.SeasonalEvent.start_date.asc()
    ).limit(limit).offset(offset)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/seasonal-events/upcoming", response_model=List[schemas_marketing.SeasonalEvent])
async def get_upcoming_events(
    tenant_id: str = Query(..., description="Tenant ID"),
    days: int = Query(30, ge=1, le=90, description="Number of days to look ahead"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get events happening in the next N days"""
    from datetime import date as date_type
    today = date_type.today()
    future_date = today + timedelta(days=days)
    
    result = await db.execute(
        select(models.SeasonalEvent).where(
            and_(
                models.SeasonalEvent.tenant_id == tenant_id,
                models.SeasonalEvent.start_date <= future_date,
                models.SeasonalEvent.end_date >= today
            )
        ).order_by(models.SeasonalEvent.start_date.asc())
    )
    return result.scalars().all()


@router.post("/seasonal-events", response_model=schemas_marketing.SeasonalEvent, status_code=status.HTTP_201_CREATED)
async def create_seasonal_event(
    event_in: schemas_marketing.SeasonalEventCreate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a new seasonal event"""
    event = models.SeasonalEvent(**event_in.model_dump())
    db.add(event)
    await db.flush()
    
    await crud.write_audit(
        db, event.tenant_id, 'seasonal_event', event.id, 'create', current_user.username
    )
    
    await db.commit()
    await db.refresh(event)
    return event


@router.get("/seasonal-events/{event_id}", response_model=schemas_marketing.SeasonalEvent)
async def get_seasonal_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get a seasonal event by ID"""
    result = await db.execute(
        select(models.SeasonalEvent).where(models.SeasonalEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Seasonal event not found")
    return event


@router.patch("/seasonal-events/{event_id}", response_model=schemas_marketing.SeasonalEvent)
async def update_seasonal_event(
    event_id: UUID,
    event_update: schemas_marketing.SeasonalEventUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update a seasonal event"""
    result = await db.execute(
        select(models.SeasonalEvent).where(models.SeasonalEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Seasonal event not found")
    
    update_data = event_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(event, field)
        setattr(event, field, value)
        await crud.write_audit(
            db, event.tenant_id, 'seasonal_event', event.id, 'update', current_user.username,
            field, str(old_value) if old_value is not None else None, str(value) if value is not None else None
        )
    
    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/seasonal-events/{event_id}")
async def delete_seasonal_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Delete a seasonal event"""
    result = await db.execute(
        select(models.SeasonalEvent).where(models.SeasonalEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Seasonal event not found")
    
    await crud.write_audit(
        db, event.tenant_id, 'seasonal_event', event.id, 'delete', current_user.username
    )
    
    await db.delete(event)
    await db.commit()
    return {"deleted": True}


# Review-to-Content Pipeline (Phase 3)

@router.post("/reviews/{review_id}/flag-for-content")
async def flag_review_for_content(
    review_id: UUID,
    flag: bool = Query(True, description="True to flag, False to unflag"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Flag or unflag a review as potential marketing content"""
    result = await db.execute(
        select(models.Review).where(models.Review.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    review.can_be_content = flag
    
    await crud.write_audit(
        db, None, 'review', review.id, 'update', current_user.username,
        'can_be_content', str(not flag), str(flag)
    )
    
    await db.commit()
    return {"flagged": flag, "review_id": str(review_id)}


@router.get("/reviews/flagged-for-content")
async def get_reviews_flagged_for_content(
    tenant_id: str = Query(..., description="Tenant ID"),
    include_converted: bool = Query(False, description="Include reviews already converted to content"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get all reviews flagged for potential content use"""
    query = select(models.Review).join(
        models.ReviewRequest, models.Review.review_request_id == models.ReviewRequest.id
    ).where(
        and_(
            models.ReviewRequest.tenant_id == tenant_id,
            models.Review.can_be_content == True,
            models.Review.rating >= 4  # Only 4+ star reviews
        )
    )
    
    if not include_converted:
        query = query.where(models.Review.content_item_id.is_(None))
    
    query = query.order_by(models.Review.created_at.desc()).limit(limit)
    
    result = await db.execute(query)
    reviews = result.scalars().all()
    
    return [
        {
            "id": str(review.id),
            "rating": review.rating,
            "comment": review.comment,
            "customer_name": review.customer_name,
            "is_converted": review.content_item_id is not None,
            "content_item_id": str(review.content_item_id) if review.content_item_id else None,
            "created_at": review.created_at.isoformat()
        }
        for review in reviews
    ]


@router.post("/reviews/{review_id}/convert-to-content", response_model=schemas_marketing.ContentItem)
async def convert_review_to_content(
    review_id: UUID,
    request: schemas_marketing.ReviewToContentRequest,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Convert a flagged review into marketing content with scheduled posts"""
    # Get the review
    result = await db.execute(
        select(models.Review)
        .join(models.ReviewRequest)
        .where(models.Review.id == review_id)
        .options(joinedload(models.Review.review_request))
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if review.rating < 4:
        raise HTTPException(status_code=400, detail="Only 4+ star reviews can be converted to content")
    
    if review.content_item_id:
        raise HTTPException(status_code=400, detail="Review has already been converted to content")
    
    # Get tenant_id from review request
    tenant_id = review.review_request.tenant_id
    
    # Generate caption from review
    if request.custom_caption:
        caption = request.custom_caption
    else:
        # Auto-generate a testimonial post caption
        first_name = review.customer_name.split()[0] if review.customer_name else "A customer"
        stars = "⭐" * review.rating
        quote = review.comment[:200] + "..." if review.comment and len(review.comment) > 200 else (review.comment or "")
        caption = f'{stars}\n\n"{quote}"\n\n— {first_name}\n\nThank you for trusting us with your plumbing needs! 🔧💙\n\n#CustomerReview #5StarService #PlumbingExperts #Testimonial'
    
    # Create ContentItem
    content_item = models.ContentItem(
        tenant_id=tenant_id,
        title=f"Customer Review: {review.customer_name}",
        base_caption=caption,
        content_category='authority',  # Reviews build authority
        status='Draft',
        owner=current_user.username,
        source_type='review',
        source_ref=str(review_id)
    )
    db.add(content_item)
    await db.flush()
    
    # Link review to content item
    review.content_item_id = content_item.id
    
    # Create PostInstances for each channel
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
            content_item_id=content_item.id,
            channel_account_id=channel_account_id,
            scheduled_for=request.scheduled_for,
            status='Scheduled' if request.scheduled_for else 'Draft'
        )
        db.add(instance)
        instances.append(instance)
    
    # Audit logs
    await crud.write_audit(
        db, tenant_id, 'content_item', content_item.id, 'create', current_user.username
    )
    await crud.write_audit(
        db, None, 'review', review.id, 'update', current_user.username,
        'content_item_id', None, str(content_item.id)
    )
    
    await db.commit()
    
    # Re-query with relationships
    result = await db.execute(
        select(models.ContentItem)
        .where(models.ContentItem.id == content_item.id)
        .options(selectinload(models.ContentItem.media_assets))
    )
    content_item = result.scalar_one()
    return content_item

