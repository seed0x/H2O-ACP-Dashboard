from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID

# Marketing Channels

class MarketingChannelBase(BaseModel):
    key: str
    display_name: str
    supports_autopost: bool

class MarketingChannel(MarketingChannelBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Channel Accounts

class ChannelAccountBase(BaseModel):
    tenant_id: str
    channel_id: UUID
    name: str
    external_id: Optional[str] = None
    profile_url: Optional[str] = None
    login_email: Optional[str] = None
    credential_vault_ref: Optional[str] = None
    oauth_connected: bool = False
    oauth_provider: Optional[str] = None
    oauth_token_ref: Optional[str] = None
    status: str = 'active'
    notes: Optional[str] = None
    posts_per_week: Optional[int] = 3
    schedule_timezone: Optional[str] = 'America/Los_Angeles'
    schedule_times: Optional[List[str]] = None

class ChannelAccountCreate(ChannelAccountBase):
    pass

class ChannelAccountUpdate(BaseModel):
    name: Optional[str] = None
    external_id: Optional[str] = None
    profile_url: Optional[str] = None
    login_email: Optional[str] = None
    credential_vault_ref: Optional[str] = None
    oauth_connected: Optional[bool] = None
    oauth_provider: Optional[str] = None
    oauth_token_ref: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    posts_per_week: Optional[int] = None
    schedule_timezone: Optional[str] = None
    schedule_times: Optional[List[str]] = None

class ChannelAccount(ChannelAccountBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Publish Jobs

class PublishJobBase(BaseModel):
    tenant_id: str
    post_instance_id: UUID
    attempt_no: int = 1
    method: str
    provider: str
    status: str
    response_ref: Optional[str] = None
    error: Optional[str] = None

class PublishJobCreate(PublishJobBase):
    pass

class PublishJob(PublishJobBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# Content Items

class ContentItemBase(BaseModel):
    tenant_id: str
    title: str
    base_caption: Optional[str] = None
    media_urls: Optional[List[str]] = None
    cta_type: Optional[str] = None
    cta_url: Optional[str] = None
    tags: Optional[List[str]] = None
    target_city: Optional[str] = None
    template_id: Optional[UUID] = None
    content_category: Optional[str] = None  # Category: 'ad_content', 'team_post', 'coupon', 'diy', 'blog_post'
    status: str = 'Idea'
    owner: str
    reviewer: Optional[str] = None
    draft_due_date: Optional[datetime] = None
    notes: Optional[str] = None
    source_type: Optional[str] = None
    source_ref: Optional[str] = None
    offer_id: Optional[UUID] = None  # Link to offer/promo

    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ['Idea', 'Draft', 'Needs Approval', 'Scheduled', 'Posted']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v

    @validator('cta_type')
    def validate_cta_type(cls, v):
        if v is not None:
            valid_types = ['CallNow', 'BookOnline', 'LearnMore', 'None']
            if v not in valid_types:
                raise ValueError(f'CTA type must be one of: {", ".join(valid_types)}')
        return v

class ContentItemCreate(ContentItemBase):
    pass

class ContentItemUpdate(BaseModel):
    title: Optional[str] = None
    base_caption: Optional[str] = None
    media_urls: Optional[List[str]] = None
    cta_type: Optional[str] = None
    cta_url: Optional[str] = None
    tags: Optional[List[str]] = None
    target_city: Optional[str] = None
    template_id: Optional[UUID] = None
    content_category: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    reviewer: Optional[str] = None
    draft_due_date: Optional[datetime] = None
    notes: Optional[str] = None
    source_type: Optional[str] = None
    source_ref: Optional[str] = None
    offer_id: Optional[UUID] = None

class MediaAssetBase(BaseModel):
    tenant_id: str
    content_item_id: Optional[UUID] = None
    file_name: str
    file_url: str
    file_type: str  # 'image', 'video'
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    intent_tags: Optional[List[str]] = None  # Tags like 'before_after', 'crew', 'job_site', 'emergency', 'water_heater', 'drain', 'sewer'

class MediaAssetCreate(MediaAssetBase):
    pass

class MediaAsset(MediaAssetBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class ContentItem(ContentItemBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    media_assets: Optional[List[MediaAsset]] = None

    class Config:
        from_attributes = True

# Post Instances

class PostInstanceBase(BaseModel):
    tenant_id: str
    content_item_id: Optional[UUID] = None  # Nullable for planned slots
    channel_account_id: UUID
    caption_override: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    status: str = 'Draft'
    reviewer: Optional[str] = None  # Who approved/reviewed this post instance
    suggested_category: Optional[str] = None  # Category hint: 'ad_content', 'team_post', 'coupon', 'diy', 'blog_post'
    posted_at: Optional[datetime] = None
    post_url: Optional[str] = None
    posted_manually: bool = False
    screenshot_url: Optional[str] = None
    autopost_enabled: bool = False
    publish_job_id: Optional[UUID] = None
    last_error: Optional[str] = None
    # GBP-specific fields
    gbp_post_type: Optional[str] = None  # 'update', 'offer', 'event', 'whats_new'
    gbp_cta_type: Optional[str] = None  # 'call', 'book', 'learn_more', 'order_online'
    gbp_location_targeting: Optional[str] = None  # City/area if applicable

    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ['Planned', 'Draft', 'Needs Approval', 'Approved', 'Scheduled', 'Posted', 'Failed']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v

class PostInstanceCreate(PostInstanceBase):
    pass

class PostInstanceUpdate(BaseModel):
    content_item_id: Optional[UUID] = None
    caption_override: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    status: Optional[str] = None
    reviewer: Optional[str] = None
    posted_at: Optional[datetime] = None
    post_url: Optional[str] = None
    posted_manually: Optional[bool] = None
    screenshot_url: Optional[str] = None
    autopost_enabled: Optional[bool] = None
    publish_job_id: Optional[UUID] = None
    last_error: Optional[str] = None
    # GBP-specific fields
    gbp_post_type: Optional[str] = None
    gbp_cta_type: Optional[str] = None
    gbp_location_targeting: Optional[str] = None

class PostInstance(PostInstanceBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    content_item: Optional[ContentItem] = None  # Relationship field (nullable for planned slots)
    channel_account: Optional[ChannelAccount] = None  # Relationship field

    class Config:
        from_attributes = True

# Request schemas for creating post instances from content item

class CreatePostInstancesRequest(BaseModel):
    content_item_id: UUID
    channel_account_ids: List[UUID]
    scheduled_for: Optional[datetime] = None

class MarkPostInstancePostedRequest(BaseModel):
    posted_at: Optional[datetime] = None
    post_url: Optional[str] = None
    screenshot_url: Optional[str] = None
    posted_manually: bool = True

# Offer/Promo Manager Schemas

class OfferBase(BaseModel):
    tenant_id: str
    title: str
    description: Optional[str] = None
    service_type: Optional[str] = None
    valid_from: date
    valid_to: date
    discount_type: str  # 'percentage', 'fixed_amount', 'free_service'
    discount_value: Optional[float] = None
    terms: Optional[str] = None
    is_active: bool = True
    coupon_code: Optional[str] = None
    website_url: Optional[str] = None
    sync_source: Optional[str] = 'manual'  # 'manual', 'website_file', 'api_sync'
    external_id: Optional[str] = None

class OfferCreate(OfferBase):
    pass

class OfferUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    service_type: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    terms: Optional[str] = None
    is_active: Optional[bool] = None
    coupon_code: Optional[str] = None
    website_url: Optional[str] = None
    sync_source: Optional[str] = None
    external_id: Optional[str] = None

class Offer(OfferBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Local SEO Topic Schemas

class LocalSEOTopicBase(BaseModel):
    tenant_id: str
    service_type: str
    city: str
    status: str = 'not_started'  # 'not_started', 'in_progress', 'published', 'needs_update'
    last_posted_at: Optional[datetime] = None
    last_post_instance_id: Optional[UUID] = None
    target_url: Optional[str] = None
    notes: Optional[str] = None

class LocalSEOTopicCreate(LocalSEOTopicBase):
    pass

class LocalSEOTopicUpdate(BaseModel):
    status: Optional[str] = None
    last_posted_at: Optional[datetime] = None
    last_post_instance_id: Optional[UUID] = None
    target_url: Optional[str] = None
    notes: Optional[str] = None

class LocalSEOTopic(LocalSEOTopicBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True