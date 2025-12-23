from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from uuid import UUID

from .. import crud, models
from ..schemas import CustomerCreate, CustomerUpdate, CustomerOut, CustomerWithServiceCalls, ServiceCallOut
from ..core.auth import get_current_user, CurrentUser
from ..db.session import get_session

router = APIRouter(prefix="/customers", tags=["customers"])

@router.get("", response_model=List[dict])
async def list_customers(
    tenant_id: str = Query(..., description="Tenant ID"),
    search: Optional[str] = Query(None, description="Search by name, phone, email, or address"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List all customers for a tenant with optional search"""
    customers = await crud.list_customers(db, tenant_id=tenant_id, search=search, limit=limit, offset=offset)
    return customers

@router.get("/{customer_id}", response_model=dict)
async def get_customer(
    customer_id: UUID,
    include_service_calls: bool = Query(False, description="Include full service call details"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get customer details with optional service calls"""
    customer = await crud.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Verify tenant access
    if current_user.tenant_id and customer.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Build response
    customer_dict = {
        'id': customer.id,
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
        'created_at': customer.created_at,
        'updated_at': customer.updated_at,
    }
    
    if include_service_calls:
        customer_dict['service_calls'] = [
            {
                'id': str(sc.id),
                'tenant_id': sc.tenant_id,
                'customer_name': sc.customer_name,
                'phone': sc.phone,
                'email': sc.email,
                'address_line1': sc.address_line1,
                'city': sc.city,
                'state': sc.state,
                'zip': sc.zip,
                'issue_description': sc.issue_description,
                'priority': sc.priority,
                'status': sc.status,
                'scheduled_start': sc.scheduled_start.isoformat() if sc.scheduled_start else None,
                'scheduled_end': sc.scheduled_end.isoformat() if sc.scheduled_end else None,
                'assigned_to': sc.assigned_to,
                'notes': sc.notes,
                'created_at': sc.created_at.isoformat() if sc.created_at else None,
                'updated_at': sc.updated_at.isoformat() if sc.updated_at else None,
            }
            for sc in customer.service_calls
        ]
    
    return customer_dict

@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_in: CustomerCreate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a new customer"""
    # Verify tenant access
    if current_user.tenant_id and customer_in.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        customer = await crud.create_customer(db, customer_in, changed_by=current_user.username)
        return customer
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{customer_id}", response_model=CustomerOut)
async def update_customer(
    customer_id: UUID,
    customer_in: CustomerUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update customer details"""
    customer = await crud.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Verify tenant access
    if current_user.tenant_id and customer.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        updated_customer = await crud.update_customer(db, customer_id, customer_in, changed_by=current_user.username)
        return updated_customer
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Delete a customer (sets customer_id to NULL on related service calls)"""
    customer = await crud.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Verify tenant access
    if current_user.tenant_id and customer.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    deleted = await crud.delete_customer(db, customer_id, changed_by=current_user.username)
    if not deleted:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return None

@router.get("/{customer_id}/service-calls", response_model=List[dict])
async def get_customer_service_calls(
    customer_id: UUID,
    tenant_id: str = Query(..., description="Tenant ID"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get all service calls for a customer"""
    customer = await crud.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Verify tenant access
    if current_user.tenant_id and customer.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get service calls
    service_calls = await crud.list_service_calls(
        db, 
        tenant_id=tenant_id,
        customer_id=customer_id,
        limit=1000
    )
    
    return service_calls

@router.post("/merge", response_model=CustomerOut)
async def merge_customers(
    source_customer_id: UUID = Query(..., description="ID of customer to merge FROM (will be deleted)"),
    target_customer_id: UUID = Query(..., description="ID of customer to merge TO (will be kept)"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Merge two customers - transfers all service calls from source to target, then deletes source"""
    source = await crud.get_customer(db, source_customer_id)
    target = await crud.get_customer(db, target_customer_id)
    
    if not source or not target:
        raise HTTPException(status_code=404, detail="One or both customers not found")
    
    # Verify tenant access
    if current_user.tenant_id:
        if source.tenant_id != current_user.tenant_id or target.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify same tenant
    if source.tenant_id != target.tenant_id:
        raise HTTPException(status_code=400, detail="Cannot merge customers from different tenants")
    
    try:
        # Transfer service calls
        from sqlalchemy import update
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
            customer_update = CustomerUpdate(**update_data)
            await crud.update_customer(db, target_customer_id, customer_update, changed_by=current_user.username)
            target = await crud.get_customer(db, target_customer_id)
        
        # Delete source customer
        await crud.delete_customer(db, source_customer_id, changed_by=current_user.username)
        
        return target
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to merge customers: {str(e)}")

@router.get("/{customer_id}/stats", response_model=dict)
async def get_customer_stats(
    customer_id: UUID,
    tenant_id: str = Query(..., description="Tenant ID"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get statistics for a customer (total service calls, status breakdown, etc.)"""
    customer = await crud.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Verify tenant access
    if current_user.tenant_id and customer.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    from sqlalchemy import func, select
    
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
        # Status breakdown
        status_counts[sc.status] = status_counts.get(sc.status, 0) + 1
        # Priority breakdown
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

