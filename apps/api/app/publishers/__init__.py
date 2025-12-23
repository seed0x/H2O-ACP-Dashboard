"""
Social media platform publishers
"""
from .. import models


def get_publisher_for_account(account: models.ChannelAccount):
    """
    Get the appropriate publisher for a channel account
    
    Returns a publisher instance based on the account's channel/platform.
    For now, returns a stub publisher. Implement platform-specific publishers
    as needed (FacebookPublisher, InstagramPublisher, etc.)
    """
    if not account.channel:
        return None
    
    channel_name = account.channel.name.lower()
    channel_key = account.channel.key.lower() if account.channel.key else ''
    
    # Check for platform-specific publishers
    if 'facebook' in channel_name or 'facebook' in channel_key:
        try:
            from .facebook import FacebookPublisher
            return FacebookPublisher()
        except ImportError:
            pass
    
    if 'instagram' in channel_name or 'instagram' in channel_key:
        try:
            from .instagram import InstagramPublisher
            return InstagramPublisher()
        except ImportError:
            pass
    
    if 'google' in channel_name or 'google' in channel_key or 'gmb' in channel_key:
        try:
            from .google_business import GoogleBusinessPublisher
            return GoogleBusinessPublisher()
        except ImportError:
            pass
    
    # Default to stub publisher if no specific publisher found
    from .stub import StubPublisher
    return StubPublisher()

