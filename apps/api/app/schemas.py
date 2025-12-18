from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from enum import Enum

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# User Management Schemas

class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: str = "user"
    tenant_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    tenant_id: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class BuilderBase(BaseModel):
    name: str
    notes: Optional[str] = None

class BuilderCreate(BuilderBase):
    pass

class BuilderUpdate(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None

class BuilderOut(BuilderBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BuilderContactBase(BaseModel):
    name: str
    role: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    preferred_contact_method: Optional[str] = None
    notes: Optional[str] = None
    visibility: Optional[str] = "both"

class BuilderContactCreate(BuilderContactBase):
    pass

class BuilderContactUpdate(BaseModel):
    name: Optional[str]
    role: Optional[str]
    phone: Optional[str]
    email: Optional[EmailStr]
    preferred_contact_method: Optional[str]
    notes: Optional[str]
    visibility: Optional[str]

class BuilderContactOut(BuilderContactBase):
    id: UUID
    builder_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BidBase(BaseModel):
    tenant_id: str
    project_name: str
    status: str
    builder_id: Optional[UUID]

class BidCreate(BidBase):
    due_date: Optional[date]
    sent_date: Optional[date]
    amount_cents: Optional[int]
    notes: Optional[str]

class BidUpdate(BaseModel):
    project_name: Optional[str]
    status: Optional[str]
    builder_id: Optional[UUID]
    due_date: Optional[date]
    sent_date: Optional[date]
    amount_cents: Optional[int]
    notes: Optional[str]

class BidOut(BidBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BidLineItemBase(BaseModel):
    category: str
    description: str
    qty: Optional[float] = 1
    unit_price_cents: Optional[int]
    total_cents: Optional[int]
    notes: Optional[str]

class BidLineItemCreate(BidLineItemBase):
    pass

class BidLineItemUpdate(BaseModel):
    category: Optional[str]
    description: Optional[str]
    qty: Optional[float]
    unit_price_cents: Optional[int]
    total_cents: Optional[int]
    notes: Optional[str]

class BidLineItemOut(BidLineItemBase):
    id: UUID
    bid_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class JobBase(BaseModel):
    tenant_id: str
    builder_id: UUID
    community: str
    lot_number: str
    plan: Optional[str]
    phase: str
    status: str
    address_line1: str
    city: str
    state: Optional[str] = "WA"
    zip: str
    scheduled_start: Optional[datetime]
    scheduled_end: Optional[datetime]
    notes: Optional[str]
    tech_name: Optional[str] = None
    assigned_to: Optional[str] = None
    warranty_start_date: Optional[date] = None
    warranty_end_date: Optional[date] = None
    warranty_notes: Optional[str] = None
    completion_date: Optional[date] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    status: Optional[str]
    scheduled_start: Optional[datetime]
    scheduled_end: Optional[datetime]
    notes: Optional[str]
    assigned_to: Optional[str] = None
    warranty_start_date: Optional[date] = None
    warranty_end_date: Optional[date] = None
    warranty_notes: Optional[str] = None
    completion_date: Optional[date] = None

class JobOut(JobBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ServiceCallBase(BaseModel):
    tenant_id: str
    builder_id: Optional[UUID]
    customer_name: str
    phone: Optional[str]
    email: Optional[EmailStr]
    address_line1: str
    city: str
    state: Optional[str] = "WA"
    zip: str
    issue_description: str
    priority: Optional[str] = "Normal"
    status: str
    scheduled_start: Optional[datetime]
    scheduled_end: Optional[datetime]
    notes: Optional[str]
    assigned_to: Optional[str] = None

class ServiceCallCreate(ServiceCallBase):
    pass

class ServiceCallUpdate(BaseModel):
    status: Optional[str]
    scheduled_start: Optional[datetime]
    scheduled_end: Optional[datetime]
    notes: Optional[str]
    assigned_to: Optional[str] = None

class ServiceCallOut(ServiceCallBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: UUID
    tenant_id: Optional[str]
    entity_type: str
    entity_id: UUID
    action: str
    field: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    changed_by: str
    changed_at: datetime

    class Config:
        from_attributes = True

# Review System Schemas

class ReviewRequestBase(BaseModel):
    tenant_id: str
    service_call_id: Optional[UUID] = None
    job_id: Optional[UUID] = None
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

class ReviewRequestCreate(ReviewRequestBase):
    pass

class ReviewRequestOut(ReviewRequestBase):
    id: UUID
    token: str
    status: str
    sent_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    reminder_sent: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ReviewRequestUpdate(BaseModel):
    status: Optional[str] = None
    sent_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    reminder_sent: Optional[bool] = None

class ReviewBase(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    customer_name: str
    customer_email: Optional[str] = None

class ReviewCreate(ReviewBase):
    token: str  # Token from review request

class ReviewOut(ReviewBase):
    id: UUID
    review_request_id: UUID
    is_public: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ReviewUpdate(BaseModel):
    is_public: Optional[bool] = None

class PublicReviewCreate(BaseModel):
    token: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    customer_name: str
    customer_email: Optional[str] = None

class RecoveryTicketBase(BaseModel):
    tenant_id: str
    review_id: UUID
    service_call_id: Optional[UUID] = None
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    issue_description: str

class RecoveryTicketCreate(RecoveryTicketBase):
    pass

class RecoveryTicketOut(RecoveryTicketBase):
    id: UUID
    status: str
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RecoveryTicketUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None

# Notification Schemas

class NotificationOut(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    tenant_id: str
    type: str
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationCount(BaseModel):
    count: int

# Portals Directory Schemas

class PortalCategory(str, Enum):
    permit = "permit"
    inspection = "inspection"
    utility = "utility"
    vendor = "vendor"
    builder = "builder"
    warranty = "warranty"
    finance = "finance"
    other = "other"

class TenantEnum(str, Enum):
    h2o = "h2o"
    all_county = "all_county"

class PortalRuleAppliesTo(str, Enum):
    job = "job"
    service_call = "service_call"

class JobPhase(str, Enum):
    rough = "rough"
    trim = "trim"
    final = "final"

class PortalDefinitionBase(BaseModel):
    name: str
    category: PortalCategory
    jurisdiction: Optional[str] = None
    base_url: str
    support_phone: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True

class PortalDefinitionCreate(PortalDefinitionBase):
    pass

class PortalDefinitionUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[PortalCategory] = None
    jurisdiction: Optional[str] = None
    base_url: Optional[str] = None
    support_phone: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class PortalDefinitionOut(PortalDefinitionBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PortalAccountBase(BaseModel):
    portal_definition_id: UUID
    tenant_id: TenantEnum
    login_identifier: str
    account_number: Optional[str] = None
    credential_vault_ref: Optional[str] = None
    notes: Optional[str] = None
    owner: Optional[str] = None
    last_verified_at: Optional[datetime] = None
    is_active: bool = True

class PortalAccountCreate(PortalAccountBase):
    pass

class PortalAccountUpdate(BaseModel):
    portal_definition_id: Optional[UUID] = None
    tenant_id: Optional[TenantEnum] = None
    login_identifier: Optional[str] = None
    account_number: Optional[str] = None
    credential_vault_ref: Optional[str] = None
    notes: Optional[str] = None
    owner: Optional[str] = None
    last_verified_at: Optional[datetime] = None
    is_active: Optional[bool] = None

class PortalAccountOut(PortalAccountBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    portal_definition: Optional[PortalDefinitionOut] = None

    class Config:
        from_attributes = True

class BuilderPortalAccountCreate(BaseModel):
    builder_id: UUID
    portal_account_id: UUID

class BuilderPortalAccountOut(BaseModel):
    builder_id: UUID
    portal_account_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class PortalRuleBase(BaseModel):
    applies_to: PortalRuleAppliesTo
    tenant_id: Optional[TenantEnum] = None
    builder_id: Optional[UUID] = None
    city: Optional[str] = None
    county: Optional[str] = None
    permit_required: Optional[bool] = None
    phase: Optional[JobPhase] = None
    portal_account_id: UUID
    priority: int = 100
    is_active: bool = True

class PortalRuleCreate(PortalRuleBase):
    pass

class PortalRuleUpdate(BaseModel):
    applies_to: Optional[PortalRuleAppliesTo] = None
    tenant_id: Optional[TenantEnum] = None
    builder_id: Optional[UUID] = None
    city: Optional[str] = None
    county: Optional[str] = None
    permit_required: Optional[bool] = None
    phase: Optional[JobPhase] = None
    portal_account_id: Optional[UUID] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None

class PortalRuleOut(PortalRuleBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    portal_account: Optional[PortalAccountOut] = None

    class Config:
        from_attributes = True

class SuggestedPortalsRequest(BaseModel):
    applies_to: PortalRuleAppliesTo
    tenant_id: TenantEnum
    city: Optional[str] = None
    county: Optional[str] = None
    builder_id: Optional[UUID] = None
    permit_required: Optional[bool] = None
    phase: Optional[JobPhase] = None

