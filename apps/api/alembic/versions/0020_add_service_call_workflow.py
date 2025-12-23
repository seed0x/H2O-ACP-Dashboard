"""Add service call workflow tracking

Revision ID: 0020
Revises: 0019
Create Date: 2025-12-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

# revision identifiers, used by Alembic.
revision = '0020_add_service_call_workflow'
down_revision = '0019_add_job_tasks'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'service_call_workflows',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('service_call_id', UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', sa.Text(), nullable=False),
        sa.Column('current_step', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('paperwork_photo_urls', sa.ARRAY(sa.Text()), nullable=True),
        sa.Column('needs_permit', sa.Boolean(), nullable=True),
        sa.Column('permit_notes', sa.Text(), nullable=True),
        sa.Column('needs_reschedule', sa.Boolean(), nullable=True),
        sa.Column('reschedule_date', sa.Date(), nullable=True),
        sa.Column('reschedule_notes', sa.Text(), nullable=True),
        sa.Column('needs_parts_order', sa.Boolean(), nullable=True),
        sa.Column('parts_order_notes', sa.Text(), nullable=True),
        sa.Column('needs_bid', sa.Boolean(), nullable=True),
        sa.Column('bid_id', UUID(as_uuid=True), nullable=True),
        sa.Column('needs_pricing', sa.Boolean(), nullable=True),
        sa.Column('estimated_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('needs_price_approval', sa.Boolean(), nullable=True),
        sa.Column('price_approval_notes', sa.Text(), nullable=True),
        sa.Column('workflow_data', JSON(astext_type=sa.Text()), nullable=True),  # For flexible additional data
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['service_call_id'], ['service_calls.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['bid_id'], ['bids.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('service_call_id', name='uq_service_call_workflow')
    )
    op.create_index('ix_service_call_workflows_service_call_id', 'service_call_workflows', ['service_call_id'])
    op.create_index('ix_service_call_workflows_completed', 'service_call_workflows', ['completed'])


def downgrade() -> None:
    op.drop_index('ix_service_call_workflows_completed', table_name='service_call_workflows')
    op.drop_index('ix_service_call_workflows_service_call_id', table_name='service_call_workflows')
    op.drop_table('service_call_workflows')

