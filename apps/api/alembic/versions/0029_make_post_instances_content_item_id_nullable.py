"""make post_instances content_item_id nullable

Revision ID: 0029
Revises: 0028
Create Date: 2026-01-02
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0029'
down_revision = '0028'
branch_labels = None
depends_on = None


def upgrade():
    # Make content_item_id nullable to support planned slots
    # Planned slots are created without content and filled later
    op.alter_column('post_instances', 'content_item_id',
                    existing_type=sa.UUID(),
                    nullable=True,
                    existing_nullable=False)


def downgrade():
    # Revert to NOT NULL (but this will fail if there are any NULL values)
    # In practice, you'd need to clean up NULL values first
    op.alter_column('post_instances', 'content_item_id',
                    existing_type=sa.UUID(),
                    nullable=False,
                    existing_nullable=True)

