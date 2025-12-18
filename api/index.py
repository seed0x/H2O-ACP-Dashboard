import sys
import os

# Add the project root to Python path for imports
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from apps.api.app.main import app

# Vercel serverless handler - Use Mangum to properly handle ASGI app
# Mangum converts ASGI to AWS Lambda/Vercel format
from mangum import Mangum

# Create handler with lifespan support disabled (Vercel handles cold starts differently)
# Export handler directly - Vercel Python runtime expects this
handler = Mangum(app, lifespan="off")
