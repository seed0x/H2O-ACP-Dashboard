"""
Marketing scheduler endpoint for automatic slot generation
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.dialects.postgresql import insert
from typing import Optional
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import pytz

from ..db.session import get_session
from .. import models
from ..core.auth import get_current_user, CurrentUser
from .. import crud

router = APIRouter(prefix="/marketing/scheduler", tags=["marketing-scheduler"])


def compute_schedule_datetimes(
    account: models.ChannelAccount,
    start_date: datetime,
    end_date: datetime
) -> list[datetime]:
    """Compute target datetimes for an account based on its schedule configuration"""
    datetimes = []
    
    # Get schedule config with defaults
    posts_per_week = account.posts_per_week or 3
    timezone_str = account.schedule_timezone or 'America/Los_Angeles'
    schedule_times = account.schedule_times or ['09:00']
    
    try:
        tz = pytz.timezone(timezone_str)
    except:
        tz = pytz.timezone('America/Los_Angeles')  # Fallback
    
    # Convert start/end to account timezone
    if start_date.tzinfo is None:
        start_date = pytz.utc.localize(start_date)
    if end_date.tzinfo is None:
        end_date = pytz.utc.localize(end_date)
    
    start_local = start_date.astimezone(tz)
    end_local = end_date.astimezone(tz)
    
    # Calculate days in range
    days_in_range = (end_local.date() - start_local.date()).days + 1
    weeks_in_range = days_in_range / 7.0
    
    # Total target posts (posts_per_week * number of weeks)
    total_posts = int(posts_per_week * weeks_in_range)
    
    # Distribute posts evenly across the range
    if total_posts == 0:
        return []
    
    # Generate dates evenly spaced across the range
    datetimes = []
    
    # Better distribution: calculate target dates first, then assign times
    # This ensures posts are spread across different days
    target_dates = []
    
    if total_posts == 1:
        # Single post: put it in the middle
        mid_day = days_in_range // 2
        target_dates.append(start_local.date() + timedelta(days=mid_day))
    else:
        # Distribute posts evenly across the date range
        # Calculate spacing to ensure posts are on different days
        step = (days_in_range - 1) / (total_posts - 1)
        
        for i in range(total_posts):
            # Calculate day offset (use floor to avoid clustering)
            days_offset = int(i * step)
            target_date = start_local.date() + timedelta(days=days_offset)
            
            # Ensure we don't exceed bounds
            if target_date > end_local.date():
                target_date = end_local.date()
            if target_date < start_local.date():
                target_date = start_local.date()
            
            # Only add if it's a new date (avoid duplicates on same day)
            if target_date not in target_dates:
                target_dates.append(target_date)
    
    # Now assign times to each date
    for i, target_date in enumerate(target_dates):
        # Use schedule time (rotate through if multiple times)
        time_str = schedule_times[i % len(schedule_times)]
        
        try:
            # Parse time (HH:MM format)
            hour, minute = map(int, time_str.split(':'))
            target_datetime_local = tz.localize(
                datetime.combine(target_date, datetime.min.time().replace(hour=hour, minute=minute))
            )
            # Convert to UTC for storage
            target_datetime_utc = target_datetime_local.astimezone(pytz.utc).replace(tzinfo=None)
            
            # Only include if within range
            start_utc = start_date.replace(tzinfo=None) if start_date.tzinfo is None else start_date
            end_utc = end_date.replace(tzinfo=None) if end_date.tzinfo is None else end_date
            
            if start_utc <= target_datetime_utc <= end_utc:
                datetimes.append(target_datetime_utc)
        except (ValueError, AttributeError) as e:
            # Skip invalid time format
            continue
    
    return sorted(datetimes)  # Return sorted list


async def topoff_scheduler_logic(
    tenant_id: str,
    days: int = 28,
    db: Optional[AsyncSession] = None
) -> dict:
    """
    Core logic for top-off scheduler. Can be called from endpoint or background job.
    Returns summary dict.
    """
    if db is None:
        from ..db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            result = await topoff_scheduler_logic(tenant_id, days, db)
            await db.commit()
            return result
    
    # Calculate date range
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = start_date + timedelta(days=days)
    
    # Get all active channel accounts for tenant
    # Include accounts with status='active' or null status (legacy accounts)
    from sqlalchemy import or_
    accounts_result = await db.execute(
        select(models.ChannelAccount)
        .where(
            and_(
                models.ChannelAccount.tenant_id == tenant_id,
                or_(
                    models.ChannelAccount.status == 'active',
                    models.ChannelAccount.status == None  # Include legacy accounts with null status
                )
            )
        )
    )
    all_accounts = accounts_result.scalars().all()
    
    # Filter to accounts that have scheduling configuration
    # An account needs at least posts_per_week > 0 or schedule_times to generate slots
    accounts = []
    for account in all_accounts:
        # Check if account has scheduling configuration
        # Default posts_per_week is 3, so if it's None, we'll use the default in compute_schedule_datetimes
        # But we should still process accounts even if they only have defaults
        # The real check is: does compute_schedule_datetimes return any datetimes?
        accounts.append(account)
    
    if not accounts:
        return {
            "accounts_processed": 0,
            "instances_created": 0,
            "instances_skipped": 0,
            "window_start": start_date.isoformat(),
            "window_end": end_date.isoformat(),
            "message": "No active channel accounts with scheduling configuration found for tenant"
        }
    
    total_created = 0
    total_skipped = 0
    accounts_processed = 0
    
    for account in accounts:
        accounts_processed += 1
        
        # Compute target datetimes for this account
        target_datetimes = compute_schedule_datetimes(account, start_date, end_date)
        
        if not target_datetimes:
            continue
        
        # Get full existing instances to check for content
        # We need to match by datetime, but account for timezone differences
        # Compare datetimes by truncating to minute precision to avoid microsecond mismatches
        existing_instances_result = await db.execute(
            select(models.PostInstance)
            .where(
                and_(
                    models.PostInstance.tenant_id == tenant_id,
                    models.PostInstance.channel_account_id == account.id,
                    models.PostInstance.scheduled_for >= start_date,
                    models.PostInstance.scheduled_for <= end_date
                )
            )
        )
        # Create a dict keyed by datetime (rounded to minute) for matching
        existing_instances = {}
        for inst in existing_instances_result.scalars().all():
            if inst.scheduled_for:
                # Round to minute precision for matching
                rounded_dt = inst.scheduled_for.replace(second=0, microsecond=0)
                existing_instances[rounded_dt] = inst
        
        # Create missing instances using upsert pattern
        instances_to_create = []
        for target_dt in target_datetimes:
            # Round target_dt to minute precision for matching
            rounded_target_dt = target_dt.replace(second=0, microsecond=0)
            existing_instance = existing_instances.get(rounded_target_dt)
            
            if existing_instance:
                # Check if we should skip (has real content or beyond Planned/Draft)
                if existing_instance.content_item_id is not None:
                    # Has real content, skip - do not overwrite human work
                    total_skipped += 1
                    continue
                if existing_instance.status not in ['Planned', 'Draft']:
                    # Beyond planned/draft, skip - do not overwrite human work
                    total_skipped += 1
                    continue
                # Already exists as planned slot (content_item_id is None), skip
                total_skipped += 1
                continue
            
            # Create new planned instance with null content_item_id
            instance = models.PostInstance(
                tenant_id=tenant_id,
                content_item_id=None,  # Null for planned slots
                channel_account_id=account.id,
                scheduled_for=target_dt,
                status='Planned'
            )
            instances_to_create.append(instance)
        
        # Bulk insert new instances
        if instances_to_create:
            db.add_all(instances_to_create)
            total_created += len(instances_to_create)
    
    # Commit all changes (only if db was passed in, otherwise caller commits)
    # Note: When called from background job, the caller manages the transaction
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        # Only raise HTTPException if this is being called from an HTTP endpoint
        # For background jobs, we'll let the exception propagate
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create post instances: {str(e)}"
        )
    
    return {
        "accounts_processed": accounts_processed,
        "instances_created": total_created,
        "instances_skipped": total_skipped,
        "window_start": start_date.isoformat(),
        "window_end": end_date.isoformat(),
        "message": f"Created {total_created} new slots, skipped {total_skipped} existing"
    }


@router.post("/topoff")
async def topoff_scheduler(
    tenant_id: str = Query(..., description="Tenant ID"),
    days: int = Query(28, ge=1, le=90, description="Number of days to fill (rolling horizon)"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Top-off scheduler: Create missing PostInstance slots for active ChannelAccounts.
    
    This endpoint is idempotent - running it multiple times will not create duplicates.
    Only creates slots that don't already exist.
    """
    return await topoff_scheduler_logic(tenant_id, days, db)

