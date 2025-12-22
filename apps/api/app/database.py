from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .core.config import settings

# Derive a sync DB URL from the async URL (simple replacement for asyncpg)
# If your DATABASE_URL uses a different async driver, adjust accordingly.
sync_db_url = settings.database_url.replace("+asyncpg", "")

engine = create_engine(sync_db_url, echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db():
    """Dependency that yields a synchronous SQLAlchemy Session for legacy/marketing routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
