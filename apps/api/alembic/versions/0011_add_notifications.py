"""add notifications system

Revision ID: 0011
Revises: 0010
Create Date: 2025-01-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade():
    # Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), nullable=True),
        sa.Column('tenant_id', sa.Text(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=True),
        sa.Column('entity_id', UUID(as_uuid=True), nullable=True),
        sa.Column('read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_notifications_user_id'),
    )
    
    # Create indexes
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_tenant_id', 'notifications', ['tenant_id'])
    op.create_index('ix_notifications_read', 'notifications', ['read'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])
    op.create_index('ix_notifications_user_tenant_read', 'notifications', ['user_id', 'tenant_id', 'read'])


def downgrade():
    op.drop_index('ix_notifications_user_tenant_read', table_name='notifications')
    op.drop_index('ix_notifications_created_at', table_name='notifications')
    op.drop_index('ix_notifications_read', table_name='notifications')
    op.drop_index('ix_notifications_tenant_id', table_name='notifications')
    op.drop_index('ix_notifications_user_id', table_name='notifications')
    op.drop_table('notifications')


