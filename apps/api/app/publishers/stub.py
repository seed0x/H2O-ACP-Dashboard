"""
Stub publisher for testing/development
"""
import logging
from typing import List, Dict, Any
from .base import BasePublisher
from .. import models

logger = logging.getLogger(__name__)


class StubPublisher(BasePublisher):
    """Stub publisher that logs instead of actually publishing"""
    
    async def publish(
        self,
        caption: str,
        media_urls: List[str],
        account: models.ChannelAccount
    ) -> Dict[str, Any]:
        """Stub publish - logs the action"""
        logger.info(f"STUB PUBLISH to {account.name} ({account.channel.name if account.channel else 'unknown'}):")
        logger.info(f"  Caption: {caption[:100]}...")
        logger.info(f"  Media URLs: {len(media_urls)} files")
        
        # Return mock result
        return {
            "url": f"https://stub.example.com/post/{account.id}",
            "id": f"stub_{account.id}",
            "status": "posted",
            "message": "Stub publisher - post not actually published"
        }
    
    def is_connected(self, account: models.ChannelAccount) -> bool:
        """Stub always returns True"""
        return True

