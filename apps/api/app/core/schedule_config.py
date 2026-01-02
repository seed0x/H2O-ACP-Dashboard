"""
Default scheduling configuration per channel type
Format: {channel_key: default_time_string}
Default time is in format "HH:MM" (24-hour format)
"""
from typing import Dict, Optional
from datetime import datetime, timedelta

# Default scheduling times per channel (in HH:MM format, 24-hour)
CHANNEL_DEFAULT_SCHEDULE_TIMES: Dict[str, str] = {
    'google_business_profile': '09:00',  # 9 AM
    'facebook': '10:00',  # 10 AM
    'instagram': '11:00',  # 11 AM
    'nextdoor': '08:00',  # 8 AM
}

def get_default_schedule_time(channel_key: str, days_ahead: int = 1) -> Optional[datetime]:
    """
    Get default schedule datetime for a channel.
    
    Args:
        channel_key: The channel key (e.g., 'google_business_profile')
        days_ahead: Number of days ahead to schedule (default: 1 for tomorrow)
        
    Returns:
        datetime object with default schedule time, or None if no default
    """
    if channel_key not in CHANNEL_DEFAULT_SCHEDULE_TIMES:
        return None
    
    time_str = CHANNEL_DEFAULT_SCHEDULE_TIMES[channel_key]
    hour, minute = map(int, time_str.split(':'))
    
    # Calculate target date
    target_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    target_date += timedelta(days=days_ahead)
    target_date = target_date.replace(hour=hour, minute=minute)
    
    return target_date






