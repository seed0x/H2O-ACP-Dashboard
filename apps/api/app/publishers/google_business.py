"""
Google Business Profile publisher
Publishes posts to Google Business Profile (formerly Google My Business)
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from .base import BasePublisher
from .. import models

logger = logging.getLogger(__name__)

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

SCOPES = [
    "https://www.googleapis.com/auth/business.manage",
]


class GoogleBusinessPublisher(BasePublisher):
    """Publisher for Google Business Profile posts"""
    
    async def publish(
        self,
        caption: str,
        media_urls: List[str],
        account: models.ChannelAccount
    ) -> Dict[str, Any]:
        """
        Publish a post to Google Business Profile
        
        Args:
            caption: The post text/content
            media_urls: List of image URLs to include
            account: The channel account with OAuth credentials
            
        Returns:
            Dict with post URL and ID
        """
        if not self.is_connected(account):
            raise ValueError("Google Business Profile not connected. Please authorize first.")
        
        credentials = self._get_credentials(account)
        if not credentials:
            raise ValueError("Failed to load Google credentials")
        
        try:
            from googleapiclient.discovery import build
            from googleapiclient.http import MediaIoBaseUpload
            import io
            import httpx
            
            # Build the Business Profile API client
            service = build('mybusiness', 'v4', credentials=credentials, 
                          discoveryServiceUrl='https://mybusiness.googleapis.com/$discovery/rest?version=v4')
            
            # Get the location to post to
            location_name = self._get_location_name(account, credentials)
            if not location_name:
                raise ValueError("No Google Business location found for this account")
            
            # Prepare the post
            post_body = {
                "languageCode": "en-US",
                "summary": caption[:1500],  # GBP has a 1500 char limit
                "topicType": "STANDARD",
            }
            
            # Add call-to-action if configured
            cta_type = getattr(account, 'gbp_cta_type', None)
            if cta_type:
                cta_mapping = {
                    'call': 'CALL',
                    'book': 'BOOK',
                    'learn_more': 'LEARN_MORE',
                    'order_online': 'ORDER',
                }
                if cta_type in cta_mapping:
                    post_body['callToAction'] = {
                        'actionType': cta_mapping[cta_type]
                    }
            
            # Upload media if provided
            if media_urls:
                # GBP only supports one image per post for standard posts
                media_url = media_urls[0]
                
                try:
                    # Download image
                    async with httpx.AsyncClient() as client:
                        response = await client.get(media_url)
                        if response.status_code == 200:
                            image_content = response.content
                            
                            # For GBP, we need to include the media in the post
                            # The API expects a media item
                            post_body['media'] = [{
                                'mediaFormat': 'PHOTO',
                                'sourceUrl': media_url  # GBP can fetch from URL
                            }]
                except Exception as e:
                    logger.warning(f"Failed to process media for GBP: {e}")
            
            # Create the post
            try:
                result = service.accounts().locations().localPosts().create(
                    parent=location_name,
                    body=post_body
                ).execute()
                
                post_name = result.get('name', '')
                
                logger.info(f"Successfully published to Google Business Profile: {post_name}")
                
                return {
                    "id": post_name,
                    "url": f"https://business.google.com/posts/l/{post_name.split('/')[-1]}",
                    "platform": "google_business_profile",
                    "success": True,
                    "response": result
                }
                
            except Exception as api_error:
                logger.error(f"GBP API error: {api_error}")
                raise ValueError(f"Failed to create post: {str(api_error)}")
        
        except ImportError as e:
            logger.error(f"Google API libraries not installed: {e}")
            raise ValueError("Google API libraries not installed. Run: pip install google-api-python-client google-auth-oauthlib")
        
        except Exception as e:
            logger.error(f"Failed to publish to Google Business Profile: {e}")
            raise ValueError(f"Failed to publish: {str(e)}")
    
    def is_connected(self, account: models.ChannelAccount) -> bool:
        """Check if the account is connected to Google"""
        return (
            account.oauth_connected and 
            account.oauth_provider == "google" and
            bool(account.oauth_token_ref)
        )
    
    def _get_credentials(self, account: models.ChannelAccount):
        """Load Google credentials from account"""
        if not account.oauth_token_ref:
            return None
        
        try:
            from google.oauth2.credentials import Credentials
            from google.auth.transport.requests import Request
            
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
                credentials.refresh(Request())
            
            return credentials
        
        except Exception as e:
            logger.error(f"Failed to load credentials: {e}")
            return None
    
    def _get_location_name(self, account: models.ChannelAccount, credentials) -> Optional[str]:
        """Get the Google Business location name for posting"""
        # If location is stored on the account, use it
        if hasattr(account, 'external_id') and account.external_id:
            return account.external_id
        
        # Otherwise, fetch the first location
        try:
            from googleapiclient.discovery import build
            
            # Get accounts
            account_service = build('mybusinessaccountmanagement', 'v1', credentials=credentials)
            accounts_response = account_service.accounts().list().execute()
            accounts = accounts_response.get('accounts', [])
            
            if not accounts:
                return None
            
            # Get locations from first account
            bp_service = build('mybusinessbusinessinformation', 'v1', credentials=credentials)
            
            for acc in accounts:
                account_name = acc.get('name')
                try:
                    locations_response = bp_service.accounts().locations().list(
                        parent=account_name,
                        readMask='name'
                    ).execute()
                    
                    locations = locations_response.get('locations', [])
                    if locations:
                        return locations[0].get('name')
                except Exception as e:
                    logger.warning(f"Failed to get locations for {account_name}: {e}")
            
            return None
        
        except Exception as e:
            logger.error(f"Failed to get location: {e}")
            return None

