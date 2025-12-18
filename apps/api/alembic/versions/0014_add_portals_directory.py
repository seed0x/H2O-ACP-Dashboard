"""add portals directory

Revision ID: 0014
Revises: 0013
Create Date: 2025-01-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
import json
import os

# revision identifiers, used by Alembic.
revision = '0014'
down_revision = '0013'
branch_labels = None
depends_on = None


def upgrade():
    # #region agent log
    log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.cursor', 'debug.log')
    try:
        with open(log_path, 'a') as f:
            f.write(json.dumps({"location": "0014_add_portals_directory.py:18", "message": "upgrade() entry", "data": {"revision": "0014"}, "timestamp": __import__('time').time() * 1000, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "A"}) + "\n")
    except: pass
    # #endregion
    
    # Create portal_category enum (reuse if exists, otherwise create)
    # #region agent log
    try:
        with open(log_path, 'a') as f:
            f.write(json.dumps({"location": "0014_add_portals_directory.py:20", "message": "Before creating portal_category enum", "data": {}, "timestamp": __import__('time').time() * 1000, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "A"}) + "\n")
    except: pass
    # #endregion
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE portal_category AS ENUM ('permit', 'inspection', 'utility', 'vendor', 'builder', 'warranty', 'finance', 'other');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    # #region agent log
    try:
        with open(log_path, 'a') as f:
            f.write(json.dumps({"location": "0014_add_portals_directory.py:26", "message": "After creating portal_category enum", "data": {}, "timestamp": __import__('time').time() * 1000, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "A"}) + "\n")
    except: pass
    # #endregion
    
    # Create tenant_enum (reuse if exists, otherwise create)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE tenant_enum AS ENUM ('h2o', 'all_county');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create portal_rule_applies_to enum (reuse if exists, otherwise create)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE portal_rule_applies_to AS ENUM ('job', 'service_call');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create job_phase enum
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE job_phase AS ENUM ('rough', 'trim', 'final');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create portal_definitions table
    # #region agent log
    try:
        with open(log_path, 'a') as f:
            f.write(json.dumps({"location": "0014_add_portals_directory.py:56", "message": "Before creating portal_definitions table", "data": {"enum_name": "portal_category"}, "timestamp": __import__('time').time() * 1000, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "A"}) + "\n")
    except: pass
    # #endregion
    op.create_table('portal_definitions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.Text, nullable=False),
        sa.Column('category', sa.Enum('permit', 'inspection', 'utility', 'vendor', 'builder', 'warranty', 'finance', 'other', name='portal_category', create_type=False), nullable=False),
        sa.Column('jurisdiction', sa.Text, nullable=True),
        sa.Column('base_url', sa.Text, nullable=False),
        sa.Column('support_phone', sa.Text, nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    
    # Create portal_accounts table
    op.create_table('portal_accounts',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('portal_definition_id', UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', sa.Enum('h2o', 'all_county', name='tenant_enum', create_type=False), nullable=False),
        sa.Column('login_identifier', sa.Text, nullable=False),
        sa.Column('account_number', sa.Text, nullable=True),
        sa.Column('credential_vault_ref', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('owner', sa.Text, nullable=True),
        sa.Column('last_verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_foreign_key('fk_portal_accounts_definition', 'portal_accounts', 'portal_definitions', ['portal_definition_id'], ['id'])
    op.create_index('ix_portal_accounts_tenant', 'portal_accounts', ['tenant_id'])
    op.create_index('ix_portal_accounts_definition', 'portal_accounts', ['portal_definition_id'])
    
    # Create builder_portal_accounts junction table
    op.create_table('builder_portal_accounts',
        sa.Column('builder_id', UUID(as_uuid=True), nullable=False),
        sa.Column('portal_account_id', UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_primary_key('pk_builder_portal_accounts', 'builder_portal_accounts', ['builder_id', 'portal_account_id'])
    op.create_foreign_key('fk_builder_portal_accounts_builder', 'builder_portal_accounts', 'builders', ['builder_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('fk_builder_portal_accounts_account', 'builder_portal_accounts', 'portal_accounts', ['portal_account_id'], ['id'], ondelete='CASCADE')
    
    # Create portal_rules table
    op.create_table('portal_rules',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('applies_to', sa.Enum('job', 'service_call', name='portal_rule_applies_to', create_type=False), nullable=False),
        sa.Column('tenant_id', sa.Enum('h2o', 'all_county', name='tenant_enum', create_type=False), nullable=True),
        sa.Column('builder_id', UUID(as_uuid=True), nullable=True),
        sa.Column('city', sa.Text, nullable=True),
        sa.Column('county', sa.Text, nullable=True),
        sa.Column('permit_required', sa.Boolean, nullable=True),
        sa.Column('phase', sa.Enum('rough', 'trim', 'final', name='job_phase', create_type=False), nullable=True),
        sa.Column('portal_account_id', UUID(as_uuid=True), nullable=False),
        sa.Column('priority', sa.Integer, nullable=False, server_default='100'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_foreign_key('fk_portal_rules_account', 'portal_rules', 'portal_accounts', ['portal_account_id'], ['id'])
    op.create_foreign_key('fk_portal_rules_builder', 'portal_rules', 'builders', ['builder_id'], ['id'])
    op.create_index('ix_portal_rules_applies_to', 'portal_rules', ['applies_to'])
    op.create_index('ix_portal_rules_tenant', 'portal_rules', ['tenant_id'])
    op.create_index('ix_portal_rules_priority', 'portal_rules', ['priority'])


def downgrade():
    op.drop_table('portal_rules')
    op.drop_table('builder_portal_accounts')
    op.drop_table('portal_accounts')
    op.drop_table('portal_definitions')
    op.execute("DROP TYPE IF EXISTS portal_rule_applies_to")
    op.execute("DROP TYPE IF EXISTS portal_category")
    # Note: tenant_enum and job_phase may be used elsewhere, so we don't drop them

