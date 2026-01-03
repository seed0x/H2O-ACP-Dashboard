"""
Instagram OAuth endpoints for channel account authorization
Note: Instagram requires Facebook Page connection, so this uses Facebook OAuth
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

router = APIRouter(prefix="/oauth/instagram", tags=["oauth-instagram"])

# Facebook/Instagram OAuth configuration (Instagram uses Facebook OAuth)
FACEBOOK_APP_ID = os.getenv("FACEBOOK_APP_ID", "")
FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET", "")
REDIRECT_URI = os.getenv("INSTAGRAM_REDIRECT_URI", "")  # e.g., "https://yourdomain.com/oauth/instagram/callback"

# Required permissions for Instagram Business
INSTAGRAM_SCOPES = [
    "instagram_basic",
    "instagram_content_publish",
    "pages_show_list",
    "pages_read_engagement"
]


@router.get("/authorize")
async def authorize_instagram(
    channel_account_id: UUID = Query(..., description="Channel account ID to connect"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Initiate Instagram OAuth flow for a channel account.
    Returns the authorization URL to redirect the user to.
    
    Note: Instagram requires the account to be a Business account connected to a Facebook Page.
    """
    if not FACEBOOK_APP_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Instagram OAuth not configured. Set FACEBOOK_APP_ID environment variable."
        )
    
        # Verify channel account exists and user has access
        result = await db.execute(
            select(models.ChannelAccount).where(models.ChannelAccount.id == channel_account_id)
        )
        account = result.scalar_one_or_none()
        if not account:
            raise HTTPException(status_code=404, detail="Channel account not found")
        
        validate_tenant_feature(account.tenant_id, TenantFeature.MARKETING)
        
        # Verify it's an Instagram channel
        channel_result = await db.execute(
            select(models.MarketingChannel).where(models.MarketingChannel.id == account.channel_id)
        )
        channel = channel_result.scalar_one_or_none()
        if not channel or 'instagram' not in channel.key.lower():
            raise HTTPException(status_code=400, detail="This endpoint is only for Instagram channel accounts")
        
        # Generate state (use channel_account_id as state for security)
        state = str(channel_account_id)
        
        # Build Facebook OAuth URL (Instagram uses Facebook OAuth)
        params = {
            "client_id": FACEBOOK_APP_ID,
            "redirect_uri": REDIRECT_URI or f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/oauth/instagram/callback",
            "scope": ",".join(INSTAGRAM_SCOPES),
            "response_type": "code",
            "state": state
        }
        
        auth_url = f"https://www.facebook.com/v18.0/dialog/oauth?{urlencode(params)}"
        
        return {
            "authorization_url": auth_url,
            "state": state
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Instagram OAuth authorize error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"OAuth authorization failed: {str(e)}")


@router.get("/callback")
async def instagram_oauth_callback(
    code: str = Query(..., description="Authorization code from Facebook"),
    state: str = Query(..., description="State parameter (channel account ID)"),
    db: AsyncSession = Depends(get_session)
):
    """
    Handle OAuth callback from Instagram/Facebook.
    Exchange code for tokens, find connected Instagram Business account, and store tokens.
    """
    if not FACEBOOK_APP_ID or not FACEBOOK_APP_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Instagram OAuth not configured"
        )
    
    try:
        channel_account_id = UUID(state)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    try:
        import aiohttp
        import json
        
        # Exchange code for access token
        token_url = "https://graph.facebook.com/v18.0/oauth/access_token"
        redirect_uri = REDIRECT_URI or f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/oauth/instagram/callback"
        
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
                        error_text = await pages_response.text()
                        raise HTTPException(status_code=400, detail=f"Failed to get pages: {error_text}")
                    
                    pages_data = await pages_response.json()
                    pages = pages_data.get("data", [])
                    
                    if not pages:
                        raise HTTPException(
                            status_code=400,
                            detail="No Facebook Pages found. Instagram Business requires a Facebook Page connection."
                        )
                    
                    # Find Instagram Business account connected to pages
                    instagram_account = None
                    page_access_token = None
                    page_id = None
                    page_name = None
                    ig_user_id = None
                    ig_username = None
                    
                    for page in pages:
                        page_id = page.get("id")
                        page_access_token = page.get("access_token")
                        
                        # Get Instagram Business account connected to this page
                        ig_url = f"https://graph.facebook.com/v18.0/{page_id}"
                        ig_params = {
                            "fields": "instagram_business_account",
                            "access_token": page_access_token
                        }
                        
                        async with session.get(ig_url, params=ig_params) as ig_response:
                            if ig_response.status == 200:
                                page_data = await ig_response.json()
                                ig_business_account = page_data.get("instagram_business_account")
                                
                                if ig_business_account:
                                    ig_user_id = ig_business_account.get("id")
                                    
                                    # Get Instagram account details
                                    ig_account_url = f"https://graph.facebook.com/v18.0/{ig_user_id}"
                                    ig_account_params = {
                                        "fields": "username,name",
                                        "access_token": page_access_token
                                    }
                                    
                                    async with session.get(ig_account_url, params=ig_account_params) as ig_account_response:
                                        if ig_account_response.status == 200:
                                            ig_account_data = await ig_account_response.json()
                                            ig_username = ig_account_data.get("username")
                                            page_name = ig_account_data.get("name") or ig_username
                                            instagram_account = ig_account_data
                                            break
                    
                    if not instagram_account or not ig_user_id:
                        raise HTTPException(
                            status_code=400,
                            detail="No Instagram Business account found. Please connect your Instagram account to a Facebook Page first."
                        )
                    
                    # Get the channel account
                    result = await db.execute(
                        select(models.ChannelAccount).where(models.ChannelAccount.id == channel_account_id)
                    )
                    account = result.scalar_one_or_none()
                    if not account:
                        raise HTTPException(status_code=404, detail="Channel account not found")
                    
                    # Store token and Instagram account info
                    token_storage = {
                        "access_token": page_access_token,  # Use page token
                        "user_token": access_token,
                        "page_id": page_id,
                        "ig_user_id": ig_user_id,
                        "ig_username": ig_username,
                        "expires_at": token_data.get("expires_in")
                    }
                    
                    account.oauth_connected = True
                    account.oauth_provider = 'instagram'
                    account.oauth_token_ref = json.dumps(token_storage)  # Store as JSON string
                    account.external_id = ig_user_id
                    account.name = account.name or ig_username or page_name
                    
                    await db.commit()
                    await db.refresh(account)
                    
                    return {
                        "success": True,
                        "message": f"Successfully connected to Instagram Business account: @{ig_username}",
                        "account_id": str(account.id)
                    }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Instagram OAuth callback error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"OAuth callback failed: {str(e)}")


@router.post("/disconnect/{channel_account_id}")
async def disconnect_instagram(
    channel_account_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Disconnect Instagram OAuth from a channel account"""
    result = await db.execute(
        select(models.ChannelAccount).where(models.ChannelAccount.id == channel_account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    validate_tenant_feature(account.tenant_id, TenantFeature.MARKETING)
    
    if account.oauth_provider != 'instagram':
        raise HTTPException(status_code=400, detail="Account is not connected via Instagram OAuth")
    
    account.oauth_connected = False
    account.oauth_provider = None
    account.oauth_token_ref = None
    # Keep external_id and name in case user wants to reconnect
    
    await db.commit()
    
    return {"success": True, "message": "Instagram account disconnected"}

