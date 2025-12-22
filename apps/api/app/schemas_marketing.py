from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
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
    status: str = 'Idea'
    owner: str
    reviewer: Optional[str] = None
    draft_due_date: Optional[datetime] = None
    notes: Optional[str] = None
    source_type: Optional[str] = None
    source_ref: Optional[str] = None

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
    status: Optional[str] = None
    owner: Optional[str] = None
    reviewer: Optional[str] = None
    draft_due_date: Optional[datetime] = None
    notes: Optional[str] = None
    source_type: Optional[str] = None
    source_ref: Optional[str] = None

class ContentItem(ContentItemBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Post Instances

class PostInstanceBase(BaseModel):
    tenant_id: str
    content_item_id: UUID
    channel_account_id: UUID
    caption_override: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    status: str = 'Draft'
    posted_at: Optional[datetime] = None
    post_url: Optional[str] = None
    posted_manually: bool = False
    screenshot_url: Optional[str] = None
    autopost_enabled: bool = False
    publish_job_id: Optional[UUID] = None
    last_error: Optional[str] = None

    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ['Planned', 'Draft', 'Scheduled', 'Posted', 'Failed']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v

class PostInstanceCreate(PostInstanceBase):
    pass

class PostInstanceUpdate(BaseModel):
    caption_override: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    status: Optional[str] = None
    posted_at: Optional[datetime] = None
    post_url: Optional[str] = None
    posted_manually: Optional[bool] = None
    screenshot_url: Optional[str] = None
    autopost_enabled: Optional[bool] = None
    publish_job_id: Optional[UUID] = None
    last_error: Optional[str] = None

class PostInstance(PostInstanceBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

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