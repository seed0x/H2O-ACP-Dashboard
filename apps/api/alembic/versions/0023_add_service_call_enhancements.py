"""Add payment, billing, paperwork, and multiple tech fields to service calls

Revision ID: 0023
Revises: 0022
Create Date: 2026-01-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0023'
down_revision = '0022_add_postinstance_approval'
branch_labels = None
depends_on = None


def upgrade():
    # Add payment tracking fields
    op.add_column('service_calls', sa.Column('payment_status', sa.String(), nullable=True))
    op.add_column('service_calls', sa.Column('payment_method', sa.String(), nullable=True))
    op.add_column('service_calls', sa.Column('payment_amount', sa.Numeric(10, 2), nullable=True))
    op.add_column('service_calls', sa.Column('payment_date', sa.Date(), nullable=True))
    
    # Add billing write-up tracking
    op.add_column('service_calls', sa.Column('billing_writeup_status', sa.String(), nullable=True))
    op.add_column('service_calls', sa.Column('billing_writeup_assigned_to', sa.String(), nullable=True))
    
    # Add paperwork status flag
    op.add_column('service_calls', sa.Column('paperwork_turned_in', sa.Boolean(), nullable=True, server_default='false'))
    
    # Add multiple tech assignments (stored as comma-separated string for simplicity)
    # We'll keep assigned_to for primary tech, and add additional_techs for multiple
    op.add_column('service_calls', sa.Column('additional_techs', sa.String(), nullable=True))
    
    # Add indexes for common queries
    op.create_index('ix_service_calls_payment_status', 'service_calls', ['payment_status'])
    op.create_index('ix_service_calls_billing_writeup_status', 'service_calls', ['billing_writeup_status'])
    op.create_index('ix_service_calls_paperwork_turned_in', 'service_calls', ['paperwork_turned_in'])


def downgrade():
    op.drop_index('ix_service_calls_paperwork_turned_in', table_name='service_calls')
    op.drop_index('ix_service_calls_billing_writeup_status', table_name='service_calls')
    op.drop_index('ix_service_calls_payment_status', table_name='service_calls')
    
    op.drop_column('service_calls', 'additional_techs')
    op.drop_column('service_calls', 'paperwork_turned_in')
    op.drop_column('service_calls', 'billing_writeup_assigned_to')
    op.drop_column('service_calls', 'billing_writeup_status')
    op.drop_column('service_calls', 'payment_date')
    op.drop_column('service_calls', 'payment_amount')
    op.drop_column('service_calls', 'payment_method')
    op.drop_column('service_calls', 'payment_status')

