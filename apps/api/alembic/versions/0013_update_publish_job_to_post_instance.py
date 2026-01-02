"""update publish_job to reference post_instance instead of content_post

Revision ID: 0013
Revises: 0012
Create Date: 2025-01-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '0013'
down_revision = '0012'
branch_labels = None
depends_on = None


def upgrade():
    # Drop the old foreign key constraint
    op.drop_constraint('publish_jobs_content_post_id_fkey', 'publish_jobs', type_='foreignkey')
    
    # Rename the column
    op.alter_column('publish_jobs', 'content_post_id', new_column_name='post_instance_id')
    
    # Add new foreign key constraint to post_instances
    op.create_foreign_key(
        'publish_jobs_post_instance_id_fkey',
        'publish_jobs',
        'post_instances',
        ['post_instance_id'],
        ['id']
    )
    
    # Update publish_job_id foreign key in post_instances if it exists
    # (This should already be nullable, so we just need to add the FK if it doesn't exist)
    try:
        op.create_foreign_key(
            'post_instances_publish_job_id_fkey',
            'post_instances',
            'publish_jobs',
            ['publish_job_id'],
            ['id']
        )
    except Exception:
        # Foreign key might already exist, ignore
        pass


def downgrade():
    # Remove foreign key from post_instances
    op.drop_constraint('post_instances_publish_job_id_fkey', 'post_instances', type_='foreignkey')
    
    # Drop the new foreign key constraint
    op.drop_constraint('publish_jobs_post_instance_id_fkey', 'publish_jobs', type_='foreignkey')
    
    # Rename the column back
    op.alter_column('publish_jobs', 'post_instance_id', new_column_name='content_post_id')
    
    # Add back the old foreign key constraint
    op.create_foreign_key(
        'publish_jobs_content_post_id_fkey',
        'publish_jobs',
        'content_posts',
        ['content_post_id'],
        ['id']
    )






