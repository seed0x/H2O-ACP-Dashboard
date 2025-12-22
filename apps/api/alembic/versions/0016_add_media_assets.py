"""add media assets

Revision ID: 0016
Revises: 0015
Create Date: 2025-01-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '0016'
down_revision = '0015'
branch_labels = None
depends_on = None


def upgrade():
    # Create media_assets table
    op.create_table(
        'media_assets',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Text(), nullable=False),
        sa.Column('content_item_id', UUID(as_uuid=True), nullable=True),
        sa.Column('file_name', sa.String(), nullable=False),
        sa.Column('file_url', sa.String(), nullable=False),  # S3/R2 cloud storage URL
        sa.Column('file_type', sa.String(), nullable=False),  # 'image', 'video'
        sa.Column('file_size', sa.Integer(), nullable=True),  # Size in bytes
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['content_item_id'], ['content_items.id'], ondelete='CASCADE')
    )
    op.create_index('ix_media_assets_tenant_id', 'media_assets', ['tenant_id'])
    op.create_index('ix_media_assets_content_item_id', 'media_assets', ['content_item_id'])


def downgrade():
    op.drop_index('ix_media_assets_content_item_id', table_name='media_assets')
    op.drop_index('ix_media_assets_tenant_id', table_name='media_assets')
    op.drop_table('media_assets')

