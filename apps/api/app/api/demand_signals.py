"""
Demand Signals API endpoint - Google Search Console integration
Shows top search queries with trends for content planning
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
import os
import logging

from ..db.session import get_session
from ..core.auth import get_current_user, CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/marketing/demand-signals", tags=["marketing-demand-signals"])

# Service type keywords for categorization
SERVICE_CATEGORIES = {
    "water_heater": ["water heater", "water heater repair", "water heater replacement", "hot water", "tankless"],
    "plumbing": ["plumber", "plumbing", "drain", "pipe", "leak", "faucet", "toilet", "sink"],
    "emergency": ["emergency plumber", "24 hour", "urgent", "burst pipe", "flood"],
    "installation": ["install", "installation", "new", "replace", "upgrade"],
    "repair": ["repair", "fix", "broken", "not working", "issue"],
    "maintenance": ["maintenance", "service", "inspection", "check", "tune-up"]
}


def categorize_query(query: str) -> str:
    """Categorize a search query by service type"""
    query_lower = query.lower()
    
    # Check each category
    for category, keywords in SERVICE_CATEGORIES.items():
        for keyword in keywords:
            if keyword in query_lower:
                return category
    
    return "general"


async def fetch_google_search_console_data(
    site_url: str,
    days: int,
    start_date_offset: int = 0,
    credentials_path: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Fetch search query data from Google Search Console API
    
    Args:
        site_url: The site URL (property) in Search Console (e.g., 'sc-domain:h2oplumbers.com')
        days: Number of days to look back
        credentials_path: Path to OAuth credentials JSON file (optional, uses env vars if not provided)
    
    Returns:
        List of query data with query, clicks, impressions, ctr, position
    """
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        from googleapiclient.errors import HttpError
        
        # Get credentials from environment or file
        credentials_json = os.getenv("GOOGLE_SEARCH_CONSOLE_CREDENTIALS_JSON")
        credentials_path = credentials_path or os.getenv("GOOGLE_SEARCH_CONSOLE_CREDENTIALS_PATH")
        
        if not credentials_json and not credentials_path:
            logger.warning("Google Search Console credentials not configured")
            return []
        
        # Build credentials
        if credentials_json:
            import json
            creds_info = json.loads(credentials_json)
            credentials = service_account.Credentials.from_service_account_info(
                creds_info,
                scopes=['https://www.googleapis.com/auth/webmasters.readonly']
            )
        else:
            credentials = service_account.Credentials.from_service_account_file(
                credentials_path,
                scopes=['https://www.googleapis.com/auth/webmasters.readonly']
            )
        
        # Build the service
        service = build('searchconsole', 'v1', credentials=credentials)
        
        # Calculate date range with optional offset for previous period
        end_date = datetime.now(timezone.utc).date() - timedelta(days=start_date_offset)
        start_date = end_date - timedelta(days=days)
        
        # Request data
        request = {
            'startDate': start_date.isoformat(),
            'endDate': end_date.isoformat(),
            'dimensions': ['query'],
            'rowLimit': 100
        }
        
        response = service.searchanalytics().query(siteUrl=site_url, body=request).execute()
        
        # Process results
        results = []
        if 'rows' in response:
            for row in response['rows']:
                results.append({
                    'query': row['keys'][0],
                    'clicks': row.get('clicks', 0),
                    'impressions': row.get('impressions', 0),
                    'ctr': row.get('ctr', 0),
                    'position': row.get('position', 0)
                })
        
        return results
        
    except ImportError:
        logger.error("Google API client libraries not installed. Install: pip install google-api-python-client google-auth-oauthlib")
        return []
    except HttpError as e:
        logger.error(f"Google Search Console API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch Search Console data: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error fetching Search Console data: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching demand signals: {str(e)}"
        )


async def calculate_trends(
    current_data: List[Dict[str, Any]],
    previous_data: List[Dict[str, Any]]
) -> Dict[str, Dict[str, Any]]:
    """Calculate trend direction (up/down) for each query"""
    trends = {}
    
    # Create lookup for previous period
    previous_lookup = {item['query']: item for item in previous_data}
    
    for item in current_data:
        query = item['query']
        current_clicks = item.get('clicks', 0)
        
        if query in previous_lookup:
            previous_clicks = previous_lookup[query].get('clicks', 0)
            if previous_clicks > 0:
                change_pct = ((current_clicks - previous_clicks) / previous_clicks) * 100
                direction = 'up' if change_pct > 0 else 'down' if change_pct < 0 else 'stable'
            else:
                change_pct = 100 if current_clicks > 0 else 0
                direction = 'up' if current_clicks > 0 else 'stable'
        else:
            change_pct = 100  # New query
            direction = 'up'
        
        trends[query] = {
            'direction': direction,
            'change_pct': round(change_pct, 1),
            'current_clicks': current_clicks
        }
    
    return trends


@router.get("")
async def get_demand_signals(
    tenant_id: str = Query(..., description="Tenant ID"),
    days: int = Query(7, ge=1, le=90, description="Number of days to analyze (7 or 30)"),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Get demand signals from Google Search Console
    
    Returns top search queries with trends, categorized by service type.
    """
    # Get site URL from environment (can be made configurable per tenant later)
    site_url = os.getenv("GOOGLE_SEARCH_CONSOLE_SITE_URL")
    if not site_url:
        # Return empty data if not configured
        return {
            "queries": [],
            "categories": {},
            "period": f"{days}d",
            "configured": False,
            "message": "Google Search Console not configured. Set GOOGLE_SEARCH_CONSOLE_SITE_URL and credentials."
        }
    
    try:
        # Fetch current period data (last N days)
        current_data = await fetch_google_search_console_data(site_url, days, start_date_offset=0)
        
        # Fetch previous period data for trend calculation (same length period, before current)
        # For 7d: compare last 7 days vs previous 7 days (days 8-14)
        # For 30d: compare last 30 days vs previous 30 days (days 31-60)
        previous_data = await fetch_google_search_console_data(site_url, days, start_date_offset=days)
        
        # Calculate trends
        trends = await calculate_trends(current_data, previous_data)
        
        # Categorize and group queries
        categorized = {}
        for item in current_data:
            query = item['query']
            category = categorize_query(query)
            
            if category not in categorized:
                categorized[category] = []
            
            categorized[category].append({
                **item,
                'category': category,
                'trend': trends.get(query, {'direction': 'stable', 'change_pct': 0, 'current_clicks': item.get('clicks', 0)})
            })
        
        # Sort each category by clicks
        for category in categorized:
            categorized[category].sort(key=lambda x: x.get('clicks', 0), reverse=True)
        
        # Get top queries overall (for main list)
        top_queries = sorted(
            current_data,
            key=lambda x: x.get('clicks', 0),
            reverse=True
        )[:20]  # Top 20
        
        # Add trend data to top queries
        for query_data in top_queries:
            query = query_data['query']
            query_data['category'] = categorize_query(query)
            query_data['trend'] = trends.get(query, {'direction': 'stable', 'change_pct': 0, 'current_clicks': query_data.get('clicks', 0)})
        
        return {
            "queries": top_queries,
            "categories": categorized,
            "period": f"{days}d",
            "configured": True,
            "site_url": site_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing demand signals: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing demand signals: {str(e)}"
        )

