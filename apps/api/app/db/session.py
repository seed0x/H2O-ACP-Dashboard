from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from ..core.config import settings

# Configure connection pooling for production scalability
engine = create_async_engine(
    settings.database_url,
    pool_size=20,  # Number of connections to maintain
    max_overflow=10,  # Additional connections beyond pool_size
    pool_timeout=30,  # Seconds to wait for connection from pool
    pool_pre_ping=True,  # Verify connections before use (handles stale connections)
    echo=False,
    future=True
)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
