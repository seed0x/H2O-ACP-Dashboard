"""fix multi-channel support and rename fields

Revision ID: 0006
Revises: 0005
Create Date: 2025-12-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop old FK constraint
    op.drop_constraint('content_posts_channel_account_id_fkey', 'content_posts', type_='foreignkey')
    
    # Drop old channel_account_id column
    op.drop_column('content_posts', 'channel_account_id')
    
    # Add channel_ids array to support multi-channel posts
    op.add_column('content_posts', sa.Column('channel_ids', postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=False, server_default='{}'))
    
    # Rename caption to body_text
    op.alter_column('content_posts', 'caption', new_column_name='body_text')
    
    # Add index for channel_ids
    op.create_index('ix_content_posts_channel_ids', 'content_posts', ['channel_ids'], postgresql_using='gin')


def downgrade() -> None:
    op.drop_index('ix_content_posts_channel_ids', table_name='content_posts')
    op.alter_column('content_posts', 'body_text', new_column_name='caption')
    op.drop_column('content_posts', 'channel_ids')
    op.add_column('content_posts', sa.Column('channel_account_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('content_posts_channel_account_id_fkey', 'content_posts', 'channel_accounts', ['channel_account_id'], ['id'])
