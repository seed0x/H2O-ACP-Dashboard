"""add assigned_to fields for accountability

Revision ID: 0010
Revises: 0009
Create Date: 2025-01-20
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade():
    # Add assigned_to to jobs table
    op.add_column('jobs', sa.Column('assigned_to', sa.String(), nullable=True))
    
    # Add assigned_to to service_calls table
    op.add_column('service_calls', sa.Column('assigned_to', sa.String(), nullable=True))
    
    # Create indexes for better query performance
    op.create_index('ix_jobs_assigned_to', 'jobs', ['assigned_to'])
    op.create_index('ix_service_calls_assigned_to', 'service_calls', ['assigned_to'])


def downgrade():
    op.drop_index('ix_service_calls_assigned_to', table_name='service_calls')
    op.drop_index('ix_jobs_assigned_to', table_name='jobs')
    op.drop_column('service_calls', 'assigned_to')
    op.drop_column('jobs', 'assigned_to')



