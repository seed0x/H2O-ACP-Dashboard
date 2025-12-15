"""create initial tables

Revision ID: 0001
Revises: 
Create Date: 2025-12-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto')
    

    op.create_table('builders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')), # will set default in migrations
        sa.Column('name', sa.Text, nullable=False),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_unique_constraint('uq_builders_name', 'builders', ['name'])

    op.create_table('builder_contacts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('builder_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.Text, nullable=False),
        sa.Column('role', sa.Text, nullable=False),
        sa.Column('phone', sa.Text),
        sa.Column('email', sa.Text),
        sa.Column('preferred_contact_method', sa.Text),
        sa.Column('notes', sa.Text),
        sa.Column('visibility', sa.Text, nullable=False, server_default='both'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_builder_contacts_builder_id', 'builder_contacts', ['builder_id'])
    op.create_foreign_key('fk_builder_contacts_builder', 'builder_contacts', 'builders', ['builder_id'], ['id'], ondelete='CASCADE')

    op.create_table('bids',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Text, nullable=False),
        sa.Column('builder_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('project_name', sa.Text, nullable=False),
        sa.Column('status', sa.Text, nullable=False),
        sa.Column('due_date', sa.Date),
        sa.Column('sent_date', sa.Date),
        sa.Column('amount_cents', sa.Integer),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_bids_tenant_status', 'bids', ['tenant_id', 'status'])
    op.create_index('ix_bids_builder_id', 'bids', ['builder_id'])
    op.create_foreign_key('fk_bids_builder', 'bids', 'builders', ['builder_id'], ['id'])

    op.create_table('bid_line_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('bid_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category', sa.Text, nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('qty', sa.Numeric, nullable=True, server_default='1'),
        sa.Column('unit_price_cents', sa.Integer),
        sa.Column('total_cents', sa.Integer),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_foreign_key('fk_bid_line_items_bid', 'bid_line_items', 'bids', ['bid_id'], ['id'], ondelete='CASCADE')

    op.create_table('jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Text, nullable=False),
        sa.Column('builder_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('community', sa.Text, nullable=False),
        sa.Column('lot_number', sa.Text, nullable=False),
        sa.Column('plan', sa.Text),
        sa.Column('phase', sa.Text, nullable=False),
        sa.Column('status', sa.Text, nullable=False),
        sa.Column('address_line1', sa.Text, nullable=False),
        sa.Column('city', sa.Text, nullable=False),
        sa.Column('state', sa.Text, nullable=False, server_default='WA'),
        sa.Column('zip', sa.Text, nullable=False),
        sa.Column('scheduled_start', sa.DateTime(timezone=True)),
        sa.Column('scheduled_end', sa.DateTime(timezone=True)),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_jobs_tenant_status', 'jobs', ['tenant_id', 'status'])
    op.create_index('ix_jobs_builder_id', 'jobs', ['builder_id'])
    op.create_index('ix_jobs_community', 'jobs', ['community'])
    op.create_index('ix_jobs_lot_number', 'jobs', ['lot_number'])
    op.create_foreign_key('fk_jobs_builder', 'jobs', 'builders', ['builder_id'], ['id'])
    op.create_unique_constraint('uq_job_per_lot_phase', 'jobs', ['builder_id', 'community', 'lot_number', 'phase', 'tenant_id'])

    op.create_table('service_calls',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Text, nullable=False),
        sa.Column('builder_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('customer_name', sa.Text, nullable=False),
        sa.Column('phone', sa.Text),
        sa.Column('email', sa.Text),
        sa.Column('address_line1', sa.Text, nullable=False),
        sa.Column('city', sa.Text, nullable=False),
        sa.Column('state', sa.Text, nullable=False, server_default='WA'),
        sa.Column('zip', sa.Text, nullable=False),
        sa.Column('issue_description', sa.Text, nullable=False),
        sa.Column('priority', sa.Text, nullable=False, server_default='Normal'),
        sa.Column('status', sa.Text, nullable=False),
        sa.Column('scheduled_start', sa.DateTime(timezone=True)),
        sa.Column('scheduled_end', sa.DateTime(timezone=True)),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_service_calls_tenant_status', 'service_calls', ['tenant_id', 'status'])
    op.create_index('ix_service_calls_builder_id', 'service_calls', ['builder_id'])
    op.create_index('ix_service_calls_customer_name', 'service_calls', ['customer_name'])
    op.create_foreign_key('fk_service_calls_builder', 'service_calls', 'builders', ['builder_id'], ['id'])

    op.create_table('job_contacts',
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('jobs.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('builder_contact_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('builder_contacts.id'), primary_key=True),
        sa.Column('role_on_job', sa.Text)
    )

    op.create_table('audit_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Text),
        sa.Column('entity_type', sa.Text, nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.Text, nullable=False),
        sa.Column('field', sa.Text),
        sa.Column('old_value', sa.Text),
        sa.Column('new_value', sa.Text),
        sa.Column('changed_by', sa.Text, nullable=False),
        sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )


def downgrade():
    op.drop_table('audit_log')
    op.drop_table('job_contacts')
    op.drop_table('service_calls')
    op.drop_table('jobs')
    op.drop_table('bid_line_items')
    op.drop_table('bids')
    op.drop_table('builder_contacts')
    op.drop_table('builders')
