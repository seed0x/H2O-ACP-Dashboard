import sys
import os

# Add the project root to Python path for imports
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from apps.api.app.main import app

# Vercel serverless handler - Use Mangum to properly handle ASGI app
# Mangum converts ASGI to AWS Lambda/Vercel format
try:
    from mangum import Mangum
    
    # Create handler with lifespan support disabled (Vercel handles cold starts differently)
    # Wrap in a callable function to ensure Vercel recognizes it properly
    _mangum_handler = Mangum(app, lifespan="off")
    
    def handler(event, context):
        """Vercel serverless function handler"""
        return _mangum_handler(event, context)
except ImportError:
    # Fallback if mangum not available (shouldn't happen in production)
    def handler(event, context):
        """Fallback handler - should not be used in production"""
        return {"statusCode": 500, "body": "Mangum not available"}
