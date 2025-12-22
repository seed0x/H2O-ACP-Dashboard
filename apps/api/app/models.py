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
    tech_name = Column(Text, nullable=True)
    assigned_to = Column(String, nullable=True)  # Owner/assignee for accountability
    
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
    assigned_to = Column(String, nullable=True)  # Owner/assignee for accountability

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
    # Scheduling configuration
    posts_per_week = Column(Integer, nullable=True, default=3)  # Number of posts per week
    schedule_timezone = Column(String, nullable=True, default='America/Los_Angeles')  # IANA timezone
    schedule_times = Column(ARRAY(String), nullable=True)  # Array of times like ["09:00", "14:00"]
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    channel = relationship("MarketingChannel", back_populates="accounts")

class ContentItem(Base):
    __tablename__ = "content_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Text, nullable=False)
    title = Column(String, nullable=False)
    base_caption = Column(Text, nullable=True)  # Base caption that can be overridden per instance
    media_urls = Column(ARRAY(String), nullable=True)
    cta_type = Column(String, nullable=True)
    cta_url = Column(String, nullable=True)
    tags = Column(ARRAY(String), nullable=True)
    target_city = Column(String, nullable=True)
    template_id = Column(UUID(as_uuid=True), nullable=True)  # Reference to template (future)
    status = Column(String, nullable=False, default='Idea')  # Idea → Draft → Needs Approval → Scheduled → Posted
    owner = Column(String, nullable=False)
    reviewer = Column(String, nullable=True)
    draft_due_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    source_type = Column(String, nullable=True)
    source_ref = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    post_instances = relationship("PostInstance", back_populates="content_item", cascade="all, delete-orphan")

class PostInstance(Base):
    __tablename__ = "post_instances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Text, nullable=False)
    content_item_id = Column(UUID(as_uuid=True), ForeignKey("content_items.id"), nullable=False)
    channel_account_id = Column(UUID(as_uuid=True), ForeignKey("channel_accounts.id"), nullable=False)
    
    # Per-account customization
    caption_override = Column(Text, nullable=True)  # Override base_caption for this account
    scheduled_for = Column(DateTime(timezone=True), nullable=True)
    
    # Posting status
    status = Column(String, nullable=False, default='Draft')  # Draft → Scheduled → Posted → Failed
    
    # Posting metadata
    posted_at = Column(DateTime(timezone=True), nullable=True)
    post_url = Column(String, nullable=True)  # URL of the actual post on the platform
    posted_manually = Column(Boolean, nullable=False, default=False)
    screenshot_url = Column(String, nullable=True)  # Link to screenshot if posted manually
    
    # Autopost
    autopost_enabled = Column(Boolean, nullable=False, default=False)
    publish_job_id = Column(UUID(as_uuid=True), ForeignKey("publish_jobs.id"), nullable=True)  # Reference to PublishJob if autoposted
    
    # Error tracking
    last_error = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    content_item = relationship("ContentItem", back_populates="post_instances")
    channel_account = relationship("ChannelAccount")

# ContentPost model removed - using ContentItem and PostInstance instead
# The content_posts table still exists in the database from previous migrations
# but is no longer used in the application

class PublishJob(Base):
    __tablename__ = "publish_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Text, nullable=False)
    post_instance_id = Column(UUID(as_uuid=True), ForeignKey("post_instances.id"), nullable=False)
    attempt_no = Column(Integer, nullable=False, default=1)
    method = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    status = Column(String, nullable=False)
    response_ref = Column(String, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    post_instance = relationship("PostInstance", foreign_keys=[post_instance_id])

# Review System Models

class ReviewRequest(Base):
    __tablename__ = "review_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Text, nullable=False)
    service_call_id = Column(UUID(as_uuid=True), ForeignKey("service_calls.id"), nullable=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=True)
    customer_name = Column(Text, nullable=False)
    customer_email = Column(Text, nullable=True)
    customer_phone = Column(Text, nullable=True)
    token = Column(String, nullable=False, unique=True)  # Unique token for public review link
    status = Column(String, nullable=False, default='pending')  # pending, sent, completed, expired
    sent_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    reminder_sent = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    review = relationship("Review", back_populates="review_request", uselist=False)

class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_request_id = Column(UUID(as_uuid=True), ForeignKey("review_requests.id"), nullable=False, unique=True)
    rating = Column(Integer, nullable=False)  # 1-5 stars
    comment = Column(Text, nullable=True)
    customer_name = Column(Text, nullable=False)
    customer_email = Column(Text, nullable=True)
    is_public = Column(Boolean, nullable=False, default=False)  # Whether to show on public page
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    review_request = relationship("ReviewRequest", back_populates="review")

class RecoveryTicket(Base):
    __tablename__ = "recovery_tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Text, nullable=False)
    review_id = Column(UUID(as_uuid=True), ForeignKey("reviews.id"), nullable=False)
    service_call_id = Column(UUID(as_uuid=True), ForeignKey("service_calls.id"), nullable=True)
    customer_name = Column(Text, nullable=False)
    customer_email = Column(Text, nullable=True)
    customer_phone = Column(Text, nullable=True)
    issue_description = Column(Text, nullable=False)
    status = Column(String, nullable=False, default='open')  # open, in_progress, resolved, closed
    assigned_to = Column(String, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

# Notification System

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # None = all users in tenant
    tenant_id = Column(Text, nullable=False)
    type = Column(String, nullable=False)  # 'overdue', 'reminder', 'status_change', 'review_received', 'escalation'
    title = Column(Text, nullable=False)
    message = Column(Text, nullable=False)
    entity_type = Column(String, nullable=True)  # 'job', 'service_call', 'review_request', 'recovery_ticket'
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# Portals Directory Models

class PortalDefinition(Base):
    __tablename__ = "portal_definitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    category = Column(Enum('permit', 'inspection', 'utility', 'vendor', 'builder', 'warranty', 'finance', 'other', name='portal_category', create_type=False), nullable=False)
    jurisdiction = Column(Text, nullable=True)  # e.g., "City of Vancouver", "Clark County"
    base_url = Column(Text, nullable=False)
    support_phone = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    accounts = relationship("PortalAccount", back_populates="portal_definition")

class PortalAccount(Base):
    __tablename__ = "portal_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portal_definition_id = Column(UUID(as_uuid=True), ForeignKey("portal_definitions.id"), nullable=False)
    tenant_id = Column(Enum('h2o', 'all_county', name='tenant_enum', create_type=False), nullable=False)
    login_identifier = Column(Text, nullable=False)  # email/username
    account_number = Column(Text, nullable=True)  # customer_id
    credential_vault_ref = Column(Text, nullable=True)  # e.g., "1Password → H2O → Vancouver Permits"
    notes = Column(Text, nullable=True)
    owner = Column(Text, nullable=True)  # user/email
    last_verified_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    portal_definition = relationship("PortalDefinition", back_populates="accounts")
    builder_links = relationship("BuilderPortalAccount", back_populates="portal_account", cascade="all, delete-orphan")

class BuilderPortalAccount(Base):
    __tablename__ = "builder_portal_accounts"

    builder_id = Column(UUID(as_uuid=True), ForeignKey("builders.id", ondelete="CASCADE"), primary_key=True)
    portal_account_id = Column(UUID(as_uuid=True), ForeignKey("portal_accounts.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    builder = relationship("Builder")
    portal_account = relationship("PortalAccount", back_populates="builder_links")

class PortalRule(Base):
    __tablename__ = "portal_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    applies_to = Column(Enum('job', 'service_call', name='portal_rule_applies_to', create_type=False), nullable=False)
    tenant_id = Column(Enum('h2o', 'all_county', name='tenant_enum', create_type=False), nullable=True)  # null = both tenants
    builder_id = Column(UUID(as_uuid=True), ForeignKey("builders.id"), nullable=True)
    city = Column(Text, nullable=True)
    county = Column(Text, nullable=True)
    permit_required = Column(Boolean, nullable=True)
    phase = Column(Enum('rough', 'trim', 'final', name='job_phase', create_type=False), nullable=True)
    portal_account_id = Column(UUID(as_uuid=True), ForeignKey("portal_accounts.id"), nullable=False)
    priority = Column(Integer, nullable=False, default=100)  # Lower = higher priority
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())