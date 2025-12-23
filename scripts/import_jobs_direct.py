"""
Import All County Jobs from CSV - Direct SQL insertion
"""
import csv
import re
from datetime import datetime
from collections import defaultdict

def parse_subject(subject):
    """Parse BUILDER-SUBDIVISION-PHASE-LOT"""
    if not subject:
        return None, None, None, None
    
    parts = [p.strip() for p in subject.split('-')]
    if len(parts) < 2:
        return None, None, None, None
    
    builder = parts[0].strip()
    subdivision = parts[1].strip() if len(parts) > 1 else None
    
    # Find phase
    phase = None
    subject_upper = subject.upper()
    if 'WARRANTY' in subject_upper:
        return builder, subdivision, None, None  # Skip warranty for now
    elif 'PUNCH' in subject_upper:
        return builder, subdivision, None, None  # Skip punchlist for now
    elif 'PB' in subject_upper or 'POST AND BEAM' in subject_upper:
        phase = 'Post and Beam'
    elif 'TO' in subject_upper or 'TOP OUT' in subject_upper:
        phase = 'Top Out'
    elif 'TRIM' in subject_upper or 'FINISH' in subject_upper or 'FINAL' in subject_upper:
        phase = 'Trim/Final'
    
    # Find lot number
    lot_number = None
    lot_match = re.search(r'LOT\s*(\d+)', subject_upper)
    if lot_match:
        lot_number = lot_match.group(1)
    else:
        for part in reversed(parts):
            if part.isdigit():
                lot_number = part
                break
    
    return builder, subdivision, phase, lot_number

def parse_address(location):
    """Parse address"""
    if not location or not location.strip():
        return None, None, 'WA', None
    
    location = location.strip()
    parts = location.rsplit(',', 2)
    
    if len(parts) >= 2:
        address = parts[0].strip()
        city = parts[1].strip() if len(parts) > 1 else 'Unknown'
        state_zip = parts[2].strip() if len(parts) > 2 else None
        
        state = 'WA'
        zip_code = None
        if state_zip:
            sz_parts = state_zip.split()
            if len(sz_parts) >= 2:
                state = sz_parts[0]
                zip_code = sz_parts[1]
            elif sz_parts and sz_parts[0].isdigit():
                zip_code = sz_parts[0]
    else:
        address = location
        city = 'Unknown'
        state = 'WA'
        zip_code = None
        zip_match = re.search(r'\b(\d{5})\b', location)
        if zip_match:
            zip_code = zip_match.group(1)
    
    return address, city, state, zip_code

def parse_date(date_str, time_str=None):
    """Parse M/D/YYYY"""
    if not date_str or not date_str.strip():
        return None
    
    try:
        parts = date_str.strip().split('/')
        if len(parts) == 3:
            month, day, year = int(parts[0]), int(parts[1]), int(parts[2])
            hour = 0
            minute = 0
            if time_str and time_str.strip():
                try:
                    time_parts = time_str.strip().split()
                    time_val = time_parts[0]
                    am_pm = time_parts[1].upper() if len(time_parts) > 1 else 'AM'
                    hms = time_val.split(':')
                    hour = int(hms[0])
                    minute = int(hms[1]) if len(hms) > 1 else 0
                    if am_pm == 'PM' and hour != 12:
                        hour += 12
                    elif am_pm == 'AM' and hour == 12:
                        hour = 0
                except:
                    pass
            return datetime(year, month, day, hour, minute).isoformat()
    except:
        pass
    return None

# Read CSV
csv_path = r'c:\Users\user1\Documents\h2ojobs.CSV'
jobs_by_lot = defaultdict(list)
builders_set = set()

with open(csv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        subject = row.get('Subject', '').strip().strip('"')
        if not subject:
            continue
        
        categories = row.get('Categories', '').strip().strip('"')
        
        # Skip warranty/punchlist for now
        if 'WARRANTY' in categories.upper() or 'WARRANTY' in subject.upper():
            continue
        if 'PUNCH' in categories.upper() or 'PUNCH' in subject.upper():
            continue
        
        builder, subdivision, phase, lot_number = parse_subject(subject)
        
        if not builder or not subdivision or not lot_number or not phase:
            continue
        
        builders_set.add(builder.title())
        
        is_complete = 'COMPLETE' in categories.upper()
        location = row.get('Location', '').strip().strip('"')
        description = row.get('Description', '').strip().strip('"')
        start_date = row.get('Start Date', '').strip().strip('"')
        start_time = row.get('Start Time', '').strip().strip('"')
        end_date = row.get('End Date', '').strip().strip('"')
        end_time = row.get('End Time', '').strip().strip('"')
        
        address, city, state, zip_code = parse_address(location)
        
        job_key = (builder.title(), subdivision, lot_number)
        jobs_by_lot[job_key].append({
            'phase': phase,
            'is_complete': is_complete,
            'address': address or '',
            'city': city or 'Unknown',
            'state': state or 'WA',
            'zip': zip_code or '',
            'scheduled_start': parse_date(start_date, start_time),
            'scheduled_end': parse_date(end_date, end_time),
            'description': description,
            'status': 'Completed' if is_complete else 'In Progress',
        })

print(f"Found {len(builders_set)} builders")
print(f"Found {len(jobs_by_lot)} unique lots")
print("\nBuilders:", sorted(builders_set)[:20])

# Now process jobs - handle duplicates
phase_order = ['Pre-Construction', 'Rough', 'Post and Beam', 'Top Out', 'Trim/Final']
jobs_to_import = []

for (builder, subdivision, lot_number), job_list in jobs_by_lot.items():
    complete_jobs = [j for j in job_list if j['is_complete']]
    incomplete_jobs = [j for j in job_list if not j['is_complete']]
    
    if complete_jobs:
        # Sort by phase order, take latest
        complete_jobs.sort(key=lambda j: (
            phase_order.index(j['phase']) if j['phase'] in phase_order else 999
        ), reverse=True)
        jobs_to_import.append((builder, subdivision, lot_number, complete_jobs[0]))
    elif incomplete_jobs:
        # Take latest phase
        incomplete_jobs.sort(key=lambda j: (
            phase_order.index(j['phase']) if j['phase'] in phase_order else 999
        ), reverse=True)
        jobs_to_import.append((builder, subdivision, lot_number, incomplete_jobs[0]))

print(f"\nJobs to import: {len(jobs_to_import)}")

# Build builder name mapping (normalize variations)
builder_mapping = {
    'Toll Brothers': 'Toll Brothers',
    'Toll Brothrs': 'Toll Brothers',
    'Tollb': 'Toll Brothers',
    'Tollbrothers': 'Toll Brothers',
    'Toll Brothers=Lacamas Hills': 'Toll Brothers',
    'Songbird': 'Songbird',
    'Songb': 'Songbird',
    'Dr Horton': 'Dr Horton',
    'Drh': 'Dr Horton',
    'Pulte': 'Pulte',
    'Urban Nw': 'Urban Nw',
    'Urban Nw Parkers Landing': 'Urban Nw',
    'Wharton': 'Wharton',
    'Bridger': 'Bridger',
    'Bridger Cabin': 'Bridger',
    'Cascadia': 'Cascadia',
    'Ferrer': 'Ferrer',
    'Jerry Nutter': 'Nutter',
    'Nutter': 'Nutter',
    'Timbercrest': 'Timbercrest',
}

# Generate SQL for first 10 jobs as a test
print("\nFirst 10 jobs to import:")
for i, (builder, subdivision, lot_number, job_data) in enumerate(jobs_to_import[:10]):
    normalized_builder = builder_mapping.get(builder, builder)
    print(f"{i+1}. {normalized_builder} - {subdivision} - Lot {lot_number} - {job_data['phase']} - {job_data['status']}")

# Now let's prepare all jobs for insertion
print("\nPreparing SQL inserts...")

