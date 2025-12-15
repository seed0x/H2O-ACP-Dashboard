from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from .database import get_db
from .models import MarketingChannel, ChannelAccount, ContentPost, PublishJob, AuditLog
from .schemas_marketing import (
    MarketingChannel as MarketingChannelSchema,
    ChannelAccount as ChannelAccountSchema,
    ChannelAccountCreate,
    ChannelAccountUpdate,
    ContentPost as ContentPostSchema,
    ContentPostCreate,
    ContentPostUpdate,
    MarkPostedRequest,
    MarkFailedRequest,
    QueuePublishRequest,
)

router = APIRouter(prefix="/marketing", tags=["marketing"])


# Helper function for audit logging
def log_audit(db: Session, entity_type: str, entity_id: UUID, action: str, changed_by: str, tenant_id: str = None):
    audit = AuditLog(
        tenant_id=tenant_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        changed_by=changed_by
    )
    db.add(audit)


# Marketing Channels

@router.get("/channels", response_model=List[MarketingChannelSchema])
def get_channels(db: Session = Depends(get_db)):
    """Get all marketing channels"""
    return db.query(MarketingChannel).all()


# Channel Accounts

@router.get("/channel-accounts", response_model=List[ChannelAccountSchema])
def get_channel_accounts(
    tenant_id: str = Query(...),
    channel_key: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get channel accounts with filters"""
    query = db.query(ChannelAccount).filter(ChannelAccount.tenant_id == tenant_id)
    
    if channel_key:
        query = query.join(MarketingChannel).filter(MarketingChannel.key == channel_key)
    
    if status:
        query = query.filter(ChannelAccount.status == status)
    
    if search:
        query = query.filter(
            or_(
                ChannelAccount.name.ilike(f"%{search}%"),
                ChannelAccount.login_email.ilike(f"%{search}%")
            )
        )
    
    return query.all()


@router.post("/channel-accounts", response_model=ChannelAccountSchema)
def create_channel_account(
    account: ChannelAccountCreate,
    db: Session = Depends(get_db)
):
    """Create a new channel account"""
    db_account = ChannelAccount(**account.model_dump())
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    
    log_audit(db, "channel_account", db_account.id, "create", "admin", account.tenant_id)
    db.commit()
    
    return db_account


@router.get("/channel-accounts/{account_id}", response_model=ChannelAccountSchema)
def get_channel_account(account_id: UUID, db: Session = Depends(get_db)):
    """Get a specific channel account"""
    account = db.query(ChannelAccount).filter(ChannelAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    return account


@router.patch("/channel-accounts/{account_id}", response_model=ChannelAccountSchema)
def update_channel_account(
    account_id: UUID,
    account_update: ChannelAccountUpdate,
    db: Session = Depends(get_db)
):
    """Update a channel account"""
    db_account = db.query(ChannelAccount).filter(ChannelAccount.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    update_data = account_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_account, field, value)
    
    db.commit()
    db.refresh(db_account)
    
    log_audit(db, "channel_account", db_account.id, "update", "admin", db_account.tenant_id)
    db.commit()
    
    return db_account


@router.delete("/channel-accounts/{account_id}")
def delete_channel_account(account_id: UUID, db: Session = Depends(get_db)):
    """Delete a channel account"""
    db_account = db.query(ChannelAccount).filter(ChannelAccount.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    tenant_id = db_account.tenant_id
    log_audit(db, "channel_account", db_account.id, "delete", "admin", tenant_id)
    
    db.delete(db_account)
    db.commit()
    
    return {"message": "Channel account deleted"}


# Content Posts

@router.get("/content-posts", response_model=List[ContentPostSchema])
def get_content_posts(
    tenant_id: str = Query(...),
    status: Optional[str] = None,
    channel_key: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get content posts with filters"""
    query = db.query(ContentPost).filter(ContentPost.tenant_id == tenant_id)
    
    if status:
        query = query.filter(ContentPost.status == status)
    
    if channel_key:
        query = query.join(ChannelAccount).join(MarketingChannel).filter(MarketingChannel.key == channel_key)
    
    if date_from:
        query = query.filter(ContentPost.scheduled_for >= date_from)
    
    if date_to:
        query = query.filter(ContentPost.scheduled_for <= date_to)
    
    if search:
        query = query.filter(
            or_(
                ContentPost.title.ilike(f"%{search}%"),
                ContentPost.body_text.ilike(f"%{search}%"),
                ContentPost.tags.contains([search])
            )
        )
    
    return query.order_by(ContentPost.scheduled_for.desc()).all()


@router.post("/content-posts", response_model=ContentPostSchema)
def create_content_post(
    post: ContentPostCreate,
    db: Session = Depends(get_db)
):
    """Create a new content post"""
    db_post = ContentPost(**post.model_dump())
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    
    log_audit(db, "content_post", db_post.id, "create", post.owner, post.tenant_id)
    db.commit()
    
    return db_post


@router.get("/content-posts/{post_id}", response_model=ContentPostSchema)
def get_content_post(post_id: UUID, db: Session = Depends(get_db)):
    """Get a specific content post"""
    post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Content post not found")
    return post


@router.patch("/content-posts/{post_id}", response_model=ContentPostSchema)
def update_content_post(
    post_id: UUID,
    post_update: ContentPostUpdate,
    db: Session = Depends(get_db)
):
    """Update a content post"""
    db_post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Content post not found")
    
    update_data = post_update.model_dump(exclude_unset=True)
    
    # Validate status transitions
    if 'status' in update_data:
        new_status = update_data['status']
        
        if new_status == 'Needs_Approval' and not (db_post.caption or db_post.notes):
            raise HTTPException(status_code=400, detail="Caption or notes required for approval")
        
        if new_status == 'Approved' and not db_post.reviewer:
            raise HTTPException(status_code=400, detail="Reviewer required for approval")
        
        if new_status == 'Scheduled' and not db_post.scheduled_for:
            raise HTTPException(status_code=400, detail="Scheduled time required")
        
        if new_status == 'Posted' and not db_post.posted_at:
            update_data['posted_at'] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(db_post, field, value)
    
    db.commit()
    db.refresh(db_post)
    
    log_audit(db, "content_post", db_post.id, "update", db_post.owner, db_post.tenant_id)
    db.commit()
    
    return db_post


@router.delete("/content-posts/{post_id}")
def delete_content_post(post_id: UUID, db: Session = Depends(get_db)):
    """Delete a content post"""
    db_post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Content post not found")
    
    tenant_id = db_post.tenant_id
    owner = db_post.owner
    log_audit(db, "content_post", db_post.id, "delete", owner, tenant_id)
    
    db.delete(db_post)
    db.commit()
    
    return {"message": "Content post deleted"}


# Calendar View

@router.get("/calendar")
def get_calendar(
    tenant_id: str = Query(...),
    date_from: datetime = Query(...),
    date_to: datetime = Query(...),
    db: Session = Depends(get_db)
):
    """Get content posts for calendar view"""
    posts = db.query(ContentPost).filter(
        and_(
            ContentPost.tenant_id == tenant_id,
            ContentPost.scheduled_for >= date_from,
            ContentPost.scheduled_for <= date_to
        )
    ).order_by(ContentPost.scheduled_for).all()
    
    # Group by date
    calendar_data = {}
    for post in posts:
        if post.scheduled_for:
            date_key = post.scheduled_for.date().isoformat()
            if date_key not in calendar_data:
                calendar_data[date_key] = []
            calendar_data[date_key].append(ContentPostSchema.from_orm(post))
    
    # Return as array of {date, posts} objects for easier frontend consumption
    return [
        {'date': date, 'posts': posts}
        for date, posts in calendar_data.items()
    ]


# Publishing Actions

@router.post("/content-posts/{post_id}/mark-posted", response_model=ContentPostSchema)
def mark_post_as_posted(
    post_id: UUID,
    request: MarkPostedRequest,
    db: Session = Depends(get_db)
):
    """Mark a post as manually posted"""
    db_post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Content post not found")
    
    db_post.status = 'Posted'
    db_post.posted_at = request.posted_at or datetime.utcnow()
    db_post.last_error = None
    
    db.commit()
    db.refresh(db_post)
    
    log_audit(db, "content_post", db_post.id, "mark_posted", db_post.owner, db_post.tenant_id)
    db.commit()
    
    return db_post


@router.post("/content-posts/{post_id}/mark-failed", response_model=ContentPostSchema)
def mark_post_as_failed(
    post_id: UUID,
    request: MarkFailedRequest,
    db: Session = Depends(get_db)
):
    """Mark a post as failed with error"""
    db_post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Content post not found")
    
    db_post.status = 'Failed'
    db_post.last_error = request.error
    
    db.commit()
    db.refresh(db_post)
    
    log_audit(db, "content_post", db_post.id, "mark_failed", db_post.owner, db_post.tenant_id)
    db.commit()
    
    return db_post


@router.post("/content-posts/{post_id}/queue-publish")
def queue_publish(
    post_id: UUID,
    request: QueuePublishRequest,
    db: Session = Depends(get_db)
):
    """Queue a post for API publishing (stub for now)"""
    db_post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Content post not found")
    
    # Check if any account supports autopost (using first channel for now)
    if not db_post.channel_ids:
        raise HTTPException(status_code=400, detail="No channels assigned to post")
    
    account = db.query(ChannelAccount).filter(ChannelAccount.id == db_post.channel_ids[0]).first()
    if not account or not account.oauth_connected:
        raise HTTPException(status_code=400, detail="Account not connected for auto-posting")
    
    # Create publish job (stub - actual publishing would be done by worker)
    job = PublishJob(
        tenant_id=db_post.tenant_id,
        content_post_id=db_post.id,
        attempt_no=1,
        method='api',
        provider=account.oauth_provider or 'unknown',
        status='queued'
    )
    db.add(job)
    db.commit()
    
    return {"message": "Post queued for publishing", "job_id": str(job.id)}


# Weekly Scoreboard

@router.get("/scoreboard")
def get_weekly_scoreboard(
    tenant_id: str = Query(...),
    week_start: datetime = Query(...),
    week_end: datetime = Query(...),
    db: Session = Depends(get_db)
):
    """Get weekly accountability scoreboard by owner"""
    posts = db.query(ContentPost).filter(
        and_(
            ContentPost.tenant_id == tenant_id,
            or_(
                and_(
                    ContentPost.scheduled_for >= week_start,
                    ContentPost.scheduled_for <= week_end
                ),
                and_(
                    ContentPost.created_at >= week_start,
                    ContentPost.created_at <= week_end
                )
            )
        )
    ).all()
    
    # Group by owner
    scoreboard = {}
    for post in posts:
        owner = post.owner or 'Unassigned'
        if owner not in scoreboard:
            scoreboard[owner] = {
                'owner': owner,
                'planned': 0,
                'posted': 0,
                'missed': 0,
                'failed': 0,
                'canceled': 0,
                'overdue_drafts': 0
            }
        
        # Count planned (created this week or scheduled this week)
        if (post.created_at >= week_start and post.created_at <= week_end) or \
           (post.scheduled_for and post.scheduled_for >= week_start and post.scheduled_for <= week_end):
            scoreboard[owner]['planned'] += 1
        
        # Count by status
        if post.status == 'Posted':
            scoreboard[owner]['posted'] += 1
        elif post.status == 'Failed':
            scoreboard[owner]['failed'] += 1
        elif post.status == 'Canceled':
            scoreboard[owner]['canceled'] += 1
        
        # Check if overdue draft
        if post.status in ['Draft', 'Idea'] and post.draft_due_date:
            if post.draft_due_date < datetime.utcnow():
                scoreboard[owner]['overdue_drafts'] += 1
        
        # Check if missed scheduled post
        if post.status == 'Scheduled' and post.scheduled_for:
            if post.scheduled_for < datetime.utcnow():
                scoreboard[owner]['missed'] += 1
    
    return list(scoreboard.values())


# Audit Trail

@router.get("/audit-trail/{entity_id}")
def get_audit_trail(
    entity_id: UUID,
    entity_type: str = Query("content_post"),
    db: Session = Depends(get_db)
):
    """Get audit trail for an entity"""
    logs = db.query(AuditLog).filter(
        and_(
            AuditLog.entity_type == entity_type,
            AuditLog.entity_id == entity_id
        )
    ).order_by(AuditLog.changed_at.desc()).all()
    
    return [
        {
            'id': str(log.id),
            'action': log.action,
            'field': log.field,
            'old_value': log.old_value,
            'new_value': log.new_value,
            'changed_by': log.changed_by,
            'changed_at': log.changed_at.isoformat()
        }
        for log in logs
    ]
