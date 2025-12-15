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

class ChannelAccount(ChannelAccountBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Content Posts

class ContentPostBase(BaseModel):
    tenant_id: str
    title: str
    channel_account_id: UUID
    status: str
    scheduled_for: Optional[datetime] = None
    posted_at: Optional[datetime] = None
    owner: str
    reviewer: Optional[str] = None
    caption: Optional[str] = None
    cta_type: Optional[str] = None
    cta_url: Optional[str] = None
    target_city: Optional[str] = None
    tags: Optional[List[str]] = None
    source_type: Optional[str] = None
    source_ref: Optional[str] = None
    media_type: Optional[str] = None
    media_urls: Optional[List[str]] = None
    notes: Optional[str] = None
    last_error: Optional[str] = None

    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ['Idea', 'Draft', 'Needs_Approval', 'Approved', 'Scheduled', 'Posted', 'Failed', 'Canceled']
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

class ContentPostCreate(ContentPostBase):
    pass

class ContentPostUpdate(BaseModel):
    title: Optional[str] = None
    channel_account_id: Optional[UUID] = None
    status: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    posted_at: Optional[datetime] = None
    owner: Optional[str] = None
    reviewer: Optional[str] = None
    caption: Optional[str] = None
    cta_type: Optional[str] = None
    cta_url: Optional[str] = None
    target_city: Optional[str] = None
    tags: Optional[List[str]] = None
    source_type: Optional[str] = None
    source_ref: Optional[str] = None
    media_type: Optional[str] = None
    media_urls: Optional[List[str]] = None
    notes: Optional[str] = None
    last_error: Optional[str] = None

class ContentPost(ContentPostBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Publish Jobs

class PublishJobBase(BaseModel):
    tenant_id: str
    content_post_id: UUID
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

# Action schemas

class MarkPostedRequest(BaseModel):
    posted_at: Optional[datetime] = None

class MarkFailedRequest(BaseModel):
    error: str

class QueuePublishRequest(BaseModel):
    pass
