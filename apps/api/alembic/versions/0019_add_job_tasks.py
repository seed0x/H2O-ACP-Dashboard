"""Add job tasks table

Revision ID: 0019
Revises: 0018
Create Date: 2025-12-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '0019_add_job_tasks'
down_revision = '0018_add_brand_diet_and_notes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'job_tasks',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('job_id', UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', sa.Text(), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('assigned_to', sa.String(), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_job_tasks_job_id', 'job_tasks', ['job_id'])
    op.create_index('ix_job_tasks_status', 'job_tasks', ['status'])


def downgrade() -> None:
    op.drop_index('ix_job_tasks_status', table_name='job_tasks')
    op.drop_index('ix_job_tasks_job_id', table_name='job_tasks')
    op.drop_table('job_tasks')

