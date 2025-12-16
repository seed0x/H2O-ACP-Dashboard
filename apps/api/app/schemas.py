from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID

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

class ServiceCallCreate(ServiceCallBase):
    pass

class ServiceCallUpdate(BaseModel):
    status: Optional[str]
    scheduled_start: Optional[datetime]
    scheduled_end: Optional[datetime]
    notes: Optional[str]

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

