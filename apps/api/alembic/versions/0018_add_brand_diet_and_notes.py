"""Add brand diet and notes fields

Revision ID: 0018_add_brand_diet_and_notes
Revises: 0017
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0018_add_brand_diet_and_notes'
down_revision = '0017'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add notes field to post_instances (for template hints and other notes)
    op.add_column('post_instances', sa.Column('notes', sa.Text(), nullable=True))
    
    # Add brand_diet JSON field to channel_accounts (for category distribution configuration)
    op.add_column('channel_accounts', sa.Column('brand_diet', postgresql.JSON(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('channel_accounts', 'brand_diet')
    op.drop_column('post_instances', 'notes')

