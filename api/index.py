import sys
import os

# Add the project root to Python path for imports  
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Vercel natively supports ASGI applications - export FastAPI app directly
# No need for Mangum adapter - Vercel handles ASGI directly
from apps.api.app.main import app

# Vercel's Python runtime automatically detects and serves the 'app' object
# This is the standard way to deploy FastAPI on Vercel
__all__ = ['app']

