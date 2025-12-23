"""
Job Tasks API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from uuid import UUID
from datetime import datetime, timezone

from ..db.session import get_session
from .. import models
from .. import schemas
from ..core.auth import get_current_user, CurrentUser
from .. import crud

router = APIRouter(prefix="/jobs/{job_id}/tasks", tags=["job-tasks"])


@router.get("", response_model=List[schemas.JobTask])
async def list_job_tasks(
    job_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List all tasks for a job"""
    # Verify job exists
    result = await db.execute(select(models.Job).where(models.Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get tasks
    result = await db.execute(
        select(models.JobTask)
        .where(models.JobTask.job_id == job_id)
        .order_by(models.JobTask.created_at)
    )
    tasks = result.scalars().all()
    return tasks


@router.post("", response_model=schemas.JobTask, status_code=status.HTTP_201_CREATED)
async def create_job_task(
    job_id: UUID,
    task_in: schemas.JobTaskCreate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a new task for a job"""
    # Verify job exists
    result = await db.execute(select(models.Job).where(models.Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    task = models.JobTask(
        job_id=job_id,
        tenant_id=job.tenant_id,
        **task_in.model_dump()
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    # Audit log
    await crud.write_audit(
        db, job.tenant_id, 'job_task', task.id, 'create', current_user.username
    )
    
    return task


@router.patch("/{task_id}", response_model=schemas.JobTask)
async def update_job_task(
    job_id: UUID,
    task_id: UUID,
    task_in: schemas.JobTaskUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update a job task"""
    # Verify job exists
    result = await db.execute(select(models.Job).where(models.Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get task
    result = await db.execute(
        select(models.JobTask).where(
            and_(
                models.JobTask.id == task_id,
                models.JobTask.job_id == job_id
            )
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update task
    old_status = task.status
    for field, value in task_in.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    
    # Set completed_at if status changed to completed
    if task_in.status == 'completed' and old_status != 'completed':
        task.completed_at = datetime.now(timezone.utc)
    elif task_in.status and task_in.status != 'completed' and old_status == 'completed':
        task.completed_at = None
    
    await db.commit()
    await db.refresh(task)
    
    # Audit log
    await crud.write_audit(
        db, job.tenant_id, 'job_task', task.id, 'update', current_user.username,
        'status', old_status, task.status
    )
    
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job_task(
    job_id: UUID,
    task_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Delete a job task"""
    # Verify job exists
    result = await db.execute(select(models.Job).where(models.Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get task
    result = await db.execute(
        select(models.JobTask).where(
            and_(
                models.JobTask.id == task_id,
                models.JobTask.job_id == job_id
            )
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Audit log
    await crud.write_audit(
        db, job.tenant_id, 'job_task', task.id, 'delete', current_user.username
    )
    
    await db.delete(task)
    await db.commit()
    return None

