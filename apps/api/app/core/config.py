import os
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
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    
    @property
    def cors_origins_list(self):
        return [origin.strip() for origin in self.cors_origins.split(",")]

settings = Settings()
