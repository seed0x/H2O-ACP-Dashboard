"""
Instagram Business publisher
Publishes posts to Instagram Business accounts using Graph API
"""
import os
import json
import logging
import aiohttp
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from .base import BasePublisher
from .. import models

logger = logging.getLogger(__name__)

# Facebook/Instagram OAuth configuration (Instagram uses Facebook OAuth)
FACEBOOK_APP_ID = os.getenv("FACEBOOK_APP_ID", "")
FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET", "")

# Instagram Graph API base URL
GRAPH_API_BASE = "https://graph.facebook.com/v18.0"


class InstagramPublisher(BasePublisher):
    """Publisher for Instagram Business account posts"""
    
    async def publish(
        self,
        caption: str,
        media_urls: List[str],
        account: models.ChannelAccount
    ) -> Dict[str, Any]:
        """
        Publish a post to Instagram Business account
        
        Args:
            caption: The post text/content
            media_urls: List of image URLs (first image will be used, Instagram supports single image posts)
            account: The channel account with OAuth credentials
            
        Returns:
            Dict with post URL and ID
        """
        if not self.is_connected(account):
            raise ValueError("Instagram Business account not connected. Please authorize first.")
        
        if not media_urls or len(media_urls) == 0:
            raise ValueError("Instagram posts require at least one image")
        
        access_token = self._get_access_token(account)
        if not access_token:
            raise ValueError("Failed to load Instagram access token")
        
        ig_user_id = account.external_id
        if not ig_user_id:
            raise ValueError("Instagram Business account ID not found. Please reconnect the account.")
        
        try:
            # Instagram requires two-step publishing: create container, then publish
            # Step 1: Create media container
            container_id = await self._create_media_container(
                caption,
                media_urls[0],
                ig_user_id,
                access_token
            )
            
            # Step 2: Publish the container
            return await self._publish_container(container_id, ig_user_id, access_token)
            
        except Exception as e:
            logger.error(f"Failed to publish to Instagram: {e}", exc_info=True)
            raise
    
    async def _create_media_container(
        self,
        caption: str,
        image_url: str,
        ig_user_id: str,
        access_token: str
    ) -> str:
        """Create a media container (step 1 of Instagram publishing)"""
        async with aiohttp.ClientSession() as session:
            url = f"{GRAPH_API_BASE}/{ig_user_id}/media"
            params = {
                "image_url": image_url,
                "caption": caption,
                "access_token": access_token
            }
            
            async with session.post(url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise ValueError(f"Instagram API error creating container: {error_text}")
                
                result = await response.json()
                container_id = result.get("id")
                if not container_id:
                    raise ValueError(f"Failed to create media container: {result}")
                
                return container_id
    
    async def _publish_container(
        self,
        container_id: str,
        ig_user_id: str,
        access_token: str
    ) -> Dict[str, Any]:
        """Publish a media container (step 2 of Instagram publishing)"""
        async with aiohttp.ClientSession() as session:
            url = f"{GRAPH_API_BASE}/{ig_user_id}/media_publish"
            params = {
                "creation_id": container_id,
                "access_token": access_token
            }
            
            async with session.post(url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise ValueError(f"Instagram API error publishing: {error_text}")
                
                result = await response.json()
                media_id = result.get("id")
                
                if not media_id:
                    raise ValueError(f"Failed to publish media: {result}")
                
                return {
                    "url": f"https://www.instagram.com/p/{media_id}/",
                    "id": str(media_id),
                    "media_id": str(media_id)
                }
    
    def is_connected(self, account: models.ChannelAccount) -> bool:
        """Check if the Instagram account is properly connected/authenticated"""
        return (
            account.oauth_connected and
            account.oauth_provider == 'instagram' and
            account.oauth_token_ref is not None and
            account.external_id is not None  # Instagram Business account ID
        )
    
    def _get_access_token(self, account: models.ChannelAccount) -> Optional[str]:
        """Get Instagram access token from account"""
        # Token is stored as JSON string in oauth_token_ref
        # Format: {"access_token": "...", "user_token": "...", "ig_user_id": "...", ...}
        if account.oauth_token_ref:
            try:
                # Parse JSON string
                token_data = json.loads(account.oauth_token_ref)
                return token_data.get("access_token") or token_data.get("user_token")
            except (json.JSONDecodeError, TypeError):
                # Fallback: if stored as plain string
                return account.oauth_token_ref
        return None

