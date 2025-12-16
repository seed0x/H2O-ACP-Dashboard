"""add tech_name to jobs

Revision ID: 0008
Revises: 0007
Create Date: 2025-12-15
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('jobs', sa.Column('tech_name', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('jobs', 'tech_name')

