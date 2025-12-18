import sys
import os

# Add the project root to Python path for imports  
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Lazy import to avoid Vercel introspection issues
# Import app and Mangum inside handler function
_mangum_adapter = None

def handler(event, context):
    """Vercel serverless function handler"""
    global _mangum_adapter
    if _mangum_adapter is None:
        from apps.api.app.main import app
        from mangum import Mangum
        _mangum_adapter = Mangum(app, lifespan="off")
    return _mangum_adapter(event, context)

# Export handler for Vercel
__all__ = ['handler']

