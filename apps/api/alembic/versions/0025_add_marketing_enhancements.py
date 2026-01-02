"""Add marketing enhancements: offers, local SEO topics, GBP fields, content item offer link

Revision ID: 0025
Revises: 0024
Create Date: 2026-01-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0025'
down_revision = '0024'
branch_labels = None
depends_on = None


def upgrade():
    # Create offers table (idempotent)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                          WHERE table_schema = 'public' AND table_name = 'offers') THEN
                CREATE TABLE offers (
                    id UUID DEFAULT gen_random_uuid() NOT NULL,
                    tenant_id TEXT NOT NULL,
                    title VARCHAR NOT NULL,
                    description TEXT,
                    service_type VARCHAR,
                    valid_from DATE NOT NULL,
                    valid_to DATE NOT NULL,
                    discount_type VARCHAR NOT NULL,
                    discount_value NUMERIC(10, 2),
                    terms TEXT,
                    is_active BOOLEAN DEFAULT true NOT NULL,
                    coupon_code VARCHAR,
                    website_url VARCHAR,
                    sync_source VARCHAR DEFAULT 'manual',
                    external_id VARCHAR,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    PRIMARY KEY (id)
                );
            END IF;
        END $$;
    """)
    
    # Create indexes for offers (idempotent)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_offers_tenant_id') THEN
                CREATE INDEX ix_offers_tenant_id ON offers(tenant_id);
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_offers_valid_dates') THEN
                CREATE INDEX ix_offers_valid_dates ON offers(valid_from, valid_to);
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_offers_is_active') THEN
                CREATE INDEX ix_offers_is_active ON offers(is_active);
            END IF;
        END $$;
    """)
    
    # Create local_seo_topics table (idempotent)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                          WHERE table_schema = 'public' AND table_name = 'local_seo_topics') THEN
                CREATE TABLE local_seo_topics (
                    id UUID DEFAULT gen_random_uuid() NOT NULL,
                    tenant_id TEXT NOT NULL,
                    service_type VARCHAR NOT NULL,
                    city VARCHAR NOT NULL,
                    status VARCHAR DEFAULT 'not_started' NOT NULL,
                    last_posted_at TIMESTAMP WITH TIME ZONE,
                    last_post_instance_id UUID,
                    target_url VARCHAR,
                    notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    PRIMARY KEY (id),
                    FOREIGN KEY(last_post_instance_id) REFERENCES post_instances (id) ON DELETE SET NULL,
                    CONSTRAINT uq_local_seo_topic UNIQUE (tenant_id, service_type, city)
                );
            END IF;
        END $$;
    """)
    
    # Create indexes for local_seo_topics (idempotent)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_local_seo_topics_tenant_id') THEN
                CREATE INDEX ix_local_seo_topics_tenant_id ON local_seo_topics(tenant_id);
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_local_seo_topics_status') THEN
                CREATE INDEX ix_local_seo_topics_status ON local_seo_topics(status);
            END IF;
        END $$;
    """)
    
    # Add offer_id to content_items (idempotent)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='content_items' AND column_name='offer_id') THEN
                ALTER TABLE content_items ADD COLUMN offer_id UUID;
                ALTER TABLE content_items ADD CONSTRAINT fk_content_items_offer_id 
                    FOREIGN KEY(offer_id) REFERENCES offers (id) ON DELETE SET NULL;
            END IF;
        END $$;
    """)
    
    # Create index for offer_id (idempotent)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_content_items_offer_id') THEN
                CREATE INDEX ix_content_items_offer_id ON content_items(offer_id);
            END IF;
        END $$;
    """)
    
    # Add GBP-specific fields to post_instances (idempotent)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='post_instances' AND column_name='gbp_post_type') THEN
                ALTER TABLE post_instances ADD COLUMN gbp_post_type VARCHAR;
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='post_instances' AND column_name='gbp_cta_type') THEN
                ALTER TABLE post_instances ADD COLUMN gbp_cta_type VARCHAR;
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='post_instances' AND column_name='gbp_location_targeting') THEN
                ALTER TABLE post_instances ADD COLUMN gbp_location_targeting VARCHAR;
            END IF;
        END $$;
    """)


def downgrade():
    # Remove GBP fields from post_instances
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='post_instances' AND column_name='gbp_location_targeting') THEN
                ALTER TABLE post_instances DROP COLUMN gbp_location_targeting;
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='post_instances' AND column_name='gbp_cta_type') THEN
                ALTER TABLE post_instances DROP COLUMN gbp_cta_type;
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='post_instances' AND column_name='gbp_post_type') THEN
                ALTER TABLE post_instances DROP COLUMN gbp_post_type;
            END IF;
        END $$;
    """)
    
    # Remove offer_id from content_items
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='content_items' AND column_name='offer_id') THEN
                ALTER TABLE content_items DROP CONSTRAINT IF EXISTS fk_content_items_offer_id;
                ALTER TABLE content_items DROP COLUMN offer_id;
            END IF;
        END $$;
    """)
    
    # Drop local_seo_topics table
    op.execute("DROP TABLE IF EXISTS local_seo_topics CASCADE;")
    
    # Drop offers table
    op.execute("DROP TABLE IF EXISTS offers CASCADE;")

