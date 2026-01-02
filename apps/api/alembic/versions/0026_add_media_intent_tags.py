"""Add intent tags to media assets

Revision ID: 0026
Revises: 0025
Create Date: 2026-01-03
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0026'
down_revision = '0025'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add intent_tags column to media_assets table
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_assets' AND column_name = 'intent_tags') THEN
                ALTER TABLE media_assets ADD COLUMN intent_tags TEXT[];
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # Remove intent_tags column
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_assets' AND column_name = 'intent_tags') THEN
                ALTER TABLE media_assets DROP COLUMN intent_tags;
            END IF;
        END $$;
    """)

