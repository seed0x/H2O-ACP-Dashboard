from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, or_
from sqlalchemy.orm import selectinload
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
    res = await db.execute(
        select(models.Job)
        .where(models.Job.id == job_id)
        .options(selectinload(models.Job.builder), selectinload(models.Job.tasks))
    )
    return res.scalar_one_or_none()

async def list_jobs(db: AsyncSession, tenant_id: str | None, status: str | None, builder_id: UUID | None, community: str | None, lot: str | None, search: str | None, scheduled_date: str | None = None, limit: int = 25, offset: int = 0):
    from datetime import datetime, timezone
    q = select(models.Job).options(selectinload(models.Job.builder))
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
    if scheduled_date:
        # Filter by scheduled_start date (match the date part only)
        try:
            # Handle both YYYY-MM-DD and ISO datetime formats
            if 'T' in scheduled_date or '+' in scheduled_date or 'Z' in scheduled_date:
                date_obj = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00')).date()
            else:
                # Plain date string YYYY-MM-DD
                date_obj = datetime.fromisoformat(scheduled_date).date()
            
            start_of_day = datetime.combine(date_obj, datetime.min.time()).replace(tzinfo=timezone.utc)
            end_of_day = datetime.combine(date_obj, datetime.max.time()).replace(tzinfo=timezone.utc)
            q = q.where(models.Job.scheduled_start >= start_of_day).where(models.Job.scheduled_start <= end_of_day)
        except (ValueError, AttributeError) as e:
            import logging
            logging.getLogger(__name__).warning(f"Invalid scheduled_date format '{scheduled_date}': {e}")
            pass  # Invalid date format, ignore filter
    q = q.order_by(models.Job.created_at.desc()).limit(limit).offset(offset)
    res = await db.execute(q)
    return res.scalars().all()

async def update_job(db: AsyncSession, job: models.Job, job_in: schemas.JobUpdate, changed_by: str) -> models.Job:
    old_status = job.status
    old_phase = job.phase  # Track phase change
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
    
    # Trigger automation if phase changed
    if job_in.phase is not None and old_phase != job.phase:
        try:
            from ..core.automation import on_job_phase_changed
            await on_job_phase_changed(db, job, old_phase, job.phase, changed_by)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error triggering phase automation: {e}", exc_info=True)
    
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
    # Auto-link to customer if possible
    customer_id = None
    if sc_in.customer_name and sc_in.customer_name.strip() and (sc_in.phone or sc_in.email):
        try:
            # Get email from sc_in if it exists (EmailStr from pydantic needs to be converted to string)
            email_value = None
            if hasattr(sc_in, 'email') and sc_in.email:
                email_value = str(sc_in.email).strip() if sc_in.email else None
                if email_value == '':
                    email_value = None
            
            # Normalize phone
            phone_value = sc_in.phone.strip() if sc_in.phone else None
            if phone_value == '':
                phone_value = None
            
            customer = await find_or_create_customer_by_contact(
                db, 
                sc_in.tenant_id, 
                sc_in.customer_name.strip(), 
                phone_value, 
                email_value,
                changed_by
            )
            customer_id = customer.id if customer else None
        except Exception as e:
            # If customer linking fails, log but don't fail service call creation
            import logging
            logging.getLogger(__name__).warning(f"Failed to auto-link customer for service call: {e}", exc_info=True)
    
    sc_dict = sc_in.dict()
    if customer_id:
        sc_dict['customer_id'] = customer_id
    
    sc = models.ServiceCall(**sc_dict)
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
    res = await db.execute(
        select(models.ServiceCall)
        .where(models.ServiceCall.id == sc_id)
        .options(selectinload(models.ServiceCall.workflow))
    )
    return res.scalar_one_or_none()

async def list_service_calls(db: AsyncSession, tenant_id: str | None, status: str | None, builder_id: UUID | None, search: str | None, assigned_to: str | None = None, scheduled_date: str | None = None, customer_id: UUID | None = None, limit: int = 25, offset: int = 0):
    from datetime import datetime, timezone
    q = select(models.ServiceCall)
    if tenant_id:
        q = q.where(models.ServiceCall.tenant_id == tenant_id)
    if status:
        q = q.where(models.ServiceCall.status == status)
    if builder_id:
        q = q.where(models.ServiceCall.builder_id == builder_id)
    if customer_id:
        q = q.where(models.ServiceCall.customer_id == customer_id)
    if search:
        q = q.where(models.ServiceCall.customer_name.ilike(f"%{search}%") | models.ServiceCall.address_line1.ilike(f"%{search}%"))
    if assigned_to:
        q = q.where(models.ServiceCall.assigned_to == assigned_to)
    if scheduled_date:
        # Filter by scheduled_start date (match the date part only)
        try:
            # Handle both YYYY-MM-DD and ISO datetime formats
            if 'T' in scheduled_date or '+' in scheduled_date or 'Z' in scheduled_date:
                date_obj = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00')).date()
            else:
                # Plain date string YYYY-MM-DD
                date_obj = datetime.fromisoformat(scheduled_date).date()
            
            start_of_day = datetime.combine(date_obj, datetime.min.time()).replace(tzinfo=timezone.utc)
            end_of_day = datetime.combine(date_obj, datetime.max.time()).replace(tzinfo=timezone.utc)
            q = q.where(models.ServiceCall.scheduled_start >= start_of_day).where(models.ServiceCall.scheduled_start <= end_of_day)
        except (ValueError, AttributeError) as e:
            import logging
            logging.getLogger(__name__).warning(f"Invalid scheduled_date format '{scheduled_date}': {e}")
            pass  # Invalid date format, ignore filter
    q = q.order_by(models.ServiceCall.scheduled_start.asc().nullslast(), models.ServiceCall.created_at.desc()).limit(limit).offset(offset)
    res = await db.execute(q)
    return res.scalars().all()

async def update_service_call(db: AsyncSession, sc: models.ServiceCall, sc_in: schemas.ServiceCallUpdate, changed_by: str) -> models.ServiceCall:
    old_status = sc.status
    old_assigned_to = sc.assigned_to  # Track assigned_to changes
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
    
    # Trigger notification if assigned_to changed
    if sc_in.assigned_to is not None and old_assigned_to != sc.assigned_to:
        try:
            from ..core.automation import create_notification
            if sc.assigned_to:
                # Find user by username to get user_id
                user_query = select(models.User).where(models.User.username == sc.assigned_to)
                result = await db.execute(user_query)
                user = result.scalar_one_or_none()
                
                if user:
                    await create_notification(
                        db,
                        sc.tenant_id,
                        'assignment',
                        f'Service Call Assigned: {sc.customer_name}',
                        f'You have been assigned to a service call at {sc.address_line1}, {sc.city}',
                        'service_call',
                        str(sc.id),
                        user.id
                    )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error creating assignment notification: {e}", exc_info=True)
    
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

### Service Call Tasks/Check-offs
async def create_service_call_task(db: AsyncSession, task_dict: dict, changed_by: str) -> models.ServiceCallTask:
    task = models.ServiceCallTask(**task_dict)
    db.add(task)
    await db.flush()
    await write_audit(db, task.tenant_id, 'service_call_task', task.id, 'create', changed_by)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise ValueError('Failed to create service call task')
    await db.refresh(task)
    return task

async def get_service_call_task(db: AsyncSession, task_id: UUID) -> models.ServiceCallTask | None:
    res = await db.execute(
        select(models.ServiceCallTask)
        .where(models.ServiceCallTask.id == task_id)
    )
    return res.scalar_one_or_none()

async def list_service_call_tasks(db: AsyncSession, service_call_id: UUID, status: str | None = None):
    q = select(models.ServiceCallTask).where(models.ServiceCallTask.service_call_id == service_call_id)
    if status:
        q = q.where(models.ServiceCallTask.status == status)
    q = q.order_by(models.ServiceCallTask.created_at.desc())
    res = await db.execute(q)
    return res.scalars().all()

async def list_pending_service_call_tasks(db: AsyncSession, tenant_id: str, assigned_to: str | None = None):
    """Get all pending tasks for office staff dashboard"""
    from datetime import date
    q = select(models.ServiceCallTask).where(
        models.ServiceCallTask.tenant_id == tenant_id,
        models.ServiceCallTask.status == 'pending'
    )
    if assigned_to:
        q = q.where(models.ServiceCallTask.assigned_to == assigned_to)
    # Order by due_date (overdue first), then by created_at
    q = q.order_by(
        models.ServiceCallTask.due_date.asc().nullslast(),
        models.ServiceCallTask.created_at.asc()
    )
    res = await db.execute(q)
    return res.scalars().all()

async def update_service_call_task(db: AsyncSession, task: models.ServiceCallTask, task_in: schemas.ServiceCallTaskUpdate, changed_by: str) -> models.ServiceCallTask:
    old_status = task.status
    for field, value in task_in.dict(exclude_unset=True).items():
        if field == 'completed_at' and value is None:
            # Don't set to None if we're not completing
            continue
        old = getattr(task, field)
        setattr(task, field, value)
        await write_audit(db, task.tenant_id, 'service_call_task', task.id, 'update', changed_by, field, str(old) if old is not None else None, str(value) if value is not None else None)
    
    # If marking as completed, set completed_at if not already set
    if task_in.status == 'completed' and old_status != 'completed' and not task.completed_at:
        from datetime import datetime, timezone
        task.completed_at = datetime.now(timezone.utc)
    
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task

async def delete_service_call_task(db: AsyncSession, task: models.ServiceCallTask, changed_by: str):
    await write_audit(db, task.tenant_id, 'service_call_task', task.id, 'delete', changed_by)
    await db.delete(task)
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

# Portals Directory CRUD

async def create_portal_definition(db: AsyncSession, definition_in: schemas.PortalDefinitionCreate, changed_by: str) -> models.PortalDefinition:
    definition = models.PortalDefinition(**definition_in.dict())
    db.add(definition)
    await db.flush()
    await write_audit(db, None, 'portal_definition', definition.id, 'create', changed_by)
    await db.commit()
    await db.refresh(definition)
    return definition

async def get_portal_definition(db: AsyncSession, definition_id: UUID) -> Optional[models.PortalDefinition]:
    q = select(models.PortalDefinition).where(models.PortalDefinition.id == definition_id)
    res = await db.execute(q)
    return res.scalar_one_or_none()

async def list_portal_definitions(db: AsyncSession, is_active: Optional[bool] = None, category: Optional[str] = None) -> List[models.PortalDefinition]:
    q = select(models.PortalDefinition)
    if is_active is not None:
        q = q.where(models.PortalDefinition.is_active == is_active)
    if category:
        q = q.where(models.PortalDefinition.category == category)
    q = q.order_by(models.PortalDefinition.name)
    res = await db.execute(q)
    return res.scalars().all()

async def update_portal_definition(db: AsyncSession, definition: models.PortalDefinition, definition_in: schemas.PortalDefinitionUpdate, changed_by: str) -> models.PortalDefinition:
    for field, value in definition_in.dict(exclude_unset=True).items():
        old = getattr(definition, field)
        setattr(definition, field, value)
        await write_audit(db, None, 'portal_definition', definition.id, 'update', changed_by, field, str(old) if old is not None else None, str(value) if value is not None else None)
    db.add(definition)
    await db.commit()
    await db.refresh(definition)
    return definition

async def delete_portal_definition(db: AsyncSession, definition: models.PortalDefinition, changed_by: str):
    await write_audit(db, None, 'portal_definition', definition.id, 'delete', changed_by)
    await db.delete(definition)
    await db.commit()

async def create_portal_account(db: AsyncSession, account_in: schemas.PortalAccountCreate, changed_by: str) -> models.PortalAccount:
    account = models.PortalAccount(**account_in.dict())
    db.add(account)
    await db.flush()
    await write_audit(db, account.tenant_id, 'portal_account', account.id, 'create', changed_by)
    await db.commit()
    await db.refresh(account)
    return account

async def get_portal_account(db: AsyncSession, account_id: UUID) -> Optional[models.PortalAccount]:
    q = select(models.PortalAccount).where(models.PortalAccount.id == account_id)
    res = await db.execute(q)
    return res.scalar_one_or_none()

async def list_portal_accounts(db: AsyncSession, tenant_id: Optional[str] = None, is_active: Optional[bool] = None, search: Optional[str] = None) -> List[models.PortalAccount]:
    q = select(models.PortalAccount).options(selectinload(models.PortalAccount.portal_definition))
    if tenant_id:
        q = q.where(models.PortalAccount.tenant_id == tenant_id)
    if is_active is not None:
        q = q.where(models.PortalAccount.is_active == is_active)
    if search:
        q = q.join(models.PortalDefinition).where(
            or_(
                models.PortalDefinition.name.ilike(f"%{search}%"),
                models.PortalAccount.login_identifier.ilike(f"%{search}%"),
                models.PortalAccount.account_number.ilike(f"%{search}%") if models.PortalAccount.account_number else False
            )
        )
    q = q.order_by(models.PortalAccount.created_at.desc())
    res = await db.execute(q)
    return res.scalars().all()

async def update_portal_account(db: AsyncSession, account: models.PortalAccount, account_in: schemas.PortalAccountUpdate, changed_by: str) -> models.PortalAccount:
    for field, value in account_in.dict(exclude_unset=True).items():
        old = getattr(account, field)
        setattr(account, field, value)
        await write_audit(db, account.tenant_id, 'portal_account', account.id, 'update', changed_by, field, str(old) if old is not None else None, str(value) if value is not None else None)
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account

async def delete_portal_account(db: AsyncSession, account: models.PortalAccount, changed_by: str):
    await write_audit(db, account.tenant_id, 'portal_account', account.id, 'delete', changed_by)
    await db.delete(account)
    await db.commit()

async def link_builder_portal_account(db: AsyncSession, builder_id: UUID, portal_account_id: UUID, changed_by: str) -> models.BuilderPortalAccount:
    link = models.BuilderPortalAccount(builder_id=builder_id, portal_account_id=portal_account_id)
    db.add(link)
    await db.flush()
    await write_audit(db, None, 'builder_portal_account', f"{builder_id}:{portal_account_id}", 'create', changed_by)
    await db.commit()
    await db.refresh(link)
    return link

async def unlink_builder_portal_account(db: AsyncSession, builder_id: UUID, portal_account_id: UUID, changed_by: str):
    q = select(models.BuilderPortalAccount).where(
        models.BuilderPortalAccount.builder_id == builder_id,
        models.BuilderPortalAccount.portal_account_id == portal_account_id
    )
    res = await db.execute(q)
    link = res.scalar_one_or_none()
    if link:
        await write_audit(db, None, 'builder_portal_account', f"{builder_id}:{portal_account_id}", 'delete', changed_by)
        await db.delete(link)
        await db.commit()

async def get_builder_portal_accounts(db: AsyncSession, builder_id: UUID) -> List[models.PortalAccount]:
    q = select(models.PortalAccount).join(models.BuilderPortalAccount).where(
        models.BuilderPortalAccount.builder_id == builder_id
    ).options(selectinload(models.PortalAccount.portal_definition))
    res = await db.execute(q)
    return res.scalars().all()

async def create_portal_rule(db: AsyncSession, rule_in: schemas.PortalRuleCreate, changed_by: str) -> models.PortalRule:
    rule = models.PortalRule(**rule_in.dict())
    db.add(rule)
    await db.flush()
    await write_audit(db, rule.tenant_id, 'portal_rule', rule.id, 'create', changed_by)
    await db.commit()
    await db.refresh(rule)
    return rule

async def get_portal_rule(db: AsyncSession, rule_id: UUID) -> Optional[models.PortalRule]:
    q = select(models.PortalRule).where(models.PortalRule.id == rule_id)
    res = await db.execute(q)
    return res.scalar_one_or_none()

async def list_portal_rules(db: AsyncSession, applies_to: Optional[str] = None, tenant_id: Optional[str] = None, is_active: Optional[bool] = None) -> List[models.PortalRule]:
    q = select(models.PortalRule).options(selectinload(models.PortalRule.portal_account).selectinload(models.PortalAccount.portal_definition))
    if applies_to:
        q = q.where(models.PortalRule.applies_to == applies_to)
    if tenant_id:
        q = q.where(or_(models.PortalRule.tenant_id == tenant_id, models.PortalRule.tenant_id.is_(None)))
    if is_active is not None:
        q = q.where(models.PortalRule.is_active == is_active)
    q = q.order_by(models.PortalRule.priority.asc(), models.PortalRule.created_at.desc())
    res = await db.execute(q)
    return res.scalars().all()

async def update_portal_rule(db: AsyncSession, rule: models.PortalRule, rule_in: schemas.PortalRuleUpdate, changed_by: str) -> models.PortalRule:
    for field, value in rule_in.dict(exclude_unset=True).items():
        old = getattr(rule, field)
        setattr(rule, field, value)
        await write_audit(db, rule.tenant_id, 'portal_rule', rule.id, 'update', changed_by, field, str(old) if old is not None else None, str(value) if value is not None else None)
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule

async def delete_portal_rule(db: AsyncSession, rule: models.PortalRule, changed_by: str):
    await write_audit(db, rule.tenant_id, 'portal_rule', rule.id, 'delete', changed_by)
    await db.delete(rule)
    await db.commit()

async def suggest_portals(
    db: AsyncSession,
    applies_to: str,
    tenant_id: str,
    city: Optional[str] = None,
    county: Optional[str] = None,
    builder_id: Optional[UUID] = None,
    permit_required: Optional[bool] = None,
    phase: Optional[str] = None
) -> List[models.PortalAccount]:
    """
    Suggest portal accounts based on rules.
    Returns ordered list (priority ascending, then by creation date).
    """
    # First, get builder-linked portals (highest priority)
    builder_portals = []
    if builder_id:
        builder_portals = await get_builder_portal_accounts(db, builder_id)
        builder_portals = [p for p in builder_portals if p.tenant_id == tenant_id and p.is_active]
    
    # Get matching rules
    q = select(models.PortalRule).where(
        models.PortalRule.applies_to == applies_to,
        models.PortalRule.is_active == True
    ).options(selectinload(models.PortalRule.portal_account).selectinload(models.PortalAccount.portal_definition))
    
    # Tenant filter: rule applies if tenant_id matches OR rule.tenant_id is None (both tenants)
    q = q.where(or_(models.PortalRule.tenant_id == tenant_id, models.PortalRule.tenant_id.is_(None)))
    
    # Additional filters
    if builder_id:
        q = q.where(or_(models.PortalRule.builder_id == builder_id, models.PortalRule.builder_id.is_(None)))
    if city:
        q = q.where(or_(models.PortalRule.city == city, models.PortalRule.city.is_(None)))
    if county:
        q = q.where(or_(models.PortalRule.county == county, models.PortalRule.county.is_(None)))
    if permit_required is not None:
        q = q.where(or_(models.PortalRule.permit_required == permit_required, models.PortalRule.permit_required.is_(None)))
    if phase:
        q = q.where(or_(models.PortalRule.phase == phase, models.PortalRule.phase.is_(None)))
    
    q = q.order_by(models.PortalRule.priority.asc())
    res = await db.execute(q)
    rules = res.scalars().all()
    
    # Collect portal accounts from rules
    rule_portals = []
    seen_account_ids = set()
    
    for rule in rules:
        if rule.portal_account and rule.portal_account.is_active and rule.portal_account.tenant_id == tenant_id:
            if rule.portal_account.id not in seen_account_ids:
                rule_portals.append(rule.portal_account)
                seen_account_ids.add(rule.portal_account.id)
    
    # Combine: builder portals first, then rule portals
    result = []
    builder_account_ids = {p.id for p in builder_portals}
    
    for portal in builder_portals:
        result.append(portal)
    
    for portal in rule_portals:
        if portal.id not in builder_account_ids:
            result.append(portal)
    
    return result

### Customers
async def create_customer(db: AsyncSession, customer_in: schemas.CustomerCreate, changed_by: str) -> models.Customer:
    customer = models.Customer(**customer_in.dict())
    db.add(customer)
    await db.flush()
    await write_audit(db, customer.tenant_id, 'customer', customer.id, 'create', changed_by)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise ValueError('Failed to create customer')
    await db.refresh(customer)
    return customer

async def get_customer(db: AsyncSession, customer_id: UUID) -> Optional[models.Customer]:
    res = await db.execute(
        select(models.Customer)
        .where(models.Customer.id == customer_id)
        .options(selectinload(models.Customer.service_calls))
    )
    return res.scalar_one_or_none()

async def list_customers(db: AsyncSession, tenant_id: str, search: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[dict]:
    q = select(models.Customer, func.count(models.ServiceCall.id).label('service_calls_count')).outerjoin(
        models.ServiceCall, models.ServiceCall.customer_id == models.Customer.id
    ).where(models.Customer.tenant_id == tenant_id).group_by(models.Customer.id)
    
    if search:
        search_term = f"%{search}%"
        q = q.where(
            or_(
                models.Customer.name.ilike(search_term),
                models.Customer.phone.ilike(search_term),
                models.Customer.email.ilike(search_term),
                models.Customer.address_line1.ilike(search_term)
            )
        )
    
    q = q.order_by(models.Customer.created_at.desc()).limit(limit * 2).offset(offset)  # Get more to filter duplicates
    res = await db.execute(q)
    rows = res.all()
    
    # Deduplicate customers by name+phone or name+email
    seen = set()
    customers = []
    for customer, service_calls_count in rows:
        # Create unique key from name + phone or name + email
        unique_key = None
        if customer.phone:
            unique_key = f"{customer.name.lower().strip()}|{customer.phone.strip()}"
        elif customer.email:
            unique_key = f"{customer.name.lower().strip()}|{customer.email.lower().strip()}"
        else:
            unique_key = f"{customer.name.lower().strip()}|{customer.address_line1.lower().strip() if customer.address_line1 else 'no-address'}"
        
        if unique_key and unique_key in seen:
            continue  # Skip duplicate
        
        seen.add(unique_key)
        customer_dict = {
            'id': str(customer.id),
            'tenant_id': customer.tenant_id,
            'name': customer.name,
            'phone': customer.phone,
            'email': customer.email,
            'address_line1': customer.address_line1,
            'city': customer.city,
            'state': customer.state,
            'zip': customer.zip,
            'notes': customer.notes,
            'tags': customer.tags,
            'created_at': customer.created_at.isoformat() if customer.created_at else None,
            'updated_at': customer.updated_at.isoformat() if customer.updated_at else None,
            'service_calls_count': service_calls_count or 0,
        }
        customers.append(customer_dict)
        
        if len(customers) >= limit:
            break  # Stop once we have enough unique customers
    
    return customers

async def update_customer(db: AsyncSession, customer_id: UUID, customer_in: schemas.CustomerUpdate, changed_by: str) -> models.Customer:
    customer = await get_customer(db, customer_id)
    if not customer:
        raise ValueError('Customer not found')
    
    for field, value in customer_in.dict(exclude_unset=True).items():
        old = getattr(customer, field)
        setattr(customer, field, value)
        await write_audit(db, customer.tenant_id, 'customer', customer.id, 'update', changed_by, field, str(old) if old is not None else None, str(value) if value is not None else None)
    
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer

async def delete_customer(db: AsyncSession, customer_id: UUID, changed_by: str) -> bool:
    customer = await get_customer(db, customer_id)
    if not customer:
        return False
    
    # Set customer_id to NULL on related service calls
    await db.execute(
        update(models.ServiceCall)
        .where(models.ServiceCall.customer_id == customer_id)
        .values(customer_id=None)
    )
    
    await write_audit(db, customer.tenant_id, 'customer', customer.id, 'delete', changed_by)
    await db.delete(customer)
    await db.commit()
    return True

async def find_or_create_customer_by_contact(db: AsyncSession, tenant_id: str, name: str, phone: Optional[str] = None, email: Optional[str] = None, changed_by: str = "system") -> Optional[models.Customer]:
    """Find existing customer by phone/email, or create new one"""
    if not phone and not email:
        return None
    
    # Try to find by phone first, then email
    q = select(models.Customer).where(models.Customer.tenant_id == tenant_id)
    if phone:
        q = q.where(models.Customer.phone == phone)
    elif email:
        q = q.where(models.Customer.email == email)
    
    res = await db.execute(q)
    existing = res.scalar_one_or_none()
    
    if existing:
        return existing
    
    # Create new customer
    customer_in = schemas.CustomerCreate(
        tenant_id=tenant_id,
        name=name,
        phone=phone,
        email=email
    )
    return await create_customer(db, customer_in, changed_by)

async def get_customer_stats(db: AsyncSession, customer_id: UUID, tenant_id: str) -> dict:
    customer = await get_customer(db, customer_id)
    if not customer:
        raise ValueError('Customer not found')
    
    # Get service calls
    service_calls_result = await db.execute(
        select(models.ServiceCall)
        .where(models.ServiceCall.customer_id == customer_id)
        .where(models.ServiceCall.tenant_id == tenant_id)
    )
    service_calls = service_calls_result.scalars().all()
    
    # Calculate stats
    total_calls = len(service_calls)
    status_counts = {}
    priority_counts = {}
    
    for sc in service_calls:
        status_counts[sc.status] = status_counts.get(sc.status, 0) + 1
        priority_counts[sc.priority] = priority_counts.get(sc.priority, 0) + 1
    
    # Get first and last service call dates
    if service_calls:
        dates = [sc.created_at for sc in service_calls if sc.created_at]
        dates.sort()
        first_call_date = dates[0].isoformat() if dates else None
        last_call_date = dates[-1].isoformat() if dates else None
    else:
        first_call_date = None
        last_call_date = None
    
    return {
        'customer_id': str(customer_id),
        'total_service_calls': total_calls,
        'status_breakdown': status_counts,
        'priority_breakdown': priority_counts,
        'first_service_call_date': first_call_date,
        'last_service_call_date': last_call_date,
        'customer_since': customer.created_at.isoformat() if customer.created_at else None,
    }

async def merge_customers(db: AsyncSession, source_customer_id: UUID, target_customer_id: UUID, changed_by: str) -> models.Customer:
    source = await get_customer(db, source_customer_id)
    target = await get_customer(db, target_customer_id)
    
    if not source or not target:
        raise ValueError("One or both customers not found")
    
    if source.tenant_id != target.tenant_id:
        raise ValueError("Cannot merge customers from different tenants")
    
    try:
        # Transfer service calls
        await db.execute(
            update(models.ServiceCall)
            .where(models.ServiceCall.customer_id == source_customer_id)
            .values(customer_id=target_customer_id)
        )
        
        # Merge customer data (prefer non-null values from both)
        update_data = {}
        if not target.phone and source.phone:
            update_data['phone'] = source.phone
        if not target.email and source.email:
            update_data['email'] = source.email
        if not target.address_line1 and source.address_line1:
            update_data['address_line1'] = source.address_line1
            update_data['city'] = source.city
            update_data['state'] = source.state
            update_data['zip'] = source.zip
        if source.notes and (not target.notes or len(source.notes) > len(target.notes)):
            update_data['notes'] = source.notes
        if source.tags:
            existing_tags = set(target.tags or [])
            merged_tags = list(existing_tags.union(set(source.tags)))
            if merged_tags:
                update_data['tags'] = merged_tags
        
        if update_data:
            customer_update = schemas.CustomerUpdate(**update_data)
            await update_customer(db, target_customer_id, customer_update, changed_by=changed_by)
            target = await get_customer(db, target_customer_id)
        
        # Delete source customer
        await delete_customer(db, source_customer_id, changed_by=changed_by)
        
        await db.commit()
        await db.refresh(target)
        return target
    except Exception as e:
        await db.rollback()
        raise e

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