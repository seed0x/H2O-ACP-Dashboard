from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.exc import IntegrityError
from . import models, schemas
from typing import Optional, List
from uuid import UUID

async def create_builder(db: AsyncSession, builder_in: schemas.BuilderCreate, changed_by: str) -> models.Builder:
    builder = models.Builder(name=builder_in.name, notes=builder_in.notes)
    db.add(builder)
    await db.flush()
    # write audit
    await db.execute(models.AuditLog.__table__.insert().values(
        tenant_id=None,
        entity_type='builder',
        entity_id=builder.id,
        action='create',
        changed_by=changed_by,
    ))
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise ValueError('Builder name must be unique')
    await db.refresh(builder)
    return builder

async def get_builder(db: AsyncSession, builder_id: UUID) -> Optional[models.Builder]:
    q = select(models.Builder).where(models.Builder.id == builder_id)
    res = await db.execute(q)
    return res.scalar_one_or_none()

async def list_builders(db: AsyncSession, search: Optional[str], limit: int, offset: int) -> List[models.Builder]:
    q = select(models.Builder)
    if search:
        q = q.where(models.Builder.name.ilike(f"%{search}%"))
    q = q.order_by(models.Builder.name).limit(limit).offset(offset)
    res = await db.execute(q)
    return res.scalars().all()

async def update_builder(db: AsyncSession, builder: models.Builder, builder_in: schemas.BuilderUpdate, changed_by: str) -> models.Builder:
    if builder_in.name is not None:
        old = builder.name
        builder.name = builder_in.name
        await db.execute(models.AuditLog.__table__.insert().values(
            tenant_id=None,
            entity_type='builder',
            entity_id=builder.id,
            action='update',
            field='name',
            old_value=str(old),
            new_value=str(builder_in.name),
            changed_by=changed_by,
        ))
    if builder_in.notes is not None:
        old = builder.notes
        builder.notes = builder_in.notes
        await db.execute(models.AuditLog.__table__.insert().values(
            tenant_id=None,
            entity_type='builder',
            entity_id=builder.id,
            action='update',
            field='notes',
            old_value=str(old) if old is not None else None,
            new_value=str(builder_in.notes) if builder_in.notes is not None else None,
            changed_by=changed_by,
        ))
    db.add(builder)
    await db.commit()
    await db.refresh(builder)
    return builder

async def delete_builder(db: AsyncSession, builder: models.Builder, changed_by: str):
    await db.execute(models.AuditLog.__table__.insert().values(
        tenant_id=None,
        entity_type='builder',
        entity_id=builder.id,
        action='delete',
        changed_by=changed_by,
    ))
    await db.delete(builder)
    await db.commit()

# Builder contacts
async def create_builder_contact(db: AsyncSession, builder_id: UUID, contact_in: schemas.BuilderContactCreate, changed_by: str) -> models.BuilderContact:
    contact = models.BuilderContact(builder_id=builder_id, **contact_in.dict())
    db.add(contact)
    await db.flush()
    await db.execute(models.AuditLog.__table__.insert().values(
        tenant_id=None,
        entity_type='builder_contact',
        entity_id=contact.id,
        action='create',
        changed_by=changed_by,
    ))
    await db.commit()
    await db.refresh(contact)
    return contact

async def list_builder_contacts(db: AsyncSession, builder_id: UUID, tenant_filter: Optional[str] = None) -> List[models.BuilderContact]:
    q = select(models.BuilderContact).where(models.BuilderContact.builder_id == builder_id)
    if tenant_filter == 'all_county':
        q = q.where(models.BuilderContact.visibility.in_(['both', 'all_county']))
    elif tenant_filter == 'h2o':
        q = q.where(models.BuilderContact.visibility.in_(['both', 'h2o']))
    res = await db.execute(q.order_by(models.BuilderContact.name))
    return res.scalars().all()

async def get_builder_contact(db: AsyncSession, contact_id: UUID) -> Optional[models.BuilderContact]:
    q = select(models.BuilderContact).where(models.BuilderContact.id == contact_id)
    res = await db.execute(q)
    return res.scalar_one_or_none()

async def update_builder_contact(db: AsyncSession, contact: models.BuilderContact, contact_in: schemas.BuilderContactUpdate, changed_by: str) -> models.BuilderContact:
    for field, value in contact_in.dict(exclude_unset=True).items():
        old = getattr(contact, field)
        setattr(contact, field, value)
        await db.execute(models.AuditLog.__table__.insert().values(
            tenant_id=None,
            entity_type='builder_contact',
            entity_id=contact.id,
            action='update',
            field=field,
            old_value=str(old) if old is not None else None,
            new_value=str(value) if value is not None else None,
            changed_by=changed_by,
        ))
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact

async def delete_builder_contact(db: AsyncSession, contact: models.BuilderContact, changed_by: str):
    await db.execute(models.AuditLog.__table__.insert().values(
        tenant_id=None,
        entity_type='builder_contact',
        entity_id=contact.id,
        action='delete',
        changed_by=changed_by,
    ))
    await db.delete(contact)
    await db.commit()

# generic audit helper
async def write_audit(db: AsyncSession, tenant_id: str | None, entity_type: str, entity_id: UUID, action: str, changed_by: str, field: str | None = None, old_value: str | None = None, new_value: str | None = None):
    await db.execute(models.AuditLog.__table__.insert().values(
        tenant_id=tenant_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        field=field,
        old_value=old_value,
        new_value=new_value,
        changed_by=changed_by,
    ))
    # don't commit here, caller will commit

### Bids
async def create_bid(db: AsyncSession, bid_in: schemas.BidCreate, changed_by: str) -> models.Bid:
    bid = models.Bid(**bid_in.dict())
    db.add(bid)
    await db.flush()
    await write_audit(db, bid.tenant_id, 'bid', bid.id, 'create', changed_by)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise ValueError('Failed to create bid, possible constraint violation')
    await db.refresh(bid)
    return bid

async def get_bid(db: AsyncSession, bid_id: UUID) -> models.Bid | None:
    q = select(models.Bid).where(models.Bid.id == bid_id)
    res = await db.execute(q)
    return res.scalar_one_or_none()

async def list_bids(db: AsyncSession, tenant_id: str | None, status: str | None, builder_id: UUID | None, search: str | None, limit: int, offset: int):
    q = select(models.Bid)
    if tenant_id:
        q = q.where(models.Bid.tenant_id == tenant_id)
    if status:
        q = q.where(models.Bid.status == status)
    if builder_id:
        q = q.where(models.Bid.builder_id == builder_id)
    if search:
        q = q.where(models.Bid.project_name.ilike(f"%{search}%"))
    q = q.order_by(models.Bid.created_at.desc()).limit(limit).offset(offset)
    res = await db.execute(q)
    return res.scalars().all()

async def update_bid(db: AsyncSession, bid: models.Bid, bid_in: schemas.BidUpdate, changed_by: str) -> models.Bid:
    for field, value in bid_in.dict(exclude_unset=True).items():
        old = getattr(bid, field)
        setattr(bid, field, value)
        await write_audit(db, bid.tenant_id, 'bid', bid.id, 'update', changed_by, field, str(old) if old is not None else None, str(value) if value is not None else None)
    db.add(bid)
    await db.commit()
    await db.refresh(bid)
    return bid

async def delete_bid(db: AsyncSession, bid: models.Bid, changed_by: str):
    await write_audit(db, bid.tenant_id, 'bid', bid.id, 'delete', changed_by)
    await db.delete(bid)
    await db.commit()

### Bid line items
async def create_bid_line_item(db: AsyncSession, bid_id: UUID, item_in: schemas.BidLineItemCreate, changed_by: str) -> models.BidLineItem:
    item = models.BidLineItem(bid_id=bid_id, **item_in.dict())
    db.add(item)
    await db.flush()
    # find tenant_id for audit
    res = await db.execute(select(models.Bid).where(models.Bid.id == bid_id))
    bid = res.scalar_one_or_none()
    await write_audit(db, bid.tenant_id if bid else None, 'bid', bid_id, 'update', changed_by, 'line_items', None, 'created')
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise ValueError('Failed to create bid line item')
    await db.refresh(item)
    return item

async def get_bid_line_item(db: AsyncSession, item_id: UUID) -> models.BidLineItem | None:
    res = await db.execute(select(models.BidLineItem).where(models.BidLineItem.id == item_id))
    return res.scalar_one_or_none()

async def list_bid_line_items(db: AsyncSession, bid_id: UUID):
    res = await db.execute(select(models.BidLineItem).where(models.BidLineItem.bid_id == bid_id).order_by(models.BidLineItem.created_at))
    return res.scalars().all()

async def update_bid_line_item(db: AsyncSession, item: models.BidLineItem, item_in: schemas.BidLineItemUpdate, changed_by: str) -> models.BidLineItem:
    # find tenant
    res = await db.execute(select(models.Bid).where(models.Bid.id == item.bid_id))
    bid = res.scalar_one_or_none()
    for field, value in item_in.dict(exclude_unset=True).items():
        old = getattr(item, field)
        setattr(item, field, value)
        await write_audit(db, bid.tenant_id if bid else None, 'bid', bid.id, 'update', changed_by, f'line_item.{field}', str(old) if old is not None else None, str(value) if value is not None else None)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item

async def delete_bid_line_item(db: AsyncSession, item: models.BidLineItem, changed_by: str):
    res = await db.execute(select(models.Bid).where(models.Bid.id == item.bid_id))
    bid = res.scalar_one_or_none()
    await write_audit(db, bid.tenant_id if bid else None, 'bid', bid.id, 'update', changed_by, 'line_items', 'deleted', 'deleted')
    await db.delete(item)
    await db.commit()

### Jobs
async def create_job(db: AsyncSession, job_in: schemas.JobCreate, changed_by: str, commit: bool = True) -> models.Job:
    job = models.Job(**job_in.dict())
    db.add(job)
    await db.flush()
    await write_audit(db, job.tenant_id, 'job', job.id, 'create', changed_by)
    if commit:
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise ValueError('Job uniqueness constraint violated')
        await db.refresh(job)
    return job

async def get_job(db: AsyncSession, job_id: UUID) -> models.Job | None:
    res = await db.execute(select(models.Job).where(models.Job.id == job_id))
    return res.scalar_one_or_none()

async def list_jobs(db: AsyncSession, tenant_id: str | None, status: str | None, builder_id: UUID | None, community: str | None, lot: str | None, search: str | None, limit: int = 25, offset: int = 0):
    q = select(models.Job)
    if tenant_id:
        q = q.where(models.Job.tenant_id == tenant_id)
    if status:
        q = q.where(models.Job.status == status)
    if builder_id:
        q = q.where(models.Job.builder_id == builder_id)
    if community:
        q = q.where(models.Job.community.ilike(f"%{community}%"))
    if lot:
        q = q.where(models.Job.lot_number.ilike(f"%{lot}%"))
    if search:
        q = q.where(models.Job.address_line1.ilike(f"%{search}%") | models.Job.lot_number.ilike(f"%{search}%"))
    q = q.order_by(models.Job.created_at.desc()).limit(limit).offset(offset)
    res = await db.execute(q)
    return res.scalars().all()

async def update_job(db: AsyncSession, job: models.Job, job_in: schemas.JobUpdate, changed_by: str) -> models.Job:
    old_status = job.status
    for field, value in job_in.dict(exclude_unset=True).items():
        old = getattr(job, field)
        setattr(job, field, value)
        await write_audit(db, job.tenant_id, 'job', job.id, 'update', changed_by, field, str(old) if old is not None else None, str(value) if value is not None else None)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # Trigger automation if status changed
    if job_in.status is not None and old_status != job.status:
        try:
            from ..core.automation import on_job_status_changed
            await on_job_status_changed(db, job, old_status, job.status, changed_by)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error triggering job automation: {e}", exc_info=True)
    
    return job

async def delete_job(db: AsyncSession, job: models.Job, changed_by: str):
    await write_audit(db, job.tenant_id, 'job', job.id, 'delete', changed_by)
    await db.delete(job)
    await db.commit()

### Job contacts
async def add_job_contact(db: AsyncSession, job_id: UUID, contact_id: UUID, role_on_job: str | None, changed_by: str):
    link = models.JobContact(job_id=job_id, builder_contact_id=contact_id, role_on_job=role_on_job)
    db.add(link)
    await db.flush()
    # Write audit
    await write_audit(db, None, 'job', job_id, 'update', changed_by, 'contacts', None, f'linked:{contact_id}')
    await db.commit()
    return link

async def remove_job_contact(db: AsyncSession, job_id: UUID, contact_id: UUID, changed_by: str):
    q = select(models.JobContact).where(models.JobContact.job_id == job_id, models.JobContact.builder_contact_id == contact_id)
    res = await db.execute(q)
    link = res.scalar_one_or_none()
    if not link:
        return False
    await write_audit(db, None, 'job', job_id, 'update', changed_by, 'contacts', f'removed:{contact_id}', None)
    await db.delete(link)
    await db.commit()
    return True

### Service Calls
async def create_service_call(db: AsyncSession, sc_in: schemas.ServiceCallCreate, changed_by: str, commit: bool = True) -> models.ServiceCall:
    sc = models.ServiceCall(**sc_in.dict())
    db.add(sc)
    await db.flush()
    await write_audit(db, sc.tenant_id, 'service_call', sc.id, 'create', changed_by)
    if commit:
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise ValueError('Failed to create service call')
        await db.refresh(sc)
    return sc

async def get_service_call(db: AsyncSession, sc_id: UUID) -> models.ServiceCall | None:
    res = await db.execute(select(models.ServiceCall).where(models.ServiceCall.id == sc_id))
    return res.scalar_one_or_none()

async def list_service_calls(db: AsyncSession, tenant_id: str | None, status: str | None, builder_id: UUID | None, search: str | None, limit: int = 25, offset: int = 0):
    q = select(models.ServiceCall)
    if tenant_id:
        q = q.where(models.ServiceCall.tenant_id == tenant_id)
    if status:
        q = q.where(models.ServiceCall.status == status)
    if builder_id:
        q = q.where(models.ServiceCall.builder_id == builder_id)
    if search:
        q = q.where(models.ServiceCall.customer_name.ilike(f"%{search}%") | models.ServiceCall.address_line1.ilike(f"%{search}%"))
    q = q.order_by(models.ServiceCall.created_at.desc()).limit(limit).offset(offset)
    res = await db.execute(q)
    return res.scalars().all()

async def update_service_call(db: AsyncSession, sc: models.ServiceCall, sc_in: schemas.ServiceCallUpdate, changed_by: str) -> models.ServiceCall:
    old_status = sc.status
    for field, value in sc_in.dict(exclude_unset=True).items():
        old = getattr(sc, field)
        setattr(sc, field, value)
        await write_audit(db, sc.tenant_id, 'service_call', sc.id, 'update', changed_by, field, str(old) if old is not None else None, str(value) if value is not None else None)
    db.add(sc)
    await db.commit()
    await db.refresh(sc)
    
    # Trigger automation if status changed
    if sc_in.status is not None and old_status != sc.status:
        try:
            from ..core.automation import on_service_call_status_changed
            await on_service_call_status_changed(db, sc, old_status, sc.status, changed_by)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error triggering service call automation: {e}", exc_info=True)
    
    # Legacy automation: If service call was just completed, create review request
    if old_status != 'completed' and sc.status == 'completed':
        try:
            from ..core.service_call_automation import on_service_call_completed
            await on_service_call_completed(db, sc, changed_by=changed_by)
        except Exception as e:
            # Log error but don't fail the update
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create review request for service call {sc.id}: {str(e)}")
    
    return sc

async def delete_service_call(db: AsyncSession, sc: models.ServiceCall, changed_by: str):
    await write_audit(db, sc.tenant_id, 'service_call', sc.id, 'delete', changed_by)
    await db.delete(sc)
    await db.commit()

### Audit log pagination
async def list_audit(db: AsyncSession, entity_type: str | None, entity_id: UUID | None, tenant_id: str | None, limit: int = 50, offset: int = 0):
    q = select(models.AuditLog)
    if entity_type:
        q = q.where(models.AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.where(models.AuditLog.entity_id == entity_id)
    if tenant_id:
        q = q.where(models.AuditLog.tenant_id == tenant_id)
    q = q.order_by(models.AuditLog.changed_at.desc()).limit(limit).offset(offset)
    res = await db.execute(q)
    return res.scalars().all()

### Import/Migration Functions
async def find_or_create_builder(db: AsyncSession, builder_name: str, changed_by: str) -> models.Builder:
    """Find builder by name (case-insensitive) or create if not found"""
    if not builder_name:
        raise ValueError("Builder name is required")
    
    q = select(models.Builder).where(func.lower(models.Builder.name) == func.lower(builder_name))
    res = await db.execute(q)
    builder = res.scalar_one_or_none()
    
    if builder:
        return builder
    
    q = select(models.Builder).where(models.Builder.name.ilike(f"%{builder_name}%"))
    res = await db.execute(q)
    builder = res.scalar_one_or_none()
    
    if builder:
        return builder
    
    builder = models.Builder(name=builder_name, notes=f"Auto-created during import by {changed_by}")
    db.add(builder)
    await db.flush()
    await write_audit(db, None, 'builder', builder.id, 'create', changed_by)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        q = select(models.Builder).where(func.lower(models.Builder.name) == func.lower(builder_name))
        res = await db.execute(q)
        builder = res.scalar_one_or_none()
        if builder:
            return builder
        raise ValueError('Builder name must be unique')
    await db.refresh(builder)
    return builder

async def find_duplicate_job(db: AsyncSession, tenant_id: str, builder_id: UUID, community: str, lot_number: str, phase: str) -> Optional[models.Job]:
    """Find duplicate job based on uniqueness constraint"""
    q = select(models.Job).where(
        models.Job.tenant_id == tenant_id,
        models.Job.builder_id == builder_id,
        func.lower(models.Job.community) == func.lower(community),
        func.lower(models.Job.lot_number) == func.lower(lot_number),
        func.lower(models.Job.phase) == func.lower(phase)
    )
    res = await db.execute(q)
    return res.scalar_one_or_none()

async def bulk_import_jobs(
    db: AsyncSession,
    parsed_events: List,
    tenant_id: str,
    changed_by: str,
    skip_duplicates: bool = True
) -> dict:
    """Bulk import jobs from parsed Outlook calendar events"""
    from app.core.outlook_parser import ParsedCalendarEvent
    
    stats = {'created': 0, 'updated': 0, 'skipped': 0, 'errors': 0, 'error_details': []}
    
    total = len([e for e in parsed_events if isinstance(e, ParsedCalendarEvent) and e.job_type in ['job', 'warranty']])
    processed = 0
    commit_batch_size = 50  # Commit every 50 successful records
    
    for event in parsed_events:
        if not isinstance(event, ParsedCalendarEvent):
            continue
        
        if event.job_type not in ['job', 'warranty']:
            continue
        
        if not event.builder_name:
            stats['skipped'] += 1
            continue
        
        try:
            builder = await find_or_create_builder(db, event.builder_name, changed_by)
            
            if event.community and event.lot_number and event.phase:
                duplicate = await find_duplicate_job(db, tenant_id, builder.id, event.community, event.lot_number, event.phase)
                
                if duplicate:
                    if skip_duplicates:
                        stats['skipped'] += 1
                        continue
                    else:
                        update_data = schemas.JobUpdate(
                            scheduled_start=event.start_time,
                            scheduled_end=event.end_time,
                            notes=event.notes
                        )
                        await update_job(db, duplicate, update_data, changed_by)
                        stats['updated'] += 1
                        continue
            
            community = event.community or 'Unknown'
            lot_number = event.lot_number or 'Unknown'
            phase = event.phase or 'TO'
            address = event.address_line1 or 'Address not provided'
            city = event.city or 'Vancouver'
            zip_code = event.zip or '98660'
            
            # Create job directly (bypass create_job to avoid transaction issues)
            try:
                job = models.Job(
                    tenant_id=tenant_id,
                    builder_id=builder.id,
                    community=community,
                    lot_number=lot_number,
                    plan=None,
                    phase=phase,
                    status=event.status or 'scheduled',
                    address_line1=address,
                    city=city,
                    state=event.state or 'WA',
                    zip=zip_code,
                    scheduled_start=event.start_time,
                    scheduled_end=event.end_time,
                    notes=event.notes,
                    tech_name=event.tech_name if hasattr(event, 'tech_name') else None
                )
                db.add(job)
                await db.flush()  # Get the ID
                
                # Write audit log
                await write_audit(db, tenant_id, 'job', job.id, 'create', changed_by)
                
                stats['created'] += 1
                processed += 1
                
                # Commit in batches to avoid losing progress on errors
                if stats['created'] % commit_batch_size == 0:
                    try:
                        await db.commit()
                    except Exception as commit_err:
                        await db.rollback()
                        stats['errors'] += 1
                        if len(stats['error_details']) < 10:
                            stats['error_details'].append({'title': 'Batch commit', 'reason': str(commit_err)[:100]})
                
                if processed % 50 == 0:
                    print(f"  Progress: {processed}/{total} jobs processed...")
                    
            except IntegrityError:
                # Duplicate - rollback just this flush and continue (don't lose previous records)
                await db.rollback()
                stats['skipped'] += 1
                processed += 1
                if processed % 50 == 0:
                    print(f"  Progress: {processed}/{total} jobs processed...")
            except Exception as e:
                # Other errors - rollback just this record and continue
                await db.rollback()
                stats['errors'] += 1
                processed += 1
                if processed % 50 == 0:
                    print(f"  Progress: {processed}/{total} jobs processed...")
                error_msg = str(e)[:100]
                if len(stats['error_details']) < 10:
                    stats['error_details'].append({'title': event.title[:50], 'reason': error_msg})
            
        except Exception as e:
            # Outer exception handler for builder creation, etc.
            await db.rollback()
            stats['errors'] += 1
            processed += 1
            if processed % 50 == 0:
                print(f"  Progress: {processed}/{total} jobs processed...")
            error_msg = str(e)[:100]
            if len(stats['error_details']) < 10:
                stats['error_details'].append({'title': event.title[:50] if hasattr(event, 'title') else 'Unknown', 'reason': error_msg})
            continue
    
    # Final commit for any remaining records
    try:
        await db.commit()
    except Exception:
        await db.rollback()
    
    return stats

async def bulk_import_service_calls(
    db: AsyncSession,
    parsed_events: List,
    tenant_id: str,
    changed_by: str,
    skip_duplicates: bool = True
) -> dict:
    """Bulk import service calls from parsed Outlook calendar events"""
    from app.core.outlook_parser import ParsedCalendarEvent
    
    stats = {'created': 0, 'updated': 0, 'skipped': 0, 'errors': 0, 'error_details': []}
    
    total = len([e for e in parsed_events if isinstance(e, ParsedCalendarEvent) and e.job_type in ['service_call', 'go_back']])
    processed = 0
    commit_batch_size = 50  # Commit every 50 successful records
    
    for event in parsed_events:
        if not isinstance(event, ParsedCalendarEvent):
            continue
        
        if event.job_type not in ['service_call', 'go_back']:
            continue
        
        if not event.address_line1:
            stats['skipped'] += 1
            continue
        
        try:
            builder = None
            if event.builder_name:
                builder = await find_or_create_builder(db, event.builder_name, changed_by)
            
            # Use customer_name from parsed event if available (for H2O format), otherwise extract from title
            customer_name = event.customer_name if hasattr(event, 'customer_name') and event.customer_name else (
                event.title.split('-')[0].strip() if '-' in event.title else 'Customer'
            )
            
            # Create service call directly (bypass create_service_call to avoid transaction issues)
            try:
                sc = models.ServiceCall(
                    tenant_id=tenant_id,
                    builder_id=builder.id if builder else None,
                    customer_name=customer_name,
                    phone=event.phone if hasattr(event, 'phone') else None,
                    email=event.email if hasattr(event, 'email') else None,
                    address_line1=event.address_line1,
                    city=event.city or 'Vancouver',
                    state=event.state or 'WA',
                    zip=event.zip or '98660',
                    issue_description=event.title,
                    priority='Normal',
                    status=event.status or 'open',
                    scheduled_start=event.start_time,
                    scheduled_end=event.end_time,
                    notes=event.notes
                )
                db.add(sc)
                await db.flush()  # Get the ID
                
                # Write audit log
                await write_audit(db, tenant_id, 'service_call', sc.id, 'create', changed_by)
                
                stats['created'] += 1
                processed += 1
                
                # Commit in batches to avoid losing progress on errors
                if stats['created'] % commit_batch_size == 0:
                    try:
                        await db.commit()
                    except Exception as commit_err:
                        await db.rollback()
                        stats['errors'] += 1
                        if len(stats['error_details']) < 10:
                            stats['error_details'].append({'title': 'Batch commit', 'reason': str(commit_err)[:100]})
                
                if processed % 50 == 0:
                    print(f"  Progress: {processed}/{total} service calls processed...")
                    
            except IntegrityError:
                # Duplicate - rollback just this flush and continue (don't lose previous records)
                await db.rollback()
                stats['skipped'] += 1
                processed += 1
                if processed % 50 == 0:
                    print(f"  Progress: {processed}/{total} service calls processed...")
            except Exception as e:
                # Other errors - rollback just this record and continue
                await db.rollback()
                stats['errors'] += 1
                processed += 1
                if processed % 50 == 0:
                    print(f"  Progress: {processed}/{total} service calls processed...")
                error_msg = str(e)[:100]
                if len(stats['error_details']) < 10:
                    stats['error_details'].append({'title': event.title[:50], 'reason': error_msg})
            
        except Exception as e:
            # Outer exception handler for builder creation, etc.
            await db.rollback()
            stats['errors'] += 1
            processed += 1
            if processed % 50 == 0:
                print(f"  Progress: {processed}/{total} service calls processed...")
            error_msg = str(e)[:100]
            if len(stats['error_details']) < 10:
                stats['error_details'].append({'title': event.title[:50] if hasattr(event, 'title') else 'Unknown', 'reason': error_msg})
            continue
    
    # Final commit for any remaining records
    try:
        await db.commit()
    except Exception:
        await db.rollback()
    
    return stats