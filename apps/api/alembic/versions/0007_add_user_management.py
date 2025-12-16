"""add user management

Revision ID: 0007
Revises: 0006
Create Date: 2025-12-15
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=True),
        sa.Column('role', sa.String(), nullable=False, server_default='user'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('tenant_id', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_unique_constraint('uq_users_username', 'users', ['username'])
    op.create_unique_constraint('uq_users_email', 'users', ['email'])
    op.create_index('ix_users_tenant_id', 'users', ['tenant_id'])
    op.create_index('ix_users_role', 'users', ['role'])


def downgrade():
    op.drop_index('ix_users_role', table_name='users')
    op.drop_index('ix_users_tenant_id', table_name='users')
    op.drop_constraint('uq_users_email', 'users', type_='unique')
    op.drop_constraint('uq_users_username', 'users', type_='unique')
    op.drop_table('users')

