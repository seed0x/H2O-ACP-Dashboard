"""seed marketing channels

Revision ID: 0004
Revises: 0003
Create Date: 2025-12-15

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Insert seed channels
    op.execute("""
        INSERT INTO marketing_channels (key, display_name, supports_autopost) VALUES
        ('google_business_profile', 'Google Business Profile', true),
        ('facebook_page', 'Facebook Page', true),
        ('instagram_business', 'Instagram Business', true),
        ('nextdoor', 'Nextdoor', false)
    """)


def downgrade() -> None:
    op.execute("""
        DELETE FROM marketing_channels WHERE key IN (
            'google_business_profile', 
            'facebook_page', 
            'instagram_business', 
            'nextdoor'
        )
    """)
