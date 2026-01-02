"""Add service call tasks/check-offs for tracking follow-ups

Revision ID: 0024
Revises: 0023
Create Date: 2026-01-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0024'
down_revision = '0023'
branch_labels = None
depends_on = None


def upgrade():
    # Create table only if it doesn't exist (idempotent)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                          WHERE table_schema = 'public' AND table_name = 'service_call_tasks') THEN
                CREATE TABLE service_call_tasks (
                    id UUID DEFAULT gen_random_uuid() NOT NULL,
                    service_call_id UUID NOT NULL,
                    tenant_id TEXT NOT NULL,
                    task_type VARCHAR NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    status VARCHAR DEFAULT 'pending' NOT NULL,
                    assigned_to VARCHAR,
                    due_date DATE,
                    completed_at TIMESTAMP WITH TIME ZONE,
                    completed_by VARCHAR,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    created_by VARCHAR,
                    PRIMARY KEY (id),
                    FOREIGN KEY(service_call_id) REFERENCES service_calls (id) ON DELETE CASCADE
                );
            END IF;
        END $$;
    """)
    
    # Create indexes only if they don't exist (idempotent)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_service_call_tasks_service_call_id') THEN
                CREATE INDEX ix_service_call_tasks_service_call_id ON service_call_tasks(service_call_id);
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_service_call_tasks_status') THEN
                CREATE INDEX ix_service_call_tasks_status ON service_call_tasks(status);
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_service_call_tasks_assigned_to') THEN
                CREATE INDEX ix_service_call_tasks_assigned_to ON service_call_tasks(assigned_to);
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_service_call_tasks_due_date') THEN
                CREATE INDEX ix_service_call_tasks_due_date ON service_call_tasks(due_date);
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_service_call_tasks_tenant_status') THEN
                CREATE INDEX ix_service_call_tasks_tenant_status ON service_call_tasks(tenant_id, status);
            END IF;
        END $$;
    """)


def downgrade():
    op.drop_index('ix_service_call_tasks_tenant_status', table_name='service_call_tasks')
    op.drop_index('ix_service_call_tasks_due_date', table_name='service_call_tasks')
    op.drop_index('ix_service_call_tasks_assigned_to', table_name='service_call_tasks')
    op.drop_index('ix_service_call_tasks_status', table_name='service_call_tasks')
    op.drop_index('ix_service_call_tasks_service_call_id', table_name='service_call_tasks')
    op.drop_table('service_call_tasks')

