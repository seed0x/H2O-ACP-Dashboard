"""Add payment, billing, paperwork, and multiple tech fields to service calls

Revision ID: 0023
Revises: 0022
Create Date: 2026-01-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0023'
down_revision = '0022_add_postinstance_approval'
branch_labels = None
depends_on = None


def upgrade():
    # Add payment tracking fields (idempotent - use DO block to check if exists)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='service_calls' AND column_name='payment_status') THEN
                ALTER TABLE service_calls ADD COLUMN payment_status VARCHAR;
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='service_calls' AND column_name='payment_method') THEN
                ALTER TABLE service_calls ADD COLUMN payment_method VARCHAR;
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='service_calls' AND column_name='payment_amount') THEN
                ALTER TABLE service_calls ADD COLUMN payment_amount NUMERIC(10, 2);
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='service_calls' AND column_name='payment_date') THEN
                ALTER TABLE service_calls ADD COLUMN payment_date DATE;
            END IF;
        END $$;
    """)
    
    # Add billing write-up tracking
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='service_calls' AND column_name='billing_writeup_status') THEN
                ALTER TABLE service_calls ADD COLUMN billing_writeup_status VARCHAR;
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='service_calls' AND column_name='billing_writeup_assigned_to') THEN
                ALTER TABLE service_calls ADD COLUMN billing_writeup_assigned_to VARCHAR;
            END IF;
        END $$;
    """)
    
    # Add paperwork status flag
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='service_calls' AND column_name='paperwork_turned_in') THEN
                ALTER TABLE service_calls ADD COLUMN paperwork_turned_in BOOLEAN DEFAULT false;
            END IF;
        END $$;
    """)
    
    # Add multiple tech assignments (stored as comma-separated string for simplicity)
    # We'll keep assigned_to for primary tech, and add additional_techs for multiple
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='service_calls' AND column_name='additional_techs') THEN
                ALTER TABLE service_calls ADD COLUMN additional_techs VARCHAR;
            END IF;
        END $$;
    """)
    
    # Add indexes for common queries (idempotent - check if exists first)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_service_calls_payment_status') THEN
                CREATE INDEX ix_service_calls_payment_status ON service_calls(payment_status);
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_service_calls_billing_writeup_status') THEN
                CREATE INDEX ix_service_calls_billing_writeup_status ON service_calls(billing_writeup_status);
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_service_calls_paperwork_turned_in') THEN
                CREATE INDEX ix_service_calls_paperwork_turned_in ON service_calls(paperwork_turned_in);
            END IF;
        END $$;
    """)


def downgrade():
    op.drop_index('ix_service_calls_paperwork_turned_in', table_name='service_calls')
    op.drop_index('ix_service_calls_billing_writeup_status', table_name='service_calls')
    op.drop_index('ix_service_calls_payment_status', table_name='service_calls')
    
    op.drop_column('service_calls', 'additional_techs')
    op.drop_column('service_calls', 'paperwork_turned_in')
    op.drop_column('service_calls', 'billing_writeup_assigned_to')
    op.drop_column('service_calls', 'billing_writeup_status')
    op.drop_column('service_calls', 'payment_date')
    op.drop_column('service_calls', 'payment_amount')
    op.drop_column('service_calls', 'payment_method')
    op.drop_column('service_calls', 'payment_status')

