"""add content items and post instances

Revision ID: 0012
Revises: 0011
Create Date: 2025-01-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY

# revision identifiers, used by Alembic.
revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None


def upgrade():
    # Create content_items table
    op.create_table(
        'content_items',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Text(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('base_caption', sa.Text(), nullable=True),
        sa.Column('media_urls', ARRAY(sa.String()), nullable=True),
        sa.Column('cta_type', sa.String(), nullable=True),
        sa.Column('cta_url', sa.String(), nullable=True),
        sa.Column('tags', ARRAY(sa.String()), nullable=True),
        sa.Column('target_city', sa.String(), nullable=True),
        sa.Column('template_id', UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='Idea'),
        sa.Column('owner', sa.String(), nullable=False),
        sa.Column('reviewer', sa.String(), nullable=True),
        sa.Column('draft_due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('source_type', sa.String(), nullable=True),
        sa.Column('source_ref', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())
    )
    op.create_index('ix_content_items_tenant_id', 'content_items', ['tenant_id'])
    op.create_index('ix_content_items_status', 'content_items', ['status'])
    op.create_index('ix_content_items_tenant_status', 'content_items', ['tenant_id', 'status'])
    op.create_index('ix_content_items_tags', 'content_items', ['tags'], postgresql_using='gin')

    # Create post_instances table
    op.create_table(
        'post_instances',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Text(), nullable=False),
        sa.Column('content_item_id', UUID(as_uuid=True), sa.ForeignKey('content_items.id', ondelete='CASCADE'), nullable=False),
        sa.Column('channel_account_id', UUID(as_uuid=True), sa.ForeignKey('channel_accounts.id'), nullable=False),
        sa.Column('caption_override', sa.Text(), nullable=True),
        sa.Column('scheduled_for', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='Draft'),
        sa.Column('posted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('post_url', sa.String(), nullable=True),
        sa.Column('posted_manually', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('screenshot_url', sa.String(), nullable=True),
        sa.Column('autopost_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('publish_job_id', UUID(as_uuid=True), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())
    )
    op.create_index('ix_post_instances_tenant_id', 'post_instances', ['tenant_id'])
    op.create_index('ix_post_instances_content_item_id', 'post_instances', ['content_item_id'])
    op.create_index('ix_post_instances_channel_account_id', 'post_instances', ['channel_account_id'])
    op.create_index('ix_post_instances_status', 'post_instances', ['status'])
    op.create_index('ix_post_instances_scheduled_for', 'post_instances', ['scheduled_for'])
    op.create_index('ix_post_instances_tenant_scheduled', 'post_instances', ['tenant_id', 'scheduled_for'])


def downgrade():
    op.drop_index('ix_post_instances_tenant_scheduled', table_name='post_instances')
    op.drop_index('ix_post_instances_scheduled_for', table_name='post_instances')
    op.drop_index('ix_post_instances_status', table_name='post_instances')
    op.drop_index('ix_post_instances_channel_account_id', table_name='post_instances')
    op.drop_index('ix_post_instances_content_item_id', table_name='post_instances')
    op.drop_index('ix_post_instances_tenant_id', table_name='post_instances')
    op.drop_table('post_instances')
    
    op.drop_index('ix_content_items_tags', table_name='content_items')
    op.drop_index('ix_content_items_tenant_status', table_name='content_items')
    op.drop_index('ix_content_items_status', table_name='content_items')
    op.drop_index('ix_content_items_tenant_id', table_name='content_items')
    op.drop_table('content_items')






