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
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from app.models import Base

target_metadata = Base.metadata

# set sqlalchemy.url from env
db_url = os.getenv('DATABASE_URL')
if db_url:
    config.set_main_option('sqlalchemy.url', db_url)


def run_migrations_online() -> None:
    from sqlalchemy.ext.asyncio import create_async_engine
    connectable = create_async_engine(config.get_main_option('sqlalchemy.url'))

    async def do_run_migrations():
        async with connectable.connect() as conn:
            await conn.run_sync(do_run_migrations_sync)
        await connectable.dispose()

    async def do_run_migrations_sync(connection: Connection):
        context.configure(connection=connection, target_metadata=target_metadata)
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
