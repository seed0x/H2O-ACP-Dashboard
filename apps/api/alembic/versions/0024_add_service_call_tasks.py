"""Add service call tasks/check-offs for tracking follow-ups

Revision ID: 0024
Revises: 0023
Create Date: 2026-01-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0024'
down_revision = '0023'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('service_call_tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('service_call_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('service_calls.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tenant_id', sa.Text, nullable=False),
        sa.Column('task_type', sa.String(), nullable=False),
        sa.Column('title', sa.Text, nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('assigned_to', sa.String(), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_by', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('created_by', sa.String(), nullable=True)
    )
    
    op.create_index('ix_service_call_tasks_service_call_id', 'service_call_tasks', ['service_call_id'])
    op.create_index('ix_service_call_tasks_status', 'service_call_tasks', ['status'])
    op.create_index('ix_service_call_tasks_assigned_to', 'service_call_tasks', ['assigned_to'])
    op.create_index('ix_service_call_tasks_due_date', 'service_call_tasks', ['due_date'])
    op.create_index('ix_service_call_tasks_tenant_status', 'service_call_tasks', ['tenant_id', 'status'])


def downgrade():
    op.drop_index('ix_service_call_tasks_tenant_status', table_name='service_call_tasks')
    op.drop_index('ix_service_call_tasks_due_date', table_name='service_call_tasks')
    op.drop_index('ix_service_call_tasks_assigned_to', table_name='service_call_tasks')
    op.drop_index('ix_service_call_tasks_status', table_name='service_call_tasks')
    op.drop_index('ix_service_call_tasks_service_call_id', table_name='service_call_tasks')
    op.drop_table('service_call_tasks')

