"""
Base publisher interface
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from .. import models


class BasePublisher(ABC):
    """Base class for platform-specific publishers"""
    
    @abstractmethod
    async def publish(
        self,
        caption: str,
        media_urls: List[str],
        account: models.ChannelAccount
    ) -> Dict[str, Any]:
        """
        Publish content to the platform
        
        Args:
            caption: The post caption/text
            media_urls: List of media file URLs to attach
            account: The channel account to publish to
            
        Returns:
            Dict with 'url', 'id', and optionally 'post_id' or other platform-specific fields
        """
        pass
    
    @abstractmethod
    def is_connected(self, account: models.ChannelAccount) -> bool:
        """Check if the account is properly connected/authenticated"""
        pass

