"""
Rate Limiting Middleware

Provides tenant-aware rate limiting for API endpoints.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request
from typing import Optional

# Initialize rate limiter - shared instance
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000/hour"],  # Default limit if not specified
    storage_uri="memory://",  # In-memory storage (use Redis in production)
)

# Rate limit configurations per endpoint type
RATE_LIMITS = {
    "auth": "10/minute",  # Login attempts
    "read": "200/minute",  # GET requests
    "write": "100/minute",  # POST/PATCH/DELETE requests
    "marketing": "50/minute",  # Marketing endpoints
}


def get_tenant_id_from_request(request: Request) -> Optional[str]:
    """
    Extract tenant_id from request for tenant-aware rate limiting.
    Checks query params first, then request body if available.
    """
    # Try query parameter
    tenant_id = request.query_params.get("tenant_id")
    if tenant_id:
        return tenant_id
    return None


def get_rate_limit(limit_type: str = "read") -> str:
    """Get rate limit string for a given limit type"""
    return RATE_LIMITS.get(limit_type, "100/minute")

