"""add postinstance approval workflow

Revision ID: 0022_add_postinstance_approval
Revises: 0021_add_customers
Create Date: 2025-01-XX 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0022_add_postinstance_approval'
down_revision = '0021_add_customers'
branch_labels = None
depends_on = None


def upgrade():
    # Add reviewer field to post_instances for approval tracking (idempotent - check if exists first)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='post_instances' AND column_name='reviewer') THEN
                ALTER TABLE post_instances ADD COLUMN reviewer VARCHAR;
            END IF;
        END $$;
    """)
    
    # Note: Status values are validated in application code, not at database level
    # The valid statuses for PostInstance are now:
    # 'Planned', 'Draft', 'Needs Approval', 'Approved', 'Scheduled', 'Posted', 'Failed'


def downgrade():
    op.drop_column('post_instances', 'reviewer')

