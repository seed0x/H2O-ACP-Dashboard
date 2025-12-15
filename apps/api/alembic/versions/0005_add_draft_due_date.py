"""add draft_due_date to content_posts for accountability

Revision ID: 0005
Revises: 0004
Create Date: 2025-12-15

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add draft_due_date column to content_posts
    op.add_column('content_posts', sa.Column('draft_due_date', sa.DateTime(timezone=True), nullable=True))
    
    # Add index for overdue draft queries
    op.create_index('ix_content_posts_draft_due', 'content_posts', ['draft_due_date', 'status'])


def downgrade() -> None:
    op.drop_index('ix_content_posts_draft_due', table_name='content_posts')
    op.drop_column('content_posts', 'draft_due_date')
