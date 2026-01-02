"""
Google OAuth 2.0 endpoints for Google Business Profile integration
"""
import os
import json
import logging
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db.session import get_session
from .. import models
from ..core.auth import get_current_user, CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/oauth/google", tags=["oauth-google"])

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/oauth/google/callback")

# Required scopes for Google Business Profile
SCOPES = [
    "https://www.googleapis.com/auth/business.manage",
]


@router.get("/authorize")
async def authorize_google(
    channel_account_id: UUID = Query(..., description="Channel account ID to connect"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Initiate Google OAuth flow for a channel account.
    Returns the authorization URL to redirect the user to.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID environment variable."
        )
    
    from google_auth_oauthlib.flow import Flow
    
    # Create OAuth flow
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uris": [GOOGLE_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES
    )
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    
    # Generate authorization URL with state containing account ID
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',
        state=str(channel_account_id)
    )
    
    return {
        "authorization_url": authorization_url,
        "state": state
    }


@router.get("/callback")
async def google_oauth_callback(
    code: str = Query(..., description="Authorization code from Google"),
    state: str = Query(..., description="State parameter (channel account ID)"),
    db: AsyncSession = Depends(get_session)
):
    """
    Handle OAuth callback from Google.
    Exchange code for tokens and store them.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured"
        )
    
    try:
        channel_account_id = UUID(state)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    # Get channel account
    result = await db.execute(
        select(models.ChannelAccount).where(models.ChannelAccount.id == channel_account_id)
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    from google_auth_oauthlib.flow import Flow
    
    # Exchange code for tokens
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uris": [GOOGLE_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES
    )
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    
    try:
        flow.fetch_token(code=code)
    except Exception as e:
        logger.error(f"Failed to fetch token: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to exchange code: {str(e)}")
    
    credentials = flow.credentials
    
    # Store tokens securely (you may want to encrypt these)
    token_data = {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": list(credentials.scopes) if credentials.scopes else [],
        "expiry": credentials.expiry.isoformat() if credentials.expiry else None
    }
    
    # Update channel account with OAuth connection
    account.oauth_connected = True
    account.oauth_provider = "google"
    account.oauth_token_ref = json.dumps(token_data)  # In production, encrypt this!
    
    await db.commit()
    
    # Redirect back to marketing page with success message
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(
        url=f"{frontend_url}/marketing?oauth=success&account={channel_account_id}",
        status_code=302
    )


@router.post("/disconnect/{channel_account_id}")
async def disconnect_google(
    channel_account_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Disconnect Google OAuth from a channel account"""
    result = await db.execute(
        select(models.ChannelAccount).where(models.ChannelAccount.id == channel_account_id)
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    # Clear OAuth data
    account.oauth_connected = False
    account.oauth_provider = None
    account.oauth_token_ref = None
    
    await db.commit()
    
    return {"message": "Disconnected successfully"}


@router.get("/locations/{channel_account_id}")
async def get_google_locations(
    channel_account_id: UUID,
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Get list of Google Business Profile locations for the connected account.
    Returns locations that can be posted to.
    """
    result = await db.execute(
        select(models.ChannelAccount).where(models.ChannelAccount.id == channel_account_id)
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    if not account.oauth_connected or account.oauth_provider != "google":
        raise HTTPException(status_code=400, detail="Account not connected to Google")
    
    credentials = get_credentials_from_account(account)
    if not credentials:
        raise HTTPException(status_code=400, detail="Failed to load credentials")
    
    try:
        from googleapiclient.discovery import build
        
        # Build the My Business Account Management API client
        service = build('mybusinessaccountmanagement', 'v1', credentials=credentials)
        
        # Get accounts
        accounts_response = service.accounts().list().execute()
        accounts = accounts_response.get('accounts', [])
        
        if not accounts:
            return {"locations": [], "message": "No Google Business accounts found"}
        
        # Get locations for the first account (or you could let user choose)
        locations = []
        for acc in accounts:
            account_name = acc.get('name')
            
            # Build Business Profile API client for locations
            bp_service = build('mybusinessbusinessinformation', 'v1', credentials=credentials)
            
            try:
                locations_response = bp_service.accounts().locations().list(
                    parent=account_name,
                    readMask='name,title,storefrontAddress'
                ).execute()
                
                for loc in locations_response.get('locations', []):
                    locations.append({
                        "id": loc.get('name'),
                        "name": loc.get('title'),
                        "address": loc.get('storefrontAddress', {})
                    })
            except Exception as e:
                logger.warning(f"Failed to get locations for account {account_name}: {e}")
        
        return {"locations": locations}
    
    except Exception as e:
        logger.error(f"Failed to get Google locations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def get_credentials_from_account(account: models.ChannelAccount):
    """Load and refresh Google credentials from a channel account"""
    if not account.oauth_token_ref:
        return None
    
    try:
        from google.oauth2.credentials import Credentials
        
        token_data = json.loads(account.oauth_token_ref)
        
        credentials = Credentials(
            token=token_data.get('token'),
            refresh_token=token_data.get('refresh_token'),
            token_uri=token_data.get('token_uri', 'https://oauth2.googleapis.com/token'),
            client_id=token_data.get('client_id', GOOGLE_CLIENT_ID),
            client_secret=token_data.get('client_secret', GOOGLE_CLIENT_SECRET),
            scopes=token_data.get('scopes', SCOPES)
        )
        
        # Refresh if expired
        if credentials.expired and credentials.refresh_token:
            from google.auth.transport.requests import Request
            credentials.refresh(Request())
        
        return credentials
    
    except Exception as e:
        logger.error(f"Failed to load credentials: {e}")
        return None

