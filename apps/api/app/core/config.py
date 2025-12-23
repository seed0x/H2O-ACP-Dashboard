import os
from typing import Optional
try:
    # pydantic v2 moved BaseSettings to pydantic-settings package
    from pydantic_settings import BaseSettings
except Exception:
    # fallback for older pydantic versions
    from pydantic import BaseSettings

class Settings(BaseSettings):
    _database_url: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@db:5432/plumbing")
    
    @property
    def database_url(self) -> str:
        """Convert postgresql:// to postgresql+asyncpg:// for async operations"""
        url = self._database_url
        if url.startswith('postgresql://') and '+asyncpg' not in url:
            url = url.replace('postgresql://', 'postgresql+asyncpg://', 1)
        # Remove sslmode query parameter - asyncpg handles SSL automatically for remote hosts
        # and doesn't accept sslmode as a URL parameter
        if '?sslmode=' in url:
            url = url.split('?')[0]
        return url
    admin_password: str = os.getenv("ADMIN_PASSWORD", "adminpassword")
    jwt_secret: str = os.getenv("JWT_SECRET", "changemeplease")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("API_PORT", "8000"))
    environment: str = os.getenv("ENVIRONMENT", "development")
    _cors_origins_raw: str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    
    # Email/SMTP settings for review requests
    smtp_host: Optional[str] = os.getenv("SMTP_HOST", None)
    smtp_port: Optional[int] = int(os.getenv("SMTP_PORT", "587")) if os.getenv("SMTP_PORT") else None
    smtp_user: Optional[str] = os.getenv("SMTP_USER", None)
    smtp_password: Optional[str] = os.getenv("SMTP_PASSWORD", None)
    smtp_from_email: Optional[str] = os.getenv("SMTP_FROM_EMAIL", None)
    smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    
    # Frontend URL for review links
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Storage configuration (S3 or R2)
    storage_provider: str = os.getenv("STORAGE_PROVIDER", "s3")  # 's3' or 'r2'
    storage_bucket: Optional[str] = os.getenv("STORAGE_BUCKET", None)
    storage_region: Optional[str] = os.getenv("STORAGE_REGION", None)
    storage_access_key_id: Optional[str] = os.getenv("STORAGE_ACCESS_KEY_ID", None)
    storage_secret_access_key: Optional[str] = os.getenv("STORAGE_SECRET_ACCESS_KEY", None)
    storage_endpoint_url: Optional[str] = os.getenv("STORAGE_ENDPOINT_URL", None)  # Required for R2
    
    @property
    def cors_origins(self) -> str:
        """Get CORS origins, ensuring https://dataflow-eta.vercel.app is included"""
        required_origin = "https://dataflow-eta.vercel.app"
        origins_list = [origin.strip() for origin in self._cors_origins_raw.split(",") if origin.strip()]
        
        # Add required origin if not present
        if required_origin not in origins_list:
            origins_list.append(required_origin)
        
        result = ",".join(origins_list)
        # #region agent log
        import logging
        logging.getLogger(__name__).info(f"CORS origins computed: raw={self._cors_origins_raw}, final={result}, list={origins_list}")
        # #endregion
        return result
    
    @property
    def cors_origins_list(self):
        result = [origin.strip() for origin in self.cors_origins.split(",")]
        # #region agent log
        import logging
        logging.getLogger(__name__).info(f"CORS origins_list: {result}")
        # #endregion
        return result

settings = Settings()
