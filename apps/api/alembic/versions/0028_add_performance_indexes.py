"""add performance indexes

Revision ID: 0028
Revises: 0027
Create Date: 2025-01-XX
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0028'
down_revision = '0027'
branch_labels = None
depends_on = None


def upgrade():
    # Jobs table indexes
    op.create_index('ix_jobs_scheduled_start', 'jobs', ['scheduled_start'], if_not_exists=True)
    op.create_index('ix_jobs_scheduled_end', 'jobs', ['scheduled_end'], if_not_exists=True)
    op.create_index('ix_jobs_status', 'jobs', ['status'], if_not_exists=True)
    op.create_index('ix_jobs_tenant_status', 'jobs', ['tenant_id', 'status'], if_not_exists=True)
    op.create_index('ix_jobs_completion_date', 'jobs', ['completion_date'], if_not_exists=True)
    
    # Service calls table indexes
    op.create_index('ix_service_calls_scheduled_start', 'service_calls', ['scheduled_start'], if_not_exists=True)
    op.create_index('ix_service_calls_status', 'service_calls', ['status'], if_not_exists=True)
    op.create_index('ix_service_calls_tenant_status', 'service_calls', ['tenant_id', 'status'], if_not_exists=True)
    
    # Content items table indexes
    op.create_index('ix_content_items_tenant_status', 'content_items', ['tenant_id', 'status'], if_not_exists=True)
    op.create_index('ix_content_items_status', 'content_items', ['status'], if_not_exists=True)
    
    # Post instances table indexes
    op.create_index('ix_post_instances_scheduled_for', 'post_instances', ['scheduled_for'], if_not_exists=True)
    op.create_index('ix_post_instances_status', 'post_instances', ['status'], if_not_exists=True)
    op.create_index('ix_post_instances_tenant_scheduled', 'post_instances', ['tenant_id', 'scheduled_for'], if_not_exists=True)
    
    # Channel accounts table indexes
    op.create_index('ix_channel_accounts_tenant', 'channel_accounts', ['tenant_id'], if_not_exists=True)
    
    # Review requests table indexes (if not already exists)
    op.create_index('ix_review_requests_created_at', 'review_requests', ['created_at'], if_not_exists=True)
    
    # Reviews table indexes (if reviews table has tenant_id, otherwise through review_requests)
    op.create_index('ix_reviews_rating', 'reviews', ['rating'], if_not_exists=True)
    op.create_index('ix_reviews_is_public', 'reviews', ['is_public'], if_not_exists=True)
    op.create_index('ix_reviews_created_at', 'reviews', ['created_at'], if_not_exists=True)


def downgrade():
    op.drop_index('ix_reviews_created_at', table_name='reviews', if_exists=True)
    op.drop_index('ix_reviews_is_public', table_name='reviews', if_exists=True)
    op.drop_index('ix_reviews_rating', table_name='reviews', if_exists=True)
    op.drop_index('ix_review_requests_created_at', table_name='review_requests', if_exists=True)
    op.drop_index('ix_channel_accounts_tenant', table_name='channel_accounts', if_exists=True)
    op.drop_index('ix_post_instances_tenant_scheduled', table_name='post_instances', if_exists=True)
    op.drop_index('ix_post_instances_status', table_name='post_instances', if_exists=True)
    op.drop_index('ix_post_instances_scheduled_for', table_name='post_instances', if_exists=True)
    op.drop_index('ix_content_items_status', table_name='content_items', if_exists=True)
    op.drop_index('ix_content_items_tenant_status', table_name='content_items', if_exists=True)
    op.drop_index('ix_service_calls_tenant_status', table_name='service_calls', if_exists=True)
    op.drop_index('ix_service_calls_status', table_name='service_calls', if_exists=True)
    op.drop_index('ix_service_calls_scheduled_start', table_name='service_calls', if_exists=True)
    op.drop_index('ix_jobs_completion_date', table_name='jobs', if_exists=True)
    op.drop_index('ix_jobs_tenant_status', table_name='jobs', if_exists=True)
    op.drop_index('ix_jobs_status', table_name='jobs', if_exists=True)
    op.drop_index('ix_jobs_scheduled_end', table_name='jobs', if_exists=True)
    op.drop_index('ix_jobs_scheduled_start', table_name='jobs', if_exists=True)

