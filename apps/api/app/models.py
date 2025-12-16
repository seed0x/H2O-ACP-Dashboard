from sqlalchemy import (
    Column,
    String,
    Text,
    Date,
    Integer,
    DateTime,
    ForeignKey,
    Numeric,
    Enum,
    UniqueConstraint,
    Table,
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

# User Management Models

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, nullable=False, unique=True)
    email = Column(String, nullable=True, unique=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, nullable=False, default='user')  # 'admin', 'user', 'viewer'
    is_active = Column(Boolean, nullable=False, default=True)
    tenant_id = Column(Text, nullable=True)  # If None, user has access to all tenants
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

class Builder(Base):
    __tablename__ = "builders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False, unique=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    contacts = relationship("BuilderContact", back_populates="builder", cascade="all, delete")

class BuilderContact(Base):
    __tablename__ = "builder_contacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    builder_id = Column(UUID(as_uuid=True), ForeignKey("builders.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    role = Column(Text, nullable=False)
    phone = Column(Text, nullable=True)
    email = Column(Text, nullable=True)
    preferred_contact_method = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    visibility = Column(Text, nullable=False, default='both')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    builder = relationship("Builder", back_populates="contacts")

class Bid(Base):
    __tablename__ = "bids"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Text, nullable=False)
    builder_id = Column(UUID(as_uuid=True), ForeignKey("builders.id"), nullable=True)
    project_name = Column(Text, nullable=False)
    status = Column(Text, nullable=False)
    due_date = Column(Date, nullable=True)
    sent_date = Column(Date, nullable=True)
    amount_cents = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    line_items = relationship("BidLineItem", back_populates="bid", cascade="all, delete")

class BidLineItem(Base):
    __tablename__ = "bid_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bid_id = Column(UUID(as_uuid=True), ForeignKey("bids.id", ondelete="CASCADE"), nullable=False)
    category = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    qty = Column(Numeric, nullable=True, default=1)
    unit_price_cents = Column(Integer, nullable=True)
    total_cents = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    bid = relationship("Bid", back_populates="line_items")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Text, nullable=False)
    builder_id = Column(UUID(as_uuid=True), ForeignKey("builders.id"), nullable=False)
    community = Column(Text, nullable=False)
    lot_number = Column(Text, nullable=False)
    plan = Column(Text, nullable=True)
    phase = Column(Text, nullable=False)
    status = Column(Text, nullable=False)
    address_line1 = Column(Text, nullable=False)
    city = Column(Text, nullable=False)
    state = Column(Text, nullable=False, default='WA')
    zip = Column(Text, nullable=False)
    scheduled_start = Column(DateTime(timezone=True), nullable=True)
    scheduled_end = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Warranty tracking
    warranty_start_date = Column(Date, nullable=True)
    warranty_end_date = Column(Date, nullable=True)
    warranty_notes = Column(Text, nullable=True)
    completion_date = Column(Date, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('builder_id', 'community', 'lot_number', 'phase', 'tenant_id', name='uq_job_per_lot_phase'),
    )

class ServiceCall(Base):
    __tablename__ = "service_calls"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Text, nullable=False)
    builder_id = Column(UUID(as_uuid=True), ForeignKey("builders.id"), nullable=True)
    customer_name = Column(Text, nullable=False)
    phone = Column(Text, nullable=True)
    email = Column(Text, nullable=True)
    address_line1 = Column(Text, nullable=False)
    city = Column(Text, nullable=False)
    state = Column(Text, nullable=False, default='WA')
    zip = Column(Text, nullable=False)
    issue_description = Column(Text, nullable=False)
    priority = Column(Text, nullable=False, default='Normal')
    status = Column(Text, nullable=False)
    scheduled_start = Column(DateTime(timezone=True), nullable=True)
    scheduled_end = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class JobContact(Base):
    __tablename__ = "job_contacts"

    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True)
    builder_contact_id = Column(UUID(as_uuid=True), ForeignKey("builder_contacts.id"), primary_key=True)
    role_on_job = Column(Text, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Text, nullable=True)
    entity_type = Column(Text, nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(Text, nullable=False)
    field = Column(Text, nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    changed_by = Column(Text, nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())

# Marketing Module Models

class MarketingChannel(Base):
    __tablename__ = "marketing_channels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String, nullable=False, unique=True)
    display_name = Column(String, nullable=False)
    supports_autopost = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    accounts = relationship("ChannelAccount", back_populates="channel")

class ChannelAccount(Base):
    __tablename__ = "channel_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Text, nullable=False)
    channel_id = Column(UUID(as_uuid=True), ForeignKey("marketing_channels.id"), nullable=False)
    name = Column(String, nullable=False)
    external_id = Column(String, nullable=True)
    profile_url = Column(String, nullable=True)
    login_email = Column(String, nullable=True)
    credential_vault_ref = Column(String, nullable=True)
    oauth_connected = Column(Boolean, nullable=False, default=False)
    oauth_provider = Column(String, nullable=True)
    oauth_token_ref = Column(String, nullable=True)
    status = Column(String, nullable=False, default='active')
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    channel = relationship("MarketingChannel", back_populates="accounts")

class ContentPost(Base):
    __tablename__ = "content_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Text, nullable=False)
    title = Column(String, nullable=False)
    channel_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False)
    status = Column(String, nullable=False)
    scheduled_for = Column(DateTime(timezone=True), nullable=True)
    draft_due_date = Column(DateTime(timezone=True), nullable=True)
    posted_at = Column(DateTime(timezone=True), nullable=True)
    owner = Column(String, nullable=False)
    reviewer = Column(String, nullable=True)
    body_text = Column(Text, nullable=True)
    cta_type = Column(String, nullable=True)
    cta_url = Column(String, nullable=True)
    target_city = Column(String, nullable=True)
    tags = Column(ARRAY(String), nullable=True)
    source_type = Column(String, nullable=True)
    source_ref = Column(String, nullable=True)
    media_type = Column(String, nullable=True)
    media_urls = Column(ARRAY(String), nullable=True)
    notes = Column(Text, nullable=True)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    publish_jobs = relationship("PublishJob", back_populates="content_post")

class PublishJob(Base):
    __tablename__ = "publish_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Text, nullable=False)
    content_post_id = Column(UUID(as_uuid=True), ForeignKey("content_posts.id"), nullable=False)
    attempt_no = Column(Integer, nullable=False, default=1)
    method = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    status = Column(String, nullable=False)
    response_ref = Column(String, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    content_post = relationship("ContentPost", back_populates="publish_jobs")
