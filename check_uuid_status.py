"""
Script to check the status of a UUID across all tables that use UUIDs
"""
import asyncio
import os
import sys
from uuid import UUID
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
from dotenv import load_dotenv

# Add the apps/api directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps', 'api'))

load_dotenv()

# Try to use the app's config
try:
    from app.core.config import settings
    DATABASE_URL = settings.database_url
except ImportError:
    # Fallback to environment variable or default
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/plumbing")
    if DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# UUID to check
TARGET_UUID = "27914593-7f9b-4922-9ace-f02d314183d5"

# Tables that use UUID primary keys
UUID_TABLES = [
    "builders",
    "bids",
    "bid_line_items",
    "jobs",
    "service_calls",
    "content_posts",
    "publish_jobs",
    "channel_accounts",
    "audit_logs"
]

async def check_uuid_status():
    """Check what entity this UUID refers to and its status"""
    print(f"Connecting to database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'localhost'}")
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as db:
            print(f"\n{'='*80}")
            print(f"Checking UUID: {TARGET_UUID}")
            print(f"{'='*80}\n")
            
            found = False
            
            # Check each table
            for table in UUID_TABLES:
                try:
                    # Try to query the table
                    query = text(f"""
                        SELECT * FROM {table} 
                        WHERE id = :uuid
                        LIMIT 1
                    """)
                    
                    result = await db.execute(query, {"uuid": TARGET_UUID})
                    row = result.fetchone()
                    
                    if row:
                        found = True
                        print(f"[FOUND] in table: {table}")
                        print(f"{'─'*80}")
                        
                        # Get column names
                    col_query = text(f"""
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_name = :table_name
                        ORDER BY ordinal_position
                    """)
                    col_result = await db.execute(col_query, {"table_name": table})
                    columns = col_result.fetchall()
                    
                    if row:
                        # Print all column values
                        for col_name, col_type in columns:
                            value = getattr(row, col_name, None)
                            if value is not None:
                                print(f"  {col_name}: {value}")
                        
                        # Special handling for publish_jobs
                        if table == "publish_jobs":
                            print(f"\n[PUBLISH JOB STATUS]")
                            status = getattr(row, 'status', None)
                            error = getattr(row, 'error', None)
                            content_post_id = getattr(row, 'content_post_id', None)
                            
                            print(f"  Status: {status}")
                            print(f"  Error: {error or '(none)'}")
                            print(f"  Content Post ID: {content_post_id}")
                            print(f"  Attempt #: {getattr(row, 'attempt_no', None)}")
                            print(f"  Provider: {getattr(row, 'provider', None)}")
                            print(f"  Method: {getattr(row, 'method', None)}")
                            
                            # Check related content post
                            if content_post_id:
                                post_query = text("""
                                    SELECT id, title, status, last_error, scheduled_for, posted_at
                                    FROM content_posts
                                    WHERE id = :post_id
                                """)
                                post_result = await db.execute(post_query, {"post_id": str(content_post_id)})
                                post_row = post_result.fetchone()
                                if post_row:
                                    print(f"\n  Related Content Post:")
                                    print(f"    Title: {getattr(post_row, 'title', 'N/A')}")
                                    print(f"    Status: {getattr(post_row, 'status', 'N/A')}")
                                    print(f"    Last Error: {getattr(post_row, 'last_error', 'N/A')}")
                                    print(f"    Scheduled For: {getattr(post_row, 'scheduled_for', 'N/A')}")
                                    print(f"    Posted At: {getattr(post_row, 'posted_at', 'N/A')}")
                        
                        # Special handling for content_posts
                        elif table == "content_posts":
                            print(f"\n[CONTENT POST STATUS]")
                            status = getattr(row, 'status', None)
                            error = getattr(row, 'last_error', None)
                            print(f"  Status: {status}")
                            print(f"  Last Error: {error or '(none)'}")
                            print(f"  Scheduled For: {getattr(row, 'scheduled_for', None)}")
                            print(f"  Posted At: {getattr(row, 'posted_at', None)}")
                            
                            # Check related publish jobs
                            jobs_query = text("""
                                SELECT id, status, error, attempt_no, created_at
                                FROM publish_jobs
                                WHERE content_post_id = :post_id
                                ORDER BY created_at DESC
                            """)
                            jobs_result = await db.execute(jobs_query, {"post_id": TARGET_UUID})
                            jobs = jobs_result.fetchall()
                            if jobs:
                                print(f"\n  Related Publish Jobs ({len(jobs)}):")
                                for job in jobs:
                                    print(f"    - Job {getattr(job, 'id', 'N/A')}: {getattr(job, 'status', 'N/A')} (attempt {getattr(job, 'attempt_no', 'N/A')})")
                                    if getattr(job, 'error', None):
                                        print(f"      Error: {getattr(job, 'error', 'N/A')}")
                        
                        # Special handling for jobs
                        elif table == "jobs":
                            print(f"\n[JOB STATUS]")
                            print(f"  Status: {getattr(row, 'status', None)}")
                            print(f"  Community: {getattr(row, 'community', None)}")
                            print(f"  Lot Number: {getattr(row, 'lot_number', None)}")
                            print(f"  Phase: {getattr(row, 'phase', None)}")
                            print(f"  Scheduled Start: {getattr(row, 'scheduled_start', None)}")
                            print(f"  Scheduled End: {getattr(row, 'scheduled_end', None)}")
                        
                        print(f"\n")
                        
                except Exception as e:
                    # Table might not exist or have different structure
                    pass
            
            if not found:
                print(f"[NOT FOUND] UUID {TARGET_UUID} not found in any of the checked tables")
                print(f"\nChecked tables: {', '.join(UUID_TABLES)}")
            
            # Also check audit logs for any references
            print(f"\n{'='*80}")
            print("Checking Audit Logs for references...")
            print(f"{'='*80}\n")
            
            audit_query = text("""
                SELECT entity_type, action, changed_by, changed_at, field, old_value, new_value
                FROM audit_logs
                WHERE entity_id = :uuid
                ORDER BY changed_at DESC
                LIMIT 10
            """)
            audit_result = await db.execute(audit_query, {"uuid": TARGET_UUID})
            audit_rows = audit_result.fetchall()
            
            if audit_rows:
                print(f"Found {len(audit_rows)} audit log entries:\n")
                for audit in audit_rows:
                    print(f"  [{getattr(audit, 'changed_at', 'N/A')}] {getattr(audit, 'entity_type', 'N/A')} - {getattr(audit, 'action', 'N/A')}")
                    print(f"    Changed by: {getattr(audit, 'changed_by', 'N/A')}")
                    if getattr(audit, 'field', None):
                        print(f"    Field: {getattr(audit, 'field', 'N/A')} = {getattr(audit, 'old_value', 'N/A')} -> {getattr(audit, 'new_value', 'N/A')}")
                    print()
            else:
                print("No audit log entries found for this UUID")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_uuid_status())

