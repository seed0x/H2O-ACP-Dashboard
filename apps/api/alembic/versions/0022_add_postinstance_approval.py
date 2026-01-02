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
    # Add reviewer field to post_instances for approval tracking
    op.add_column('post_instances', sa.Column('reviewer', sa.String(), nullable=True))
    
    # Note: Status values are validated in application code, not at database level
    # The valid statuses for PostInstance are now:
    # 'Planned', 'Draft', 'Needs Approval', 'Approved', 'Scheduled', 'Posted', 'Failed'


def downgrade():
    op.drop_column('post_instances', 'reviewer')

