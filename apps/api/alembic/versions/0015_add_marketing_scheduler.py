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
    # Add scheduling fields to channel_accounts
    op.add_column('channel_accounts', sa.Column('posts_per_week', sa.Integer(), nullable=True))
    op.add_column('channel_accounts', sa.Column('schedule_timezone', sa.String(), nullable=True))
    op.add_column('channel_accounts', sa.Column('schedule_times', ARRAY(sa.String()), nullable=True))
    
    # Set default values for existing rows
    op.execute("UPDATE channel_accounts SET posts_per_week = 3 WHERE posts_per_week IS NULL")
    op.execute("UPDATE channel_accounts SET schedule_timezone = 'America/Los_Angeles' WHERE schedule_timezone IS NULL")
    
    # Add unique constraint to prevent duplicate PostInstances
    # This ensures idempotency: (tenant_id, channel_account_id, scheduled_for) must be unique
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
    
    # Now create the unique constraint
    op.create_unique_constraint(
        'uq_post_instances_tenant_account_scheduled',
        'post_instances',
        ['tenant_id', 'channel_account_id', 'scheduled_for']
    )


def downgrade():
    op.drop_constraint('uq_post_instances_tenant_account_scheduled', 'post_instances', type_='unique')
    op.drop_column('channel_accounts', 'schedule_times')
    op.drop_column('channel_accounts', 'schedule_timezone')
    op.drop_column('channel_accounts', 'posts_per_week')

