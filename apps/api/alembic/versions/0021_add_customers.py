"""Add customers table and link to service calls

Revision ID: 0021_add_customers
Revises: 0020_add_service_call_workflow
Create Date: 2025-01-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY

# revision identifiers, used by Alembic.
revision = '0021_add_customers'
down_revision = '0020_add_service_call_workflow'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create customers table
    op.create_table(
        'customers',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Text(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('phone', sa.Text(), nullable=True),
        sa.Column('email', sa.Text(), nullable=True),
        sa.Column('address_line1', sa.Text(), nullable=True),
        sa.Column('city', sa.Text(), nullable=True),
        sa.Column('state', sa.Text(), nullable=True, server_default='WA'),
        sa.Column('zip', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('tags', ARRAY(sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create indexes
    op.create_index('ix_customers_tenant_phone', 'customers', ['tenant_id', 'phone'])
    op.create_index('ix_customers_tenant_email', 'customers', ['tenant_id', 'email'])
    op.create_index('ix_customers_tenant_name', 'customers', ['tenant_id', 'name'])
    
    # Add customer_id to service_calls
    op.add_column('service_calls', sa.Column('customer_id', UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_service_calls_customer',
        'service_calls',
        'customers',
        ['customer_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_index('ix_service_calls_customer_id', 'service_calls', ['customer_id'])


def downgrade() -> None:
    op.drop_index('ix_service_calls_customer_id', table_name='service_calls')
    op.drop_constraint('fk_service_calls_customer', 'service_calls', type_='foreignkey')
    op.drop_column('service_calls', 'customer_id')
    
    op.drop_index('ix_customers_tenant_name', table_name='customers')
    op.drop_index('ix_customers_tenant_email', table_name='customers')
    op.drop_index('ix_customers_tenant_phone', table_name='customers')
    op.drop_table('customers')

