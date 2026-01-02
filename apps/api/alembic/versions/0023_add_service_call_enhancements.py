"""Add payment, billing, paperwork, and multiple tech fields to service calls

Revision ID: 0023
Revises: 0022
Create Date: 2026-01-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '0023'
down_revision = '0022_add_postinstance_approval'
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table"""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def index_exists(table_name: str, index_name: str) -> bool:
    """Check if an index exists"""
    bind = op.get_bind()
    inspector = inspect(bind)
    indexes = [idx['name'] for idx in inspector.get_indexes(table_name)]
    return index_name in indexes


def upgrade():
    # Add payment tracking fields (idempotent - check if exists first)
    if not column_exists('service_calls', 'payment_status'):
        op.add_column('service_calls', sa.Column('payment_status', sa.String(), nullable=True))
    if not column_exists('service_calls', 'payment_method'):
        op.add_column('service_calls', sa.Column('payment_method', sa.String(), nullable=True))
    if not column_exists('service_calls', 'payment_amount'):
        op.add_column('service_calls', sa.Column('payment_amount', sa.Numeric(10, 2), nullable=True))
    if not column_exists('service_calls', 'payment_date'):
        op.add_column('service_calls', sa.Column('payment_date', sa.Date(), nullable=True))
    
    # Add billing write-up tracking
    if not column_exists('service_calls', 'billing_writeup_status'):
        op.add_column('service_calls', sa.Column('billing_writeup_status', sa.String(), nullable=True))
    if not column_exists('service_calls', 'billing_writeup_assigned_to'):
        op.add_column('service_calls', sa.Column('billing_writeup_assigned_to', sa.String(), nullable=True))
    
    # Add paperwork status flag
    if not column_exists('service_calls', 'paperwork_turned_in'):
        op.add_column('service_calls', sa.Column('paperwork_turned_in', sa.Boolean(), nullable=True, server_default='false'))
    
    # Add multiple tech assignments (stored as comma-separated string for simplicity)
    # We'll keep assigned_to for primary tech, and add additional_techs for multiple
    if not column_exists('service_calls', 'additional_techs'):
        op.add_column('service_calls', sa.Column('additional_techs', sa.String(), nullable=True))
    
    # Add indexes for common queries (idempotent - check if exists first)
    if not index_exists('service_calls', 'ix_service_calls_payment_status'):
        op.create_index('ix_service_calls_payment_status', 'service_calls', ['payment_status'])
    if not index_exists('service_calls', 'ix_service_calls_billing_writeup_status'):
        op.create_index('ix_service_calls_billing_writeup_status', 'service_calls', ['billing_writeup_status'])
    if not index_exists('service_calls', 'ix_service_calls_paperwork_turned_in'):
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

