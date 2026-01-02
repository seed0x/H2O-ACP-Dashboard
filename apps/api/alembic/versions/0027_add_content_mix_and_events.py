"""Add content mix tracking, seasonal events, and review-to-content fields

Revision ID: 0027
Revises: 0026
Create Date: 2026-01-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = '0027'
down_revision = '0026'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create content_mix_tracking table
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                          WHERE table_schema = 'public' AND table_name = 'content_mix_tracking') THEN
                CREATE TABLE content_mix_tracking (
                    id UUID DEFAULT gen_random_uuid() NOT NULL,
                    tenant_id TEXT NOT NULL,
                    channel_account_id UUID NOT NULL,
                    week_start_date DATE NOT NULL,
                    educational_count INTEGER DEFAULT 0 NOT NULL,
                    authority_count INTEGER DEFAULT 0 NOT NULL,
                    promo_count INTEGER DEFAULT 0 NOT NULL,
                    local_relevance_count INTEGER DEFAULT 0 NOT NULL,
                    target_educational INTEGER DEFAULT 2 NOT NULL,
                    target_authority INTEGER DEFAULT 1 NOT NULL,
                    target_promo INTEGER DEFAULT 1 NOT NULL,
                    target_local INTEGER DEFAULT 1 NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    PRIMARY KEY (id),
                    FOREIGN KEY(channel_account_id) REFERENCES channel_accounts (id) ON DELETE CASCADE,
                    CONSTRAINT uq_content_mix_week UNIQUE (tenant_id, channel_account_id, week_start_date)
                );
            END IF;
        END $$;
    """)
    
    # Indexes for content_mix_tracking
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_content_mix_tracking_tenant_id') THEN
                CREATE INDEX ix_content_mix_tracking_tenant_id ON content_mix_tracking(tenant_id);
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_content_mix_tracking_week') THEN
                CREATE INDEX ix_content_mix_tracking_week ON content_mix_tracking(week_start_date);
            END IF;
        END $$;
    """)
    
    # Create seasonal_events table
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                          WHERE table_schema = 'public' AND table_name = 'seasonal_events') THEN
                CREATE TABLE seasonal_events (
                    id UUID DEFAULT gen_random_uuid() NOT NULL,
                    tenant_id TEXT NOT NULL,
                    event_type VARCHAR NOT NULL,
                    name VARCHAR NOT NULL,
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    city VARCHAR,
                    content_suggestions TEXT,
                    is_recurring BOOLEAN DEFAULT false NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    PRIMARY KEY (id)
                );
            END IF;
        END $$;
    """)
    
    # Indexes for seasonal_events
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_seasonal_events_tenant_id') THEN
                CREATE INDEX ix_seasonal_events_tenant_id ON seasonal_events(tenant_id);
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_seasonal_events_dates') THEN
                CREATE INDEX ix_seasonal_events_dates ON seasonal_events(start_date, end_date);
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_seasonal_events_type') THEN
                CREATE INDEX ix_seasonal_events_type ON seasonal_events(event_type);
            END IF;
        END $$;
    """)
    
    # Add review-to-content fields to reviews table
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='reviews' AND column_name='can_be_content') THEN
                ALTER TABLE reviews ADD COLUMN can_be_content BOOLEAN DEFAULT false NOT NULL;
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='reviews' AND column_name='content_item_id') THEN
                ALTER TABLE reviews ADD COLUMN content_item_id UUID;
                ALTER TABLE reviews ADD CONSTRAINT fk_reviews_content_item_id 
                    FOREIGN KEY(content_item_id) REFERENCES content_items (id) ON DELETE SET NULL;
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_reviews_content_item_id') THEN
                CREATE INDEX ix_reviews_content_item_id ON reviews(content_item_id);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # Remove index from reviews
    op.execute("DROP INDEX IF EXISTS ix_reviews_content_item_id")
    
    # Remove columns from reviews
    op.execute("ALTER TABLE reviews DROP COLUMN IF EXISTS content_item_id")
    op.execute("ALTER TABLE reviews DROP COLUMN IF EXISTS can_be_content")
    
    # Drop seasonal_events table
    op.execute("DROP TABLE IF EXISTS seasonal_events")
    
    # Drop content_mix_tracking table
    op.execute("DROP TABLE IF EXISTS content_mix_tracking")

