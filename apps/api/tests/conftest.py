"""
Shared pytest fixtures for all tests
Uses Supabase database from DATABASE_URL environment variable
"""
import os
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.models import Base, User
from app.core.password import hash_password

# Set DATABASE_URL before importing anything that uses it
if not os.getenv("DATABASE_URL"):
    # Default Supabase connection from your project
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@db.woxkbgzttghqwfilahfe.supabase.co:5432/postgres"

# Now import after setting env var
from app.core.config import settings
from app.db.session import get_session
from app.main import app

# Create test engine using the DATABASE_URL
test_engine = create_async_engine(
    settings.database_url,
    pool_size=5,
    max_overflow=2,
    pool_timeout=30,
    pool_pre_ping=True,
    echo=False,
    future=True
)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

# Override get_session to use test database
async def get_test_session():
    async with TestSessionLocal() as session:
        yield session

app.dependency_overrides[get_session] = get_test_session

@pytest.fixture(scope='function', autouse=True)
async def setup_db():
    """Setup test database - drop and create all tables for each test"""
    # Use Supabase database - drop and recreate tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup after test - drop tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope='function', autouse=True)
async def create_admin_user():
    """Create admin user for tests - runs after setup_db"""
    async with TestSessionLocal() as db:
        # Check if admin user already exists
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.username == "admin"))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            # Update existing admin user
            existing_user.hashed_password = hash_password("adminpassword")
            existing_user.role = "admin"
            existing_user.is_active = True
        else:
            # Create admin user with test password
            admin_user = User(
                username="admin",
                email="admin@example.com",
                hashed_password=hash_password("adminpassword"),
                role="admin",
                is_active=True
            )
            db.add(admin_user)
        await db.commit()
    yield
    # Cleanup handled by setup_db

