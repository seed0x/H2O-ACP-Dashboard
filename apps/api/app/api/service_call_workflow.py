"""
Service Call Workflow API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from ..db.session import get_session
from .. import models
from .. import schemas
from ..core.auth import get_current_user, CurrentUser
from .. import crud

router = APIRouter(prefix="/service-calls/{service_call_id}/workflow", tags=["service-call-workflow"])


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
    for field, value in workflow_in.model_dump(exclude_unset=True).items():
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

