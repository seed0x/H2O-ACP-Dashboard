"""
Quick script to run marketing database queries
"""
import asyncio
import os
import sys
from pathlib import Path

# Add apps/api to path
sys.path.insert(0, str(Path(__file__).parent / "apps" / "api"))

from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def run_queries():
    """Run marketing database verification queries"""
    async with AsyncSessionLocal() as db:
        print("=" * 60)
        print("MARKETING DATABASE TRUTH CHECK")
        print("=" * 60)
        
        # Query 1: ChannelAccounts
        print("\n1. ChannelAccounts for tenant 'h2o':")
        result = await db.execute(text("""
            SELECT COUNT(*) as count, tenant_id, status 
            FROM channel_accounts 
            WHERE tenant_id = 'h2o' 
            GROUP BY tenant_id, status
        """))
        rows = result.all()
        if rows:
            for row in rows:
                print(f"   {row.count} accounts with status '{row.status}'")
        else:
            print("   NO CHANNEL ACCOUNTS FOUND")
        
        # Query 2: PostInstances
        print("\n2. PostInstances for tenant 'h2o':")
        result = await db.execute(text("""
            SELECT COUNT(*) as count, status, 
              COUNT(CASE WHEN scheduled_for IS NOT NULL THEN 1 END) as with_scheduled,
              COUNT(CASE WHEN content_item_id IS NOT NULL THEN 1 END) as with_content,
              COUNT(CASE WHEN channel_account_id IS NOT NULL THEN 1 END) as with_account
            FROM post_instances 
            WHERE tenant_id = 'h2o'
            GROUP BY status
        """))
        rows = result.all()
        if rows:
            for row in rows:
                print(f"   Status '{row.status}': {row.count} total, {row.with_scheduled} with scheduled_for, {row.with_content} with content, {row.with_account} with account")
        else:
            print("   NO POST INSTANCES FOUND")
        
        # Query 3: PostInstances with scheduled_for
        print("\n3. PostInstances with scheduled_for IS NOT NULL:")
        result = await db.execute(text("""
            SELECT COUNT(*) as count
            FROM post_instances
            WHERE tenant_id = 'h2o' AND scheduled_for IS NOT NULL
        """))
        count = result.scalar()
        print(f"   {count} PostInstances have scheduled_for")
        
        # Query 4: ContentItems
        print("\n4. ContentItems for tenant 'h2o':")
        result = await db.execute(text("""
            SELECT COUNT(*) as count, status 
            FROM content_items 
            WHERE tenant_id = 'h2o' 
            GROUP BY status
        """))
        rows = result.all()
        if rows:
            for row in rows:
                print(f"   {row.count} items with status '{row.status}'")
        else:
            print("   NO CONTENT ITEMS FOUND")
        
        # Query 5: Orphan PostInstances
        print("\n5. Orphan PostInstances (missing channel_account):")
        result = await db.execute(text("""
            SELECT COUNT(*) as count
            FROM post_instances pi
            LEFT JOIN channel_accounts ca ON pi.channel_account_id = ca.id
            WHERE pi.tenant_id = 'h2o' AND ca.id IS NULL
        """))
        count = result.scalar()
        print(f"   {count} orphaned PostInstances")
        
        # Query 6: PostInstances with null scheduled_for but Scheduled/Planned status
        print("\n6. PostInstances with NULL scheduled_for but Scheduled/Planned status:")
        result = await db.execute(text("""
            SELECT COUNT(*) as count
            FROM post_instances
            WHERE tenant_id = 'h2o' 
              AND scheduled_for IS NULL
              AND status IN ('Scheduled', 'Planned')
        """))
        count = result.scalar()
        print(f"   {count} PostInstances")
        
        print("\n" + "=" * 60)
        print("ANSWERS:")
        print("=" * 60)
        
        # Final answer queries
        result = await db.execute(text("""
            SELECT COUNT(*) as count
            FROM post_instances
            WHERE tenant_id = 'h2o'
        """))
        total_instances = result.scalar()
        
        result = await db.execute(text("""
            SELECT COUNT(*) as count
            FROM post_instances
            WHERE tenant_id = 'h2o' AND scheduled_for IS NOT NULL
        """))
        scheduled_instances = result.scalar()
        
        print(f"\nAre there any PostInstances for tenant h2o? {'YES' if total_instances > 0 else 'NO'} ({total_instances} total)")
        print(f"Do any have scheduled_for IS NOT NULL? {'YES' if scheduled_instances > 0 else 'NO'} ({scheduled_instances} with scheduled_for)")

if __name__ == "__main__":
    try:
        asyncio.run(run_queries())
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

