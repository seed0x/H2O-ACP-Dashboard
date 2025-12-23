"""Add content categories to post instances

Revision ID: 0017_add_content_categories
Revises: 0016
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0017_add_content_categories'
down_revision = '0016'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add suggested_category to post_instances
    op.add_column('post_instances', sa.Column('suggested_category', sa.String(), nullable=True))
    
    # Add content_category to content_items (for tracking what category content belongs to)
    op.add_column('content_items', sa.Column('content_category', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('content_items', 'content_category')
    op.drop_column('post_instances', 'suggested_category')

