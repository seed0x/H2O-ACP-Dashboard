import asyncio
from logging.config import fileConfig
import os
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy import engine_from_config

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
fileConfig(config.config_file_name)

# Add your model's MetaData object here
import sys
# Add /app to Python path so we can import app.models
# __file__ is /app/alembic/env.py, so dirname(dirname(__file__)) = /app
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.models import Base

target_metadata = Base.metadata

# set sqlalchemy.url from env
db_url = os.getenv('DATABASE_URL')
if db_url:
    # Convert postgresql:// to postgresql+asyncpg:// for async operations
    if db_url.startswith('postgresql://') and '+asyncpg' not in db_url:
        db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
    # Remove sslmode query parameter - asyncpg handles SSL automatically for remote hosts
    # and doesn't accept sslmode as a URL parameter
    if '?sslmode=' in db_url:
        db_url = db_url.split('?')[0]
    config.set_main_option('sqlalchemy.url', db_url)


def run_migrations_online() -> None:
    from sqlalchemy.ext.asyncio import create_async_engine
    # Disable prepared statements for pgbouncer compatibility (Supabase uses pgbouncer)
    connectable = create_async_engine(
        config.get_main_option('sqlalchemy.url'),
        connect_args={
            "statement_cache_size": 0,  # Disable prepared statements for pgbouncer
            "server_settings": {
                "jit": "off"
            }
        }
    )

    async def do_run_migrations():
        async with connectable.connect() as conn:
            await conn.run_sync(do_run_migrations_sync)
        await connectable.dispose()

    def do_run_migrations_sync(connection: Connection):
        # Configure context to skip ENUM type creation from metadata
        # This prevents SQLAlchemy from trying to create ENUMs that already exist
        def include_object(object, name, type_, reflected, compare_to):
            # Skip ENUM type creation - we handle them manually in migrations
            if type_ == "type" and hasattr(object, "name"):
                # Check if this is one of our manually-created ENUMs
                enum_names = ['portal_category', 'portal_rule_applies_to', 'job_phase', 'tenant_enum']
                if object.name in enum_names:
                    return False  # Skip processing this ENUM type
            return True
        
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=False  # Don't compare types to avoid ENUM creation issues
        )
        with context.begin_transaction():
            context.run_migrations()

    asyncio.run(do_run_migrations())


def run_migrations_offline():
    context.configure(url=config.get_main_option('sqlalchemy.url'), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
