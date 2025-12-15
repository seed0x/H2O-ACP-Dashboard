"""Add warranty tracking to jobs

Revision ID: 0002
Revises: 0001
Create Date: 2025-12-15

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('jobs', sa.Column('warranty_start_date', sa.Date(), nullable=True))
    op.add_column('jobs', sa.Column('warranty_end_date', sa.Date(), nullable=True))
    op.add_column('jobs', sa.Column('warranty_notes', sa.Text(), nullable=True))
    op.add_column('jobs', sa.Column('completion_date', sa.Date(), nullable=True))


def downgrade():
    op.drop_column('jobs', 'completion_date')
    op.drop_column('jobs', 'warranty_notes')
    op.drop_column('jobs', 'warranty_end_date')
    op.drop_column('jobs', 'warranty_start_date')
