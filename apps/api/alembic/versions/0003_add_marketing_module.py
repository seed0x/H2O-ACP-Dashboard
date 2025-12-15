"""add marketing module tables

Revision ID: 0003
Revises: 0002
Create Date: 2025-12-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create marketing_channels table
    op.create_table(
        'marketing_channels',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('key', sa.String(), nullable=False, unique=True),
        sa.Column('display_name', sa.String(), nullable=False),
        sa.Column('supports_autopost', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())
    )

    # Create channel_accounts table
    op.create_table(
        'channel_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('channel_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('marketing_channels.id'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('external_id', sa.String(), nullable=True),
        sa.Column('profile_url', sa.String(), nullable=True),
        sa.Column('login_email', sa.String(), nullable=True),
        sa.Column('credential_vault_ref', sa.String(), nullable=True),
        sa.Column('oauth_connected', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('oauth_provider', sa.String(), nullable=True),
        sa.Column('oauth_token_ref', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())
    )
    op.create_index('ix_channel_accounts_tenant_id', 'channel_accounts', ['tenant_id'])
    op.create_index('ix_channel_accounts_status', 'channel_accounts', ['status'])

    # Create content_posts table
    op.create_table(
        'content_posts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('channel_account_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('channel_accounts.id'), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('scheduled_for', sa.DateTime(timezone=True), nullable=True),
        sa.Column('posted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('owner', sa.String(), nullable=False),
        sa.Column('reviewer', sa.String(), nullable=True),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('cta_type', sa.String(), nullable=True),
        sa.Column('cta_url', sa.String(), nullable=True),
        sa.Column('target_city', sa.String(), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('source_type', sa.String(), nullable=True),
        sa.Column('source_ref', sa.String(), nullable=True),
        sa.Column('media_type', sa.String(), nullable=True),
        sa.Column('media_urls', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())
    )
    op.create_index('ix_content_posts_tenant_status', 'content_posts', ['tenant_id', 'status'])
    op.create_index('ix_content_posts_tenant_scheduled', 'content_posts', ['tenant_id', 'scheduled_for'])
    op.create_index('ix_content_posts_tags', 'content_posts', ['tags'], postgresql_using='gin')

    # Create publish_jobs table
    op.create_table(
        'publish_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('content_post_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('content_posts.id'), nullable=False),
        sa.Column('attempt_no', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('method', sa.String(), nullable=False),
        sa.Column('provider', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('response_ref', sa.String(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )
    op.create_index('ix_publish_jobs_post_id', 'publish_jobs', ['content_post_id'])


def downgrade() -> None:
    op.drop_table('publish_jobs')
    op.drop_table('content_posts')
    op.drop_table('channel_accounts')
    op.drop_table('marketing_channels')
