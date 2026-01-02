"""add review system

Revision ID: 0009
Revises: 0008
Create Date: 2025-01-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade():
    # Review requests table
    op.create_table('review_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Text(), nullable=False),
        sa.Column('service_call_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('customer_name', sa.Text(), nullable=False),
        sa.Column('customer_email', sa.Text(), nullable=True),
        sa.Column('customer_phone', sa.Text(), nullable=True),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reminder_sent', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['service_call_id'], ['service_calls.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='SET NULL'),
    )
    op.create_unique_constraint('uq_review_requests_token', 'review_requests', ['token'])
    op.create_index('ix_review_requests_tenant_id', 'review_requests', ['tenant_id'])
    op.create_index('ix_review_requests_status', 'review_requests', ['status'])
    op.create_index('ix_review_requests_service_call_id', 'review_requests', ['service_call_id'])
    op.create_index('ix_review_requests_job_id', 'review_requests', ['job_id'])

    # Reviews table
    op.create_table('reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('review_request_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('customer_name', sa.Text(), nullable=False),
        sa.Column('customer_email', sa.Text(), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['review_request_id'], ['review_requests.id'], ondelete='CASCADE'),
    )
    op.create_unique_constraint('uq_reviews_review_request_id', 'reviews', ['review_request_id'])
    op.create_index('ix_reviews_rating', 'reviews', ['rating'])
    op.create_index('ix_reviews_is_public', 'reviews', ['is_public'])

    # Recovery tickets table
    op.create_table('recovery_tickets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Text(), nullable=False),
        sa.Column('review_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service_call_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('customer_name', sa.Text(), nullable=False),
        sa.Column('customer_email', sa.Text(), nullable=True),
        sa.Column('customer_phone', sa.Text(), nullable=True),
        sa.Column('issue_description', sa.Text(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='open'),
        sa.Column('assigned_to', sa.String(), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['service_call_id'], ['service_calls.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_recovery_tickets_tenant_id', 'recovery_tickets', ['tenant_id'])
    op.create_index('ix_recovery_tickets_status', 'recovery_tickets', ['status'])
    op.create_index('ix_recovery_tickets_review_id', 'recovery_tickets', ['review_id'])


def downgrade():
    op.drop_index('ix_recovery_tickets_review_id', table_name='recovery_tickets')
    op.drop_index('ix_recovery_tickets_status', table_name='recovery_tickets')
    op.drop_index('ix_recovery_tickets_tenant_id', table_name='recovery_tickets')
    op.drop_table('recovery_tickets')
    
    op.drop_index('ix_reviews_is_public', table_name='reviews')
    op.drop_index('ix_reviews_rating', table_name='reviews')
    op.drop_constraint('uq_reviews_review_request_id', 'reviews', type_='unique')
    op.drop_table('reviews')
    
    op.drop_index('ix_review_requests_job_id', table_name='review_requests')
    op.drop_index('ix_review_requests_service_call_id', table_name='review_requests')
    op.drop_index('ix_review_requests_status', table_name='review_requests')
    op.drop_index('ix_review_requests_tenant_id', table_name='review_requests')
    op.drop_constraint('uq_review_requests_token', 'review_requests', type_='unique')
    op.drop_table('review_requests')







