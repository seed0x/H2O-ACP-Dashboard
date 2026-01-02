"""
Portals Directory API
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID

from ..db.session import get_session
from ..core.auth import get_current_user
from .. import crud, models, schemas

router = APIRouter(prefix="/directory", tags=["portals"])

# Portal Definitions

@router.post("/portal-definitions", response_model=schemas.PortalDefinitionOut)
async def create_portal_definition(
    definition_in: schemas.PortalDefinitionCreate,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Create a new portal definition"""
    definition = await crud.create_portal_definition(db, definition_in, current_user.username)
    return definition

@router.get("/portal-definitions", response_model=List[schemas.PortalDefinitionOut])
async def list_portal_definitions(
    is_active: Optional[bool] = Query(None),
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """List portal definitions"""
    definitions = await crud.list_portal_definitions(db, is_active=is_active, category=category)
    return definitions

@router.get("/portal-definitions/{definition_id}", response_model=schemas.PortalDefinitionOut)
async def get_portal_definition(
    definition_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get portal definition by ID"""
    definition = await crud.get_portal_definition(db, definition_id)
    if not definition:
        raise HTTPException(status_code=404, detail="Portal definition not found")
    return definition

@router.patch("/portal-definitions/{definition_id}", response_model=schemas.PortalDefinitionOut)
async def update_portal_definition(
    definition_id: UUID,
    definition_in: schemas.PortalDefinitionUpdate,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Update portal definition"""
    definition = await crud.get_portal_definition(db, definition_id)
    if not definition:
        raise HTTPException(status_code=404, detail="Portal definition not found")
    definition = await crud.update_portal_definition(db, definition, definition_in, current_user.username)
    return definition

@router.delete("/portal-definitions/{definition_id}")
async def delete_portal_definition(
    definition_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Delete portal definition"""
    definition = await crud.get_portal_definition(db, definition_id)
    if not definition:
        raise HTTPException(status_code=404, detail="Portal definition not found")
    await crud.delete_portal_definition(db, definition, current_user.username)
    return {"deleted": True}

# Portal Accounts

@router.post("/portal-accounts", response_model=schemas.PortalAccountOut)
async def create_portal_account(
    account_in: schemas.PortalAccountCreate,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Create a new portal account"""
    account = await crud.create_portal_account(db, account_in, current_user.username)
    return account

@router.get("/portal-accounts", response_model=List[schemas.PortalAccountOut])
async def list_portal_accounts(
    tenant_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """List portal accounts"""
    accounts = await crud.list_portal_accounts(db, tenant_id=tenant_id, is_active=is_active, search=search)
    return accounts

@router.get("/portal-accounts/{account_id}", response_model=schemas.PortalAccountOut)
async def get_portal_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get portal account by ID"""
    account = await crud.get_portal_account(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Portal account not found")
    return account

@router.patch("/portal-accounts/{account_id}", response_model=schemas.PortalAccountOut)
async def update_portal_account(
    account_id: UUID,
    account_in: schemas.PortalAccountUpdate,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Update portal account"""
    account = await crud.get_portal_account(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Portal account not found")
    account = await crud.update_portal_account(db, account, account_in, current_user.username)
    return account

@router.delete("/portal-accounts/{account_id}")
async def delete_portal_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Delete portal account"""
    account = await crud.get_portal_account(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Portal account not found")
    await crud.delete_portal_account(db, account, current_user.username)
    return {"deleted": True}

@router.post("/portal-accounts/{account_id}/verify")
async def verify_portal_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Mark portal account as verified (updates last_verified_at)"""
    from datetime import datetime, timezone
    account = await crud.get_portal_account(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Portal account not found")
    account_in = schemas.PortalAccountUpdate(last_verified_at=datetime.now(timezone.utc))
    account = await crud.update_portal_account(db, account, account_in, current_user.username)
    return account

# Builder Portal Account Links

@router.post("/builder-portal-accounts", response_model=schemas.BuilderPortalAccountOut)
async def link_builder_portal_account(
    link_in: schemas.BuilderPortalAccountCreate,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Link a builder to a portal account"""
    link = await crud.link_builder_portal_account(db, link_in.builder_id, link_in.portal_account_id, current_user.username)
    return link

@router.delete("/builder-portal-accounts")
async def unlink_builder_portal_account(
    builder_id: UUID = Query(...),
    portal_account_id: UUID = Query(...),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Unlink a builder from a portal account"""
    await crud.unlink_builder_portal_account(db, builder_id, portal_account_id, current_user.username)
    return {"unlinked": True}

@router.get("/builders/{builder_id}/portal-accounts", response_model=List[schemas.PortalAccountOut])
async def get_builder_portal_accounts(
    builder_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get all portal accounts linked to a builder"""
    accounts = await crud.get_builder_portal_accounts(db, builder_id)
    return accounts

# Portal Rules

@router.post("/portal-rules", response_model=schemas.PortalRuleOut)
async def create_portal_rule(
    rule_in: schemas.PortalRuleCreate,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Create a new portal rule"""
    rule = await crud.create_portal_rule(db, rule_in, current_user.username)
    return rule

@router.get("/portal-rules", response_model=List[schemas.PortalRuleOut])
async def list_portal_rules(
    applies_to: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """List portal rules"""
    rules = await crud.list_portal_rules(db, applies_to=applies_to, tenant_id=tenant_id, is_active=is_active)
    return rules

@router.get("/portal-rules/{rule_id}", response_model=schemas.PortalRuleOut)
async def get_portal_rule(
    rule_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get portal rule by ID"""
    rule = await crud.get_portal_rule(db, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Portal rule not found")
    return rule

@router.patch("/portal-rules/{rule_id}", response_model=schemas.PortalRuleOut)
async def update_portal_rule(
    rule_id: UUID,
    rule_in: schemas.PortalRuleUpdate,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Update portal rule"""
    rule = await crud.get_portal_rule(db, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Portal rule not found")
    rule = await crud.update_portal_rule(db, rule, rule_in, current_user.username)
    return rule

@router.delete("/portal-rules/{rule_id}")
async def delete_portal_rule(
    rule_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Delete portal rule"""
    rule = await crud.get_portal_rule(db, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Portal rule not found")
    await crud.delete_portal_rule(db, rule, current_user.username)
    return {"deleted": True}

# Suggestion Endpoint

@router.get("/suggested-portals", response_model=List[schemas.PortalAccountOut])
async def get_suggested_portals(
    applies_to: str = Query(..., description="'job' or 'service_call'"),
    tenant_id: str = Query(..., description="'h2o' or 'all_county'"),
    city: Optional[str] = Query(None),
    county: Optional[str] = Query(None),
    builder_id: Optional[UUID] = Query(None),
    permit_required: Optional[bool] = Query(None),
    phase: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """
    Get suggested portal accounts based on rules.
    Returns ordered list with builder-linked portals first, then rule-matched portals.
    """
    accounts = await crud.suggest_portals(
        db,
        applies_to=applies_to,
        tenant_id=tenant_id,
        city=city,
        county=county,
        builder_id=builder_id,
        permit_required=permit_required,
        phase=phase
    )
    return accounts






