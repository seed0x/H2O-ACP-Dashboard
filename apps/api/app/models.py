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
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

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
