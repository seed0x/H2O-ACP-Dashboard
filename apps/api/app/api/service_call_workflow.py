"""
Service Call Workflow API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone, date, timedelta

from ..db.session import get_session
from .. import models
from .. import schemas
from ..core.auth import get_current_user, CurrentUser
from .. import crud

router = APIRouter(prefix="/service-calls/{service_call_id}/workflow", tags=["service-call-workflow"])


async def auto_create_tasks_from_workflow(
    db: AsyncSession,
    service_call: models.ServiceCall,
    workflow: models.ServiceCallWorkflow,
    update_dict: dict,
    created_by: str
):
    """Auto-create tasks when workflow steps indicate needs"""
    from sqlalchemy import select
    
    # Check if permit is needed (Step 2)
    if 'needs_permit' in update_dict and update_dict['needs_permit'] is True:
        # Check if task already exists
        existing = await db.execute(
            select(models.ServiceCallTask).where(
                models.ServiceCallTask.service_call_id == service_call.id,
                models.ServiceCallTask.task_type == 'pull_permit',
                models.ServiceCallTask.status == 'pending'
            )
        )
        if not existing.scalar_one_or_none():
            task = models.ServiceCallTask(
                service_call_id=service_call.id,
                tenant_id=service_call.tenant_id,
                task_type='pull_permit',
                title='Pull Permit',
                description=update_dict.get('permit_notes') or f'Permit needed for {service_call.customer_name}',
                status='pending',
                due_date=date.today() + timedelta(days=1),  # Due tomorrow
                created_by=created_by
            )
            db.add(task)
    
    # Check if parts order is needed (Step 4)
    if 'needs_parts_order' in update_dict and update_dict['needs_parts_order'] is True:
        existing = await db.execute(
            select(models.ServiceCallTask).where(
                models.ServiceCallTask.service_call_id == service_call.id,
                models.ServiceCallTask.task_type == 'order_parts',
                models.ServiceCallTask.status == 'pending'
            )
        )
        if not existing.scalar_one_or_none():
            task = models.ServiceCallTask(
                service_call_id=service_call.id,
                tenant_id=service_call.tenant_id,
                task_type='order_parts',
                title='Order Parts',
                description=update_dict.get('parts_order_notes') or f'Parts needed for {service_call.customer_name}',
                status='pending',
                due_date=date.today() + timedelta(days=1),
                created_by=created_by
            )
            db.add(task)
    
    # Check if bid is needed (Step 5)
    if 'needs_bid' in update_dict and update_dict['needs_bid'] is True:
        existing = await db.execute(
            select(models.ServiceCallTask).where(
                models.ServiceCallTask.service_call_id == service_call.id,
                models.ServiceCallTask.task_type == 'send_bid',
                models.ServiceCallTask.status == 'pending'
            )
        )
        if not existing.scalar_one_or_none():
            task = models.ServiceCallTask(
                service_call_id=service_call.id,
                tenant_id=service_call.tenant_id,
                task_type='send_bid',
                title='Send Bid',
                description=f'Bid needed for {service_call.customer_name}',
                status='pending',
                due_date=date.today() + timedelta(days=3),  # Bids can take a few days
                created_by=created_by
            )
            db.add(task)
    
    # Check if reschedule is needed (Step 3)
    if 'needs_reschedule' in update_dict and update_dict['needs_reschedule'] is True:
        existing = await db.execute(
            select(models.ServiceCallTask).where(
                models.ServiceCallTask.service_call_id == service_call.id,
                models.ServiceCallTask.task_type == 'call_back_schedule',
                models.ServiceCallTask.status == 'pending'
            )
        )
        if not existing.scalar_one_or_none():
            reschedule_date = update_dict.get('reschedule_date')
            task = models.ServiceCallTask(
                service_call_id=service_call.id,
                tenant_id=service_call.tenant_id,
                task_type='call_back_schedule',
                title='Call Back to Schedule',
                description=update_dict.get('reschedule_notes') or f'Customer needs to reschedule - {service_call.customer_name}',
                status='pending',
                due_date=reschedule_date if reschedule_date else date.today() + timedelta(days=1),
                created_by=created_by
            )
            db.add(task)
    
    await db.flush()  # Flush but don't commit yet - let the main update commit


@router.get("", response_model=schemas.ServiceCallWorkflow)
async def get_workflow(
    service_call_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get workflow for a service call, create if doesn't exist"""
    # Verify service call exists and user has access
    result = await db.execute(select(models.ServiceCall).where(models.ServiceCall.id == service_call_id))
    service_call = result.scalar_one_or_none()
    if not service_call:
        raise HTTPException(status_code=404, detail="Service call not found")
    
    # Verify tenant access
    if current_user.tenant_id and service_call.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied to this service call")
    
    # Get or create workflow
    result = await db.execute(
        select(models.ServiceCallWorkflow)
        .where(models.ServiceCallWorkflow.service_call_id == service_call_id)
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        # Create workflow if it doesn't exist
        workflow = models.ServiceCallWorkflow(
            service_call_id=service_call_id,
            tenant_id=service_call.tenant_id,
            current_step=0,
            completed=False
        )
        db.add(workflow)
        await db.commit()
        await db.refresh(workflow)
    
    return workflow


@router.patch("", response_model=schemas.ServiceCallWorkflow)
async def update_workflow(
    service_call_id: UUID,
    workflow_in: schemas.ServiceCallWorkflowUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update workflow for a service call"""
    # Verify service call exists and user has access
    result = await db.execute(select(models.ServiceCall).where(models.ServiceCall.id == service_call_id))
    service_call = result.scalar_one_or_none()
    if not service_call:
        raise HTTPException(status_code=404, detail="Service call not found")
    
    # Verify tenant access
    if current_user.tenant_id and service_call.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied to this service call")
    
    # Get or create workflow
    result = await db.execute(
        select(models.ServiceCallWorkflow)
        .where(models.ServiceCallWorkflow.service_call_id == service_call_id)
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        workflow = models.ServiceCallWorkflow(
            service_call_id=service_call_id,
            tenant_id=service_call.tenant_id,
            current_step=0,
            completed=False
        )
        db.add(workflow)
    
    # Validate current_step if provided
    if workflow_in.current_step is not None:
        if workflow_in.current_step < 0 or workflow_in.current_step > 6:
            raise HTTPException(status_code=400, detail="current_step must be between 0 and 6")
    
    # Update workflow fields
    old_completed = workflow.completed
    update_dict = workflow_in.model_dump(exclude_unset=True)
    
    # Auto-create tasks based on workflow steps
    await auto_create_tasks_from_workflow(db, service_call, workflow, update_dict, current_user.username)
    
    for field, value in update_dict.items():
        setattr(workflow, field, value)
    
    # Set completed_at if workflow is being marked as completed
    if workflow_in.completed is not None:
        if workflow_in.completed and not old_completed:
            workflow.completed_at = datetime.now(timezone.utc)
        elif not workflow_in.completed and old_completed:
            workflow.completed_at = None
    
    await db.commit()
    await db.refresh(workflow)
    
    # Audit log
    await crud.write_audit(
        db, service_call.tenant_id, 'service_call_workflow', workflow.id, 'update', current_user.username
    )
    
    return workflow


@router.post("/complete-step", response_model=schemas.ServiceCallWorkflow)
async def complete_step(
    service_call_id: UUID,
    step: int,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Mark a workflow step as complete and advance to next step"""
    # Verify service call exists and user has access
    result = await db.execute(select(models.ServiceCall).where(models.ServiceCall.id == service_call_id))
    service_call = result.scalar_one_or_none()
    if not service_call:
        raise HTTPException(status_code=404, detail="Service call not found")
    
    # Verify tenant access
    if current_user.tenant_id and service_call.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied to this service call")
    
    # Validate step parameter
    if step < 0 or step > 6:
        raise HTTPException(status_code=400, detail="Step must be between 0 and 6")
    
    # Get or create workflow
    result = await db.execute(
        select(models.ServiceCallWorkflow)
        .where(models.ServiceCallWorkflow.service_call_id == service_call_id)
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        workflow = models.ServiceCallWorkflow(
            service_call_id=service_call_id,
            tenant_id=service_call.tenant_id,
            current_step=0,
            completed=False
        )
        db.add(workflow)
    
    # Validate step progression (can't go backwards unless resetting)
    if step < workflow.current_step:
        raise HTTPException(status_code=400, detail=f"Cannot go backwards from step {workflow.current_step} to step {step}")
    
    # Advance to next step (step + 1, max 6)
    workflow.current_step = min(step + 1, 6)
    
    # If we've completed all steps (step 6 completed means we're at step 7, which is completion)
    if workflow.current_step >= 6:
        workflow.completed = True
        workflow.completed_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(workflow)
    
    # Audit log
    await crud.write_audit(
        db, service_call.tenant_id, 'service_call_workflow', workflow.id, 'update', current_user.username,
        'current_step', str(step), str(workflow.current_step)
    )
    
    return workflow


@router.post("/upload-paperwork", response_model=dict)
async def upload_paperwork_photos(
    service_call_id: UUID,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Upload paperwork photos for a service call workflow"""
    # Verify service call exists and user has access
    result = await db.execute(select(models.ServiceCall).where(models.ServiceCall.id == service_call_id))
    service_call = result.scalar_one_or_none()
    if not service_call:
        raise HTTPException(status_code=404, detail="Service call not found")
    
    # Verify tenant access
    if current_user.tenant_id and service_call.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied to this service call")
    
    try:
        from ..core.storage import upload_file, validate_file
        
        uploaded_urls = []
        
        for file in files:
            # Read file content
            file_content = await file.read()
            
            # Validate file
            is_valid, error_msg = validate_file(file_content, file.content_type)
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"Invalid file {file.filename}: {error_msg}")
            
            # Upload to storage
            file_url = upload_file(
                file_content=file_content,
                file_name=file.filename or "paperwork.jpg",
                tenant_id=service_call.tenant_id,
                folder="paperwork",
                mime_type=file.content_type
            )
            
            uploaded_urls.append(file_url)
        
        return {"urls": uploaded_urls, "photo_urls": uploaded_urls}  # Support both field names
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload paperwork photos: {str(e)}"
        )

