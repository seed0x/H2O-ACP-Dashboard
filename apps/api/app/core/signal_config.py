"""
Signal configuration - Default ownership rules per signal type
"""
from typing import Dict, Optional

# Default ownership rules per signal type
# Format: {signal_id: default_owner}
# If signal doesn't match any rule, owner is None (unassigned)
SIGNAL_OWNERSHIP_RULES: Dict[str, Optional[str]] = {
    # Reviews signals
    'reviews_no_request': 'admin',  # Completed service calls need review request
    'reviews_no_response': None,  # Review requests awaiting response - no default owner
    'reviews_needs_recovery': 'admin',  # Low-rated reviews need recovery
    
    # Marketing signals
    'marketing_not_ready': None,  # Posts not ready - assign to content owner
    'marketing_past_due': None,  # Past due posts - assign to content owner
    'marketing_needs_approval': 'admin',  # Content needs approval
    
    # Dispatch signals
    'dispatch_unscheduled_calls': 'admin',  # Unscheduled service calls
    'dispatch_unassigned_jobs': 'admin',  # Jobs without tech
    'dispatch_today_tech_*': None,  # Today's jobs - use tech name as owner
}

def get_default_owner(signal_id: str, fallback_owner: Optional[str] = None) -> Optional[str]:
    """
    Get default owner for a signal based on configuration rules.
    
    Args:
        signal_id: The signal ID (e.g., 'reviews_no_request')
        fallback_owner: Optional fallback owner if no rule matches
        
    Returns:
        Default owner name or None
    """
    # Check exact match
    if signal_id in SIGNAL_OWNERSHIP_RULES:
        owner = SIGNAL_OWNERSHIP_RULES[signal_id]
        return owner if owner is not None else fallback_owner
    
    # Check wildcard patterns (e.g., 'dispatch_today_tech_*')
    for pattern, owner in SIGNAL_OWNERSHIP_RULES.items():
        if pattern.endswith('*') and signal_id.startswith(pattern[:-1]):
            return owner if owner is not None else fallback_owner
    
    # No rule matched, return fallback
    return fallback_owner


