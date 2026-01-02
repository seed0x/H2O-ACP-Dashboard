"""add marketing scheduler fields and constraints

Revision ID: 0015
Revises: 0014
Create Date: 2025-01-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY

# revision identifiers, used by Alembic.
revision = '0015'
down_revision = '0014'
branch_labels = None
depends_on = None


def upgrade():
    # Add scheduling fields to channel_accounts (idempotent - check if exists first)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='channel_accounts' AND column_name='posts_per_week') THEN
                ALTER TABLE channel_accounts ADD COLUMN posts_per_week INTEGER;
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='channel_accounts' AND column_name='schedule_timezone') THEN
                ALTER TABLE channel_accounts ADD COLUMN schedule_timezone VARCHAR;
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='channel_accounts' AND column_name='schedule_times') THEN
                ALTER TABLE channel_accounts ADD COLUMN schedule_times VARCHAR[];
            END IF;
        END $$;
    """)
    
    # Set default values for existing rows (idempotent - only updates NULL values)
    op.execute("UPDATE channel_accounts SET posts_per_week = 3 WHERE posts_per_week IS NULL")
    op.execute("UPDATE channel_accounts SET schedule_timezone = 'America/Los_Angeles' WHERE schedule_timezone IS NULL")
    
    # Make content_item_id nullable for planned slots (idempotent - check current state first)
    op.execute("""
        DO $$ 
        DECLARE
            is_nullable BOOLEAN;
        BEGIN
            SELECT is_nullable::boolean INTO is_nullable
            FROM information_schema.columns
            WHERE table_name = 'post_instances' AND column_name = 'content_item_id';
            
            IF is_nullable = false THEN
                ALTER TABLE post_instances ALTER COLUMN content_item_id DROP NOT NULL;
            END IF;
        END $$;
    """)
    
    # Add unique constraint to prevent duplicate PostInstances (idempotent)
    # First, remove any existing duplicates (keep the first one)
    op.execute("""
        DELETE FROM post_instances p1
        WHERE EXISTS (
            SELECT 1 FROM post_instances p2
            WHERE p2.tenant_id = p1.tenant_id
            AND p2.channel_account_id = p1.channel_account_id
            AND p2.scheduled_for = p1.scheduled_for
            AND p2.id < p1.id
        )
    """)
    
    # Now create the unique constraint (idempotent - check if exists first)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'uq_post_instance_schedule'
            ) THEN
                ALTER TABLE post_instances 
                ADD CONSTRAINT uq_post_instance_schedule 
                UNIQUE (tenant_id, channel_account_id, scheduled_for);
            END IF;
        END $$;
    """)


def downgrade():
    op.drop_constraint('uq_post_instance_schedule', 'post_instances', type_='unique')
    # Note: Cannot safely make content_item_id NOT NULL if there are NULL values
    # op.alter_column('post_instances', 'content_item_id', nullable=False)
    op.drop_column('channel_accounts', 'schedule_times')
    op.drop_column('channel_accounts', 'schedule_timezone')
    op.drop_column('channel_accounts', 'posts_per_week')

