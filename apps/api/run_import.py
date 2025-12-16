"""Just import the data - uses DATABASE_URL from environment"""
import asyncio
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.db.session import AsyncSessionLocal, engine
from app.core.outlook_parser import parse_outlook_export
from app import crud

async def main():
    # Check database connection
    try:
        async with engine.begin() as conn:
            await conn.execute("SELECT 1")
    except Exception as e:
        print(f"Database error: {e}")
        print(f"DATABASE_URL: {os.getenv('DATABASE_URL', 'NOT SET')[:50]}...")
        sys.exit(1)
    
    # Get files
    data_folder = Path(__file__).parent.parent.parent / 'DATA'
    
    total = 0
    for file_path, tenant_id in [
        (data_folder / 'all county jobs.CSV', 'all_county'),
        (data_folder / 'H2o_Service Calendar.ics', 'h2o')
    ]:
        if not file_path.exists():
            print(f"SKIP: {file_path.name} not found")
            continue
        
        print(f"Processing {file_path.name}...")
        events = parse_outlook_export(str(file_path))
        print(f"  Parsed {len(events)} events")
        
        async with AsyncSessionLocal() as db:
            jobs = await crud.bulk_import_jobs(db, events, tenant_id, "system", True)
            calls = await crud.bulk_import_service_calls(db, events, tenant_id, "system", True)
            created = jobs['created'] + calls['created']
            total += created
            print(f"  Created: {created} records")
    
    print(f"\nDONE: {total} total records imported")

if __name__ == '__main__':
    asyncio.run(main())

