"""
Facebook OAuth endpoints for channel account authorization
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID
import os
import secrets
import logging
from urllib.parse import urlencode

from ..db.session import get_session
from ..core.auth import get_current_user, CurrentUser
from .. import models
from ..core.tenant_config import validate_tenant_feature, TenantFeature

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/oauth/facebook", tags=["oauth-facebook"])

# Facebook OAuth configuration
FACEBOOK_APP_ID = os.getenv("FACEBOOK_APP_ID", "")
FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET", "")
REDIRECT_URI = os.getenv("FACEBOOK_REDIRECT_URI", "")  # e.g., "https://yourdomain.com/oauth/facebook/callback"

# Required permissions for Facebook Pages
FACEBOOK_SCOPES = [
    "pages_manage_posts",
    "pages_read_engagement",
    "pages_show_list"
]


@router.get("/authorize")
async def authorize_facebook(
    channel_account_id: UUID = Query(..., description="Channel account ID to connect"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Initiate Facebook OAuth flow for a channel account.
    Returns the authorization URL to redirect the user to.
    """
    if not FACEBOOK_APP_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Facebook OAuth not configured. Set FACEBOOK_APP_ID environment variable."
        )
    
    async with get_session() as db:
        # Verify channel account exists and user has access
        result = await db.execute(
            select(models.ChannelAccount).where(models.ChannelAccount.id == channel_account_id)
        )
        account = result.scalar_one_or_none()
        if not account:
            raise HTTPException(status_code=404, detail="Channel account not found")
        
        validate_tenant_feature(account.tenant_id, TenantFeature.MARKETING)
        
        # Verify it's a Facebook channel
        channel_result = await db.execute(
            select(models.MarketingChannel).where(models.MarketingChannel.id == account.channel_id)
        )
        channel = channel_result.scalar_one_or_none()
        if not channel or 'facebook' not in channel.key.lower():
            raise HTTPException(status_code=400, detail="This endpoint is only for Facebook channel accounts")
        
        # Generate state (use channel_account_id as state for security)
        state = str(channel_account_id)
        
        # Build Facebook OAuth URL
        params = {
            "client_id": FACEBOOK_APP_ID,
            "redirect_uri": REDIRECT_URI or f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/oauth/facebook/callback",
            "scope": ",".join(FACEBOOK_SCOPES),
            "response_type": "code",
            "state": state
        }
        
        auth_url = f"https://www.facebook.com/v18.0/dialog/oauth?{urlencode(params)}"
        
        return {
            "authorization_url": auth_url,
            "state": state
        }


@router.get("/callback")
async def facebook_oauth_callback(
    code: str = Query(..., description="Authorization code from Facebook"),
    state: str = Query(..., description="State parameter (channel account ID)"),
    db: AsyncSession = Depends(get_session)
):
    """
    Handle OAuth callback from Facebook.
    Exchange code for tokens and store them.
    """
    if not FACEBOOK_APP_ID or not FACEBOOK_APP_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Facebook OAuth not configured"
        )
    
    try:
        channel_account_id = UUID(state)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    try:
        import aiohttp
        
        # Exchange code for access token
        token_url = "https://graph.facebook.com/v18.0/oauth/access_token"
        redirect_uri = REDIRECT_URI or f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/oauth/facebook/callback"
        
        async with aiohttp.ClientSession() as session:
            token_params = {
                "client_id": FACEBOOK_APP_ID,
                "client_secret": FACEBOOK_APP_SECRET,
                "redirect_uri": redirect_uri,
                "code": code
            }
            
            async with session.get(token_url, params=token_params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise HTTPException(status_code=400, detail=f"Failed to exchange code for token: {error_text}")
                
                token_data = await response.json()
                access_token = token_data.get("access_token")
                if not access_token:
                    raise HTTPException(status_code=400, detail="No access token in response")
                
                # Get long-lived token (60 days)
                long_lived_url = "https://graph.facebook.com/v18.0/oauth/access_token"
                long_lived_params = {
                    "grant_type": "fb_exchange_token",
                    "client_id": FACEBOOK_APP_ID,
                    "client_secret": FACEBOOK_APP_SECRET,
                    "fb_exchange_token": access_token
                }
                
                async with session.get(long_lived_url, params=long_lived_params) as long_response:
                    if long_response.status == 200:
                        long_token_data = await long_response.json()
                        access_token = long_token_data.get("access_token", access_token)
                
                # Get user's pages
                pages_url = "https://graph.facebook.com/v18.0/me/accounts"
                pages_params = {"access_token": access_token}
                
                async with session.get(pages_url, params=pages_params) as pages_response:
                    if pages_response.status != 200:
                        # If user doesn't have pages, try to get user info
                        user_url = "https://graph.facebook.com/v18.0/me"
                        user_params = {"access_token": access_token, "fields": "id,name"}
                        async with session.get(user_url, params=user_params) as user_response:
                            if user_response.status == 200:
                                user_data = await user_response.json()
                                raise HTTPException(
                                    status_code=400,
                                    detail=f"User {user_data.get('name')} doesn't have any Facebook Pages. Please create a Page first."
                                )
                        
                        error_text = await pages_response.text()
                        raise HTTPException(status_code=400, detail=f"Failed to get pages: {error_text}")
                    
                    pages_data = await pages_response.json()
                    pages = pages_data.get("data", [])
                    
                    if not pages:
                        raise HTTPException(
                            status_code=400,
                            detail="No Facebook Pages found. Please create a Page first."
                        )
                    
                    # Use the first page (or could allow user to select)
                    page = pages[0]
                    page_id = page.get("id")
                    page_access_token = page.get("access_token")  # Page-specific token
                    page_name = page.get("name")
                    
                    # Get the channel account
                    result = await db.execute(
                        select(models.ChannelAccount).where(models.ChannelAccount.id == channel_account_id)
                    )
                    account = result.scalar_one_or_none()
                    if not account:
                        raise HTTPException(status_code=404, detail="Channel account not found")
                    
                    # Store token and page info
                    import json
                    token_storage = {
                        "access_token": page_access_token,  # Use page token, not user token
                        "user_token": access_token,
                        "page_id": page_id,
                        "page_name": page_name,
                        "expires_at": token_data.get("expires_in")  # Token expiration time
                    }
                    
                    account.oauth_connected = True
                    account.oauth_provider = 'facebook'
                    account.oauth_token_ref = json.dumps(token_storage)  # Store as JSON string (encrypt in production)
                    account.external_id = page_id
                    account.name = account.name or page_name
                    
                    await db.commit()
                    await db.refresh(account)
                    
                    return {
                        "success": True,
                        "message": f"Successfully connected to Facebook Page: {page_name}",
                        "account_id": str(account.id)
                    }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Facebook OAuth callback error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"OAuth callback failed: {str(e)}")


@router.post("/disconnect/{channel_account_id}")
async def disconnect_facebook(
    channel_account_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Disconnect Facebook OAuth from a channel account"""
    result = await db.execute(
        select(models.ChannelAccount).where(models.ChannelAccount.id == channel_account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    validate_tenant_feature(account.tenant_id, TenantFeature.MARKETING)
    
    if account.oauth_provider != 'facebook':
        raise HTTPException(status_code=400, detail="Account is not connected via Facebook OAuth")
    
    account.oauth_connected = False
    account.oauth_provider = None
    account.oauth_token_ref = None
    # Keep external_id and name in case user wants to reconnect
    
    await db.commit()
    
    return {"success": True, "message": "Facebook account disconnected"}

