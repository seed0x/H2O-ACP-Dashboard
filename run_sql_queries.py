#!/usr/bin/env python3
"""
Run SQL queries from Section 4 of the audit document
"""
import os
import sys
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Get DATABASE_URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

# Convert to sync URL for psycopg if needed
if DATABASE_URL.startswith('postgresql+asyncpg://'):
    sync_url = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://', 1)
else:
    sync_url = DATABASE_URL

async def run_queries():
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    async with engine.connect() as conn:
        print("=" * 60)
        print("SQL Query Results - Section 4")
        print("=" * 60)
        print()
        
        # Query 1: Check ChannelAccounts
        print("Query 1: ChannelAccounts for tenant 'h2o'")
        print("-" * 60)
        result = await conn.execute(text("""
            SELECT COUNT(*) as count, tenant_id, status 
            FROM channel_accounts 
            WHERE tenant_id = 'h2o' 
            GROUP BY tenant_id, status;
        """))
        rows = result.fetchall()
        if rows:
            for row in rows:
                print(f"  Count: {row[0]}, Tenant: {row[1]}, Status: {row[2]}")
        else:
            print("  No results")
        print()
        
        # Query 2: Check PostInstances
        print("Query 2: PostInstances for tenant 'h2o'")
        print("-" * 60)
        result = await conn.execute(text("""
            SELECT COUNT(*) as count, status, 
              COUNT(CASE WHEN scheduled_for IS NOT NULL THEN 1 END) as with_scheduled,
              COUNT(CASE WHEN content_item_id IS NOT NULL THEN 1 END) as with_content,
              COUNT(CASE WHEN channel_account_id IS NOT NULL THEN 1 END) as with_account
            FROM post_instances 
            WHERE tenant_id = 'h2o'
            GROUP BY status;
        """))
        rows = result.fetchall()
        if rows:
            for row in rows:
                print(f"  Status: {row[1]}, Total: {row[0]}, With scheduled_for: {row[2]}, With content: {row[3]}, With account: {row[4]}")
        else:
            print("  No results")
        print()
        
        # Query 3: Check ContentItems
        print("Query 3: ContentItems for tenant 'h2o'")
        print("-" * 60)
        result = await conn.execute(text("""
            SELECT COUNT(*) as count, status 
            FROM content_items 
            WHERE tenant_id = 'h2o' 
            GROUP BY status;
        """))
        rows = result.fetchall()
        if rows:
            for row in rows:
                print(f"  Count: {row[0]}, Status: {row[1]}")
        else:
            print("  No results")
        print()
        
        # Query 4: Check for orphan PostInstances
        print("Query 4: Orphan PostInstances (missing channel_account)")
        print("-" * 60)
        result = await conn.execute(text("""
            SELECT pi.id, pi.tenant_id, pi.channel_account_id
            FROM post_instances pi
            LEFT JOIN channel_accounts ca ON pi.channel_account_id = ca.id
            WHERE pi.tenant_id = 'h2o' AND ca.id IS NULL;
        """))
        rows = result.fetchall()
        if rows:
            print(f"  Found {len(rows)} orphaned PostInstances:")
            for row in rows:
                print(f"    ID: {row[0]}, Tenant: {row[1]}, Channel Account ID: {row[2]}")
        else:
            print("  No orphaned PostInstances")
        print()
        
        # Query 5: Check for PostInstances with null scheduled_for
        print("Query 5: PostInstances with null scheduled_for (Scheduled/Planned status)")
        print("-" * 60)
        result = await conn.execute(text("""
            SELECT COUNT(*) as count
            FROM post_instances
            WHERE tenant_id = 'h2o' 
              AND scheduled_for IS NULL
              AND status IN ('Scheduled', 'Planned');
        """))
        row = result.fetchone()
        print(f"  Count: {row[0]}")
        print()
        
        # Additional: Check if ANY PostInstances exist for h2o
        print("Query 6: Any PostInstances for tenant 'h2o'?")
        print("-" * 60)
        result = await conn.execute(text("""
            SELECT COUNT(*) as count
            FROM post_instances
            WHERE tenant_id = 'h2o';
        """))
        row = result.fetchone()
        total_count = row[0]
        print(f"  Total PostInstances for h2o: {total_count}")
        print()
        
        # Additional: Check if ANY have scheduled_for IS NOT NULL
        print("Query 7: PostInstances with scheduled_for IS NOT NULL")
        print("-" * 60)
        result = await conn.execute(text("""
            SELECT COUNT(*) as count
            FROM post_instances
            WHERE tenant_id = 'h2o' 
              AND scheduled_for IS NOT NULL;
        """))
        row = result.fetchone()
        scheduled_count = row[0]
        print(f"  PostInstances with scheduled_for: {scheduled_count}")
        print()
        
        print("=" * 60)
        print("ANSWERS:")
        print("=" * 60)
        print(f"Are there any PostInstances for tenant h2o? {'YES' if total_count > 0 else 'NO'} ({total_count})")
        print(f"Do any have scheduled_for IS NOT NULL? {'YES' if scheduled_count > 0 else 'NO'} ({scheduled_count})")
        print("=" * 60)
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_queries())

