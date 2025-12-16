"""
One-time historical data migration
Imports all calendar data from DATA folder into database
"""
import asyncio
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.db.session import AsyncSessionLocal, engine
from app.core.outlook_parser import parse_outlook_export
from app import crud


async def main():
    print("="*60)
    print("One-Time Historical Data Migration")
    print("="*60)
    
    # Check DATABASE_URL
    db_url = os.getenv("DATABASE_URL")
    if not db_url or 'localhost' in db_url or 'db:5432' in db_url or 'YOUR_PROJECT' in db_url or 'your-' in db_url.lower():
        print("ERROR: DATABASE_URL not set correctly")
        print("\nYou need your ACTUAL Supabase connection string.")
        print("\nTo get it:")
        print("  1. Go to: https://supabase.com/dashboard")
        print("  2. Select your project")
        print("  3. Go to: Settings > Database")
        print("  4. Scroll to 'Connection string' section")
        print("  5. Select 'URI' tab")
        print("  6. Copy the connection string (looks like:)")
        print("     postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres")
        print("\nThen in PowerShell, run:")
        print('  $env:DATABASE_URL = "postgresql+asyncpg://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"')
        print("\nOr create apps/api/.env file with:")
        print('  DATABASE_URL=postgresql+asyncpg://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres')
        print("\nIMPORTANT: Replace [ref], [password], [region] with your actual values!")
        sys.exit(1)
    
    # Mask password in display
    if '@' in db_url:
        db_display = db_url.split('@')[1]
    else:
        db_display = 'configured'
    print(f"\nDatabase: {db_display}")
    
    # Test connection
    print("\nTesting database connection...")
    try:
        from sqlalchemy import text
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        print("[OK] Connected")
    except Exception as e:
        print(f"ERROR: Database connection failed: {e}")
        sys.exit(1)
    
    # Find data files
    data_folder = Path(__file__).parent.parent.parent / 'DATA'
    
    migrations = [
        (data_folder / 'all county jobs.CSV', 'all_county', 'All County Jobs'),
        (data_folder / 'H2o_Service Calendar.ics', 'h2o', 'H2O Service Calls')
    ]
    
    total_created = 0
    total_errors = 0
    
    for file_path, tenant_id, name in migrations:
        print(f"\n{'-'*60}")
        print(f"Processing: {name}")
        print(f"File: {file_path.name}")
        
        if not file_path.exists():
            print(f"SKIP: File not found")
            continue
        
        # Parse
        try:
            events = parse_outlook_export(str(file_path))
            print(f"Parsed: {len(events)} events")
        except Exception as e:
            print(f"ERROR: Parse failed: {e}")
            total_errors += 1
            continue
        
        if not events:
            print("SKIP: No events found")
            continue
        
        # Import
        try:
            async with AsyncSessionLocal() as db:
                # Import jobs
                job_stats = await crud.bulk_import_jobs(db, events, tenant_id, "migration", True)
                print(f"Jobs: {job_stats['created']} created, {job_stats['skipped']} skipped, {job_stats['errors']} errors")
                if job_stats['errors'] > 0 and job_stats['error_details']:
                    print(f"  Sample errors:")
                    for err in job_stats['error_details'][:3]:
                        print(f"    - {err.get('title', 'Unknown')[:60]}: {err.get('reason', 'Unknown error')}")
                
                # Import service calls
                sc_stats = await crud.bulk_import_service_calls(db, events, tenant_id, "migration", True)
                print(f"Service Calls: {sc_stats['created']} created, {sc_stats['skipped']} skipped, {sc_stats['errors']} errors")
                if sc_stats['errors'] > 0 and sc_stats['error_details']:
                    print(f"  Sample errors:")
                    for err in sc_stats['error_details'][:3]:
                        print(f"    - {err.get('title', 'Unknown')[:60]}: {err.get('reason', 'Unknown error')}")
                
                # Final commit (bulk_import functions handle their own commits)
                
                created = job_stats['created'] + sc_stats['created']
                errors = job_stats['errors'] + sc_stats['errors']
                
                total_created += created
                total_errors += errors
        except Exception as e:
            print(f"ERROR: Import failed: {e}")
            import traceback
            traceback.print_exc()
            total_errors += len(events)
    
    # Summary
    print("\n" + "="*60)
    print("MIGRATION COMPLETE")
    print("="*60)
    print(f"Total records created: {total_created}")
    print(f"Total errors: {total_errors}")
    print("="*60)
    
    return 0 if total_errors == 0 else 1


if __name__ == '__main__':
    try:
        sys.exit(asyncio.run(main()))
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

