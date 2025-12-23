"""
Import All County Jobs from Outlook CSV export

Parses CSV with format:
- Subject: "BUILDER-SUBDIVISION-PHASE-LOT" (e.g., "TOLL BROTHERS-LACAMAS HILLS-TO-LOT 102")
- Categories (column O): Tags like "COMPLETE", "WARRANTY", "Punch List"
- Location (column Q): Address
- Description (column P): Notes

Rules:
- If same lot has multiple phases but one is COMPLETE, only import the COMPLETE one
- Flow: groundwork -> PB (Post and Beam) -> TO (Top Out) -> Trim/Final
- WARRANTY and Punch List entries are tasks, not regular jobs
"""
import asyncio
import csv
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from uuid import UUID
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'api'))

from app.db.session import AsyncSessionLocal
from app.models import Builder, Job, JobTask
from app import schemas
from app import crud
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

PHASE_MAPPING = {
    'PB': 'Post and Beam',
    'POST AND BEAM': 'Post and Beam',
    'TO': 'Top Out',
    'TOP OUT': 'Top Out',
    'TRIM': 'Trim/Final',
    'FINISH': 'Trim/Final',
    'FINAL': 'Trim/Final',
}

PHASE_ORDER = ['Pre-Construction', 'Rough', 'Post and Beam', 'Top Out', 'Trim/Final']  # Order for completion priority


async def get_or_create_builder(db: AsyncSession, builder_name: str) -> Builder:
    """Get or create a builder by name"""
    # Normalize builder name
    builder_name = builder_name.strip().title()
    
    result = await db.execute(
        select(Builder).where(Builder.name == builder_name)
    )
    builder = result.scalar_one_or_none()
    
    if not builder:
        builder = Builder(name=builder_name)
        db.add(builder)
        await db.flush()
        print(f"Created builder: {builder_name}")
    else:
        print(f"Found builder: {builder_name}")
    
    return builder


def parse_subject(subject: str) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """Parse subject line: BUILDER-SUBDIVISION-PHASE-LOT"""
    if not subject:
        return None, None, None, None
    
    # Split by hyphen
    parts = [p.strip() for p in subject.split('-')]
    
    if len(parts) < 2:
        return None, None, None, None
    
    builder = parts[0]
    subdivision = parts[1] if len(parts) > 1 else None
    
    # Find phase and lot number
    phase = None
    lot_number = None
    
    # Look for phase in remaining parts or in the text
    phase_keywords = {
        'PB': ['PB', 'POST AND BEAM', 'POST & BEAM'],
        'TO': ['TO', 'TOP OUT', 'TOP-OUT'],
        'TRIM': ['TRIM', 'FINISH', 'FINAL'],
        'WARRANTY': ['WARRANTY'],
        'PUNCHLIST': ['PUNCHLIST', 'PUNCH LIST', 'PUNCH-LIST'],
        'ROUGH': ['ROUGH', 'GROUNDWORK'],
    }
    
    subject_upper = subject.upper()
    
    # Check for warranty/punchlist first (special cases)
    if 'WARRANTY' in subject_upper:
        phase = 'Warranty'
    elif 'PUNCHLIST' in subject_upper or 'PUNCH LIST' in subject_upper or 'PUNCH-LIST' in subject_upper:
        phase = 'Punch List'
    else:
        # Look for phase keywords
        for phase_type, keywords in phase_keywords.items():
            for keyword in keywords:
                if keyword in subject_upper:
                    phase = PHASE_MAPPING.get(phase_type, phase_type)
                    break
            if phase:
                break
        
        # If no phase found, check parts
        if not phase and len(parts) > 2:
            phase_part = parts[2].upper()
            if phase_part in PHASE_MAPPING:
                phase = PHASE_MAPPING[phase_part]
            elif 'PB' in phase_part:
                phase = 'Post and Beam'
            elif 'TO' in phase_part:
                phase = 'Top Out'
            elif 'TRIM' in phase_part or 'FINISH' in phase_part:
                phase = 'Trim/Final'
    
    # Find lot number - look for "LOT 123" or just "123" at the end
    lot_match = re.search(r'LOT\s*(\d+)', subject_upper)
    if lot_match:
        lot_number = lot_match.group(1)
    else:
        # Try to find number at the end
        for part in reversed(parts):
            if part.isdigit():
                lot_number = part
                break
            # Check if part contains a number
            num_match = re.search(r'(\d+)', part)
            if num_match:
                lot_number = num_match.group(1)
                break
    
    return builder, subdivision, phase, lot_number


def parse_address(location: str) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """Parse address from location string"""
    if not location or not location.strip():
        return None, None, None, None
    
    location = location.strip()
    
    # Try to parse: "123 MAIN ST CITY WA 98607"
    # Common pattern: address, city, state zip
    parts = location.rsplit(',', 2)
    
    if len(parts) >= 2:
        address_line1 = parts[0].strip()
        city = parts[1].strip() if len(parts) > 1 else None
        state_zip = parts[2].strip() if len(parts) > 2 else None
        
        # Parse state and zip from last part
        state = 'WA'  # Default
        zip_code = None
        
        if state_zip:
            state_zip_parts = state_zip.split()
            if len(state_zip_parts) >= 2:
                state = state_zip_parts[0]
                zip_code = state_zip_parts[1]
            elif state_zip_parts[0].isdigit():
                zip_code = state_zip_parts[0]
        else:
            # Try to extract from city part
            city_parts = city.split() if city else []
            if city_parts and city_parts[-1].isdigit() and len(city_parts[-1]) == 5:
                zip_code = city_parts[-1]
                city = ' '.join(city_parts[:-1])
            elif city_parts and len(city_parts) >= 2 and city_parts[-1].upper() == 'WA':
                state = city_parts[-1]
                city = ' '.join(city_parts[:-1])
    else:
        # Single string - try to extract zip
        address_line1 = location
        city = None
        state = 'WA'
        zip_code = None
        
        # Look for zip code at end
        zip_match = re.search(r'\b(\d{5})\b', location)
        if zip_match:
            zip_code = zip_match.group(1)
            address_line1 = location[:zip_match.start()].strip().rstrip(',').strip()
        
        # Look for city (text before zip)
        if zip_code:
            remaining = location[:zip_match.start()].strip().rstrip(',').strip()
            # Last word before zip might be city
            remaining_parts = remaining.split()
            if len(remaining_parts) > 1:
                city = remaining_parts[-1]
                address_line1 = ' '.join(remaining_parts[:-1])
    
    return address_line1, city, state, zip_code


def parse_date(date_str: str, time_str: Optional[str] = None) -> Optional[datetime]:
    """Parse date from M/D/YYYY format"""
    if not date_str or not date_str.strip():
        return None
    
    try:
        # Parse date: "4/11/2025"
        date_parts = date_str.strip().split('/')
        if len(date_parts) == 3:
            month, day, year = int(date_parts[0]), int(date_parts[1]), int(date_parts[2])
            
            # Parse time if provided
            hour = 0
            minute = 0
            if time_str and time_str.strip():
                try:
                    # Parse "9:00:00 AM"
                    time_parts = time_str.strip().split()
                    time_val = time_parts[0]
                    am_pm = time_parts[1].upper() if len(time_parts) > 1 else 'AM'
                    
                    time_hms = time_val.split(':')
                    hour = int(time_hms[0])
                    minute = int(time_hms[1]) if len(time_hms) > 1 else 0
                    
                    if am_pm == 'PM' and hour != 12:
                        hour += 12
                    elif am_pm == 'AM' and hour == 12:
                        hour = 0
                except:
                    pass
            
            return datetime(year, month, day, hour, minute)
    except:
        pass
    
    return None


async def import_jobs(csv_path: str):
    """Import jobs from CSV file"""
    async with AsyncSessionLocal() as db:
        # Read and parse CSV
        jobs_by_lot: Dict[Tuple[str, str, str], List[Dict]] = {}  # (builder, subdivision, lot) -> list of job data
        warranty_tasks: List[Dict] = []
        punchlist_tasks: List[Dict] = []
        
        with open(csv_path, 'r', encoding='utf-8-sig') as f:  # utf-8-sig handles BOM
            reader = csv.DictReader(f)
            
            # Normalize column names (remove quotes and BOM)
            normalized_headers = {}
            for key in reader.fieldnames:
                normalized = key.strip().strip('"').replace('\ufeff', '')
                normalized_headers[key] = normalized
            
            row_count = 0
            for row in reader:
                row_count += 1
                # Get values with normalized keys
                subject = row.get('Subject', row.get('\ufeff"Subject"', '')).strip().strip('"')
                categories = row.get('Categories', '').strip().strip('"')
                location = row.get('Location', '').strip().strip('"')
                description = row.get('Description', '').strip().strip('"')
                start_date = row.get('Start Date', '').strip().strip('"')
                start_time = row.get('Start Time', '').strip().strip('"')
                end_date = row.get('End Date', '').strip().strip('"')
                end_time = row.get('End Time', '').strip().strip('"')
                
                # Skip empty rows
                if not subject:
                    continue
                
                # Parse subject
                builder_name, subdivision, phase, lot_number = parse_subject(subject)
                
                if not builder_name:
                    if row_count <= 10:  # Debug first few rows
                        print(f"Row {row_count}: Could not parse builder from subject: {subject[:80]}")
                    continue
                
                # Check if warranty or punchlist
                is_warranty = 'WARRANTY' in categories.upper() or 'WARRANTY' in subject.upper()
                is_punchlist = 'PUNCH' in categories.upper() or 'PUNCH' in subject.upper()
                
                if is_warranty or is_punchlist:
                    # These are tasks, not jobs
                    task_data = {
                        'builder': builder_name,
                        'subdivision': subdivision,
                        'lot_number': lot_number,
                        'phase': phase or 'Warranty' if is_warranty else 'Punch List',
                        'subject': subject,
                        'location': location,
                        'description': description,
                        'start_date': start_date,
                        'start_time': start_time,
                        'end_date': end_date,
                        'end_time': end_time,
                        'categories': categories,
                        'is_warranty': is_warranty,
                    }
                    
                    if is_warranty:
                        warranty_tasks.append(task_data)
                    else:
                        punchlist_tasks.append(task_data)
                    continue
                
                # Skip if no subdivision or lot number
                if not subdivision or not lot_number:
                    continue
                
                # Parse address
                address_line1, city, state, zip_code = parse_address(location)
                
                # Parse dates
                scheduled_start = parse_date(start_date, start_time)
                scheduled_end = parse_date(end_date, end_time)
                
                # Determine status
                is_complete = 'COMPLETE' in categories.upper()
                status = 'Completed' if is_complete else 'In Progress'
                
                # Normalize phase
                if phase:
                    phase = PHASE_MAPPING.get(phase.upper(), phase)
                else:
                    phase = 'Pre-Construction'  # Default
                
                job_key = (builder_name, subdivision, lot_number)
                
                if job_key not in jobs_by_lot:
                    jobs_by_lot[job_key] = []
                
                jobs_by_lot[job_key].append({
                    'builder': builder_name,
                    'subdivision': subdivision,
                    'lot_number': lot_number,
                    'phase': phase,
                    'status': status,
                    'is_complete': is_complete,
                    'address_line1': address_line1 or '',
                    'city': city or 'Unknown',
                    'state': state or 'WA',
                    'zip': zip_code or '',
                    'scheduled_start': scheduled_start,
                    'scheduled_end': scheduled_end,
                    'description': description,
                    'categories': categories,
                })
        
        # Process jobs - handle duplicates by prioritizing COMPLETE entries
        jobs_to_import: List[Dict] = []
        
        for (builder_name, subdivision, lot_number), job_list in jobs_by_lot.items():
            # Sort by completion status and phase order
            complete_jobs = [j for j in job_list if j['is_complete']]
            incomplete_jobs = [j for j in job_list if not j['is_complete']]
            
            if complete_jobs:
                # If there are complete jobs, only import the one with the latest phase
                complete_jobs.sort(key=lambda j: (
                    PHASE_ORDER.index(j['phase']) if j['phase'] in PHASE_ORDER else 999
                ), reverse=True)
                jobs_to_import.append(complete_jobs[0])
            else:
                # If no complete jobs, import all (they're different phases)
                # But prefer later phases
                incomplete_jobs.sort(key=lambda j: (
                    PHASE_ORDER.index(j['phase']) if j['phase'] in PHASE_ORDER else 999
                ), reverse=True)
                # Only import the latest phase if there are multiple
                if incomplete_jobs:
                    jobs_to_import.append(incomplete_jobs[0])
        
        print(f"\nFound {len(jobs_to_import)} jobs to import")
        print(f"Found {len(warranty_tasks)} warranty tasks")
        print(f"Found {len(punchlist_tasks)} punchlist tasks\n")
        
        # Import jobs
        created_count = 0
        skipped_count = 0
        
        for job_data in jobs_to_import:
            try:
                # Get or create builder
                builder = await get_or_create_builder(db, job_data['builder'])
                await db.flush()
                
                # Create job
                job_create = schemas.JobCreate(
                    tenant_id='all_county',
                    builder_id=builder.id,
                    community=job_data['subdivision'],
                    lot_number=job_data['lot_number'],
                    phase=job_data['phase'],
                    status=job_data['status'],
                    address_line1=job_data['address_line1'],
                    city=job_data['city'],
                    state=job_data['state'],
                    zip=job_data['zip'],
                    scheduled_start=job_data['scheduled_start'],
                    scheduled_end=job_data['scheduled_end'],
                    notes=job_data['description'],
                )
                
                # Check if job already exists
                existing = await db.execute(
                    select(Job).where(
                        Job.tenant_id == 'all_county',
                        Job.builder_id == builder.id,
                        Job.community == job_data['subdivision'],
                        Job.lot_number == job_data['lot_number'],
                        Job.phase == job_data['phase'],
                    )
                )
                
                if existing.scalar_one_or_none():
                    skipped_count += 1
                    continue
                
                job = await crud.create_job(db, job_create, changed_by='csv_import', commit=False)
                created_count += 1
                
                if created_count % 50 == 0:
                    await db.commit()
                    print(f"Imported {created_count} jobs...")
                
            except Exception as e:
                print(f"Error importing job {job_data['builder']}-{job_data['subdivision']}-{job_data['lot_number']}: {e}")
                await db.rollback()
                continue
        
        await db.commit()
        
        print(f"\nImport complete!")
        print(f"Created: {created_count} jobs")
        print(f"Skipped (duplicates): {skipped_count} jobs")
        print(f"Warranty tasks: {len(warranty_tasks)} (not imported as jobs)")
        print(f"Punchlist tasks: {len(punchlist_tasks)} (not imported as jobs)")


if __name__ == '__main__':
    csv_path = r'c:\Users\user1\Documents\h2ojobs.CSV'
    asyncio.run(import_jobs(csv_path))

