"""
Facebook Page publisher
Publishes posts to Facebook Pages using Graph API
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

# Facebook OAuth configuration
FACEBOOK_APP_ID = os.getenv("FACEBOOK_APP_ID", "")
FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET", "")

# Facebook Graph API base URL
GRAPH_API_BASE = "https://graph.facebook.com/v18.0"


class FacebookPublisher(BasePublisher):
    """Publisher for Facebook Page posts"""
    
    async def publish(
        self,
        caption: str,
        media_urls: List[str],
        account: models.ChannelAccount
    ) -> Dict[str, Any]:
        """
        Publish a post to Facebook Page
        
        Args:
            caption: The post text/content
            media_urls: List of image URLs to include (first image will be used)
            account: The channel account with OAuth credentials
            
        Returns:
            Dict with post URL and ID
        """
        if not self.is_connected(account):
            raise ValueError("Facebook Page not connected. Please authorize first.")
        
        access_token = self._get_access_token(account)
        if not access_token:
            raise ValueError("Failed to load Facebook access token")
        
        page_id = account.external_id
        if not page_id:
            raise ValueError("Facebook Page ID not found. Please reconnect the account.")
        
        try:
            if media_urls and len(media_urls) > 0:
                # Post with image
                return await self._publish_with_photo(caption, media_urls[0], page_id, access_token)
            else:
                # Text-only post
                return await self._publish_text_only(caption, page_id, access_token)
        except Exception as e:
            logger.error(f"Failed to publish to Facebook: {e}", exc_info=True)
            raise
    
    async def _publish_with_photo(
        self,
        caption: str,
        photo_url: str,
        page_id: str,
        access_token: str
    ) -> Dict[str, Any]:
        """Publish a post with a photo"""
        async with aiohttp.ClientSession() as session:
            # Facebook requires the photo to be uploaded first, or use URL parameter
            # For simplicity, we'll use the 'url' parameter to attach a photo
            url = f"{GRAPH_API_BASE}/{page_id}/photos"
            params = {
                "message": caption,
                "url": photo_url,  # Facebook will fetch the image from this URL
                "access_token": access_token
            }
            
            async with session.post(url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise ValueError(f"Facebook API error: {error_text}")
                
                result = await response.json()
                post_id = result.get("post_id") or result.get("id")
                
                return {
                    "url": f"https://www.facebook.com/{page_id}/posts/{post_id.split('_')[1] if '_' in str(post_id) else post_id}",
                    "id": str(post_id),
                    "post_id": str(post_id)
                }
    
    async def _publish_text_only(
        self,
        caption: str,
        page_id: str,
        access_token: str
    ) -> Dict[str, Any]:
        """Publish a text-only post"""
        async with aiohttp.ClientSession() as session:
            url = f"{GRAPH_API_BASE}/{page_id}/feed"
            params = {
                "message": caption,
                "access_token": access_token
            }
            
            async with session.post(url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise ValueError(f"Facebook API error: {error_text}")
                
                result = await response.json()
                post_id = result.get("id")
                
                return {
                    "url": f"https://www.facebook.com/{page_id}/posts/{post_id.split('_')[1] if '_' in str(post_id) else post_id}",
                    "id": str(post_id),
                    "post_id": str(post_id)
                }
    
    def is_connected(self, account: models.ChannelAccount) -> bool:
        """Check if the Facebook account is properly connected/authenticated"""
        return (
            account.oauth_connected and
            account.oauth_provider == 'facebook' and
            account.oauth_token_ref is not None and
            account.external_id is not None  # Page ID
        )
    
    def _get_access_token(self, account: models.ChannelAccount) -> Optional[str]:
        """Get Facebook access token from account"""
        # In a real implementation, decrypt the token from oauth_token_ref
        # For now, assume oauth_token_ref contains the access token directly
        # In production, you should encrypt/decrypt tokens
        if account.oauth_token_ref:
            try:
                # If stored as JSON, parse it
                token_data = json.loads(account.oauth_token_ref)
                return token_data.get("access_token") or token_data.get("token")
            except (json.JSONDecodeError, TypeError):
                # If stored as plain string
                return account.oauth_token_ref
        return None

