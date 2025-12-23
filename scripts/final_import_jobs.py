"""
Final job import - generates SQL for all jobs with proper escaping
"""
import csv
import re
import sys
from datetime import datetime, timedelta
from collections import defaultdict

def parse_subject(subject):
    if not subject:
        return None, None, None, None
    parts = [p.strip() for p in subject.split('-')]
    if len(parts) < 2:
        return None, None, None, None
    builder = parts[0].strip()
    subdivision = parts[1].strip() if len(parts) > 1 else None
    phase = None
    subject_upper = subject.upper()
    if 'WARRANTY' in subject_upper or 'PUNCH' in subject_upper:
        return builder, subdivision, None, None
    elif 'PB' in subject_upper or 'POST AND BEAM' in subject_upper:
        phase = 'Post and Beam'
    elif 'TO' in subject_upper or 'TOP OUT' in subject_upper:
        phase = 'Top Out'
    elif 'TRIM' in subject_upper or 'FINISH' in subject_upper or 'FINAL' in subject_upper:
        phase = 'Trim/Final'
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
    if not location or not location.strip():
        return '', 'Unknown', 'WA', ''
    location = location.strip()
    zip_match = re.search(r'\b(\d{5})\b', location)
    zip_code = zip_match.group(1) if zip_match else ''
    location_clean = re.sub(r'\b\d{5}\b', '', location).strip().rstrip(',').strip()
    wa_cities = ['Vancouver', 'Camas', 'Washougal', 'Ridgefield', 'Battle Ground', 'Portland']
    city = 'Unknown'
    for city_name in wa_cities:
        if city_name.upper() in location_clean.upper():
            city = city_name
            location_clean = re.sub(city_name, '', location_clean, flags=re.IGNORECASE).strip().rstrip(',').strip()
            break
    parts = location_clean.rsplit(',', 1)
    if len(parts) >= 2:
        address = parts[0].strip()
        potential_city = parts[1].strip()
        if city == 'Unknown' and potential_city:
            city = potential_city
    else:
        address = location_clean
    address = address.strip().rstrip(',').strip()
    if address.endswith('WA'):
        address = address[:-2].strip().rstrip(',').strip()
    return address or '', city or 'Unknown', 'WA', zip_code or ''

def parse_date(date_str, time_str=None):
    """Parse date string to datetime string for scheduled_start/end"""
    if not date_str or not date_str.strip():
        return None
    try:
        parts = date_str.strip().split('/')
        if len(parts) == 3:
            month, day, year = int(parts[0]), int(parts[1]), int(parts[2])
            hour = 0
            if time_str and time_str.strip():
                try:
                    time_parts = time_str.strip().split()
                    time_val = time_parts[0]
                    am_pm = time_parts[1].upper() if len(time_parts) > 1 else 'AM'
                    hms = time_val.split(':')
                    hour = int(hms[0])
                    if am_pm == 'PM' and hour != 12:
                        hour += 12
                    elif am_pm == 'AM' and hour == 12:
                        hour = 0
                except:
                    pass
            return f"{year}-{month:02d}-{day:02d} {hour:02d}:00:00+00"
    except:
        pass
    return None

def parse_date_only(date_str):
    """Parse date string to date-only string (YYYY-MM-DD) for completion_date and warranty dates"""
    if not date_str or not date_str.strip():
        return None
    try:
        parts = date_str.strip().split('/')
        if len(parts) == 3:
            month, day, year = int(parts[0]), int(parts[1]), int(parts[2])
            return f"{year}-{month:02d}-{day:02d}"
    except:
        pass
    return None

def add_year_to_date(date_str):
    """Add one year to a date string (YYYY-MM-DD)"""
    if not date_str:
        return None
    try:
        from datetime import datetime, timedelta
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        dt_plus_year = dt + timedelta(days=365)
        return dt_plus_year.strftime('%Y-%m-%d')
    except:
        return None

def escape_sql(text):
    if text is None:
        return 'NULL'
    text_str = str(text)
    return "'" + text_str.replace("'", "''") + "'"

def normalize_builder_name(builder_name):
    """Normalize builder name with case-insensitive matching"""
    if not builder_name:
        return None
    builder_name = builder_name.strip()
    
    # Case-insensitive mapping
    mapping = {
        'toll brothers': 'Toll Brothers',
        'toll brothrs': 'Toll Brothers',
        'tollb': 'Toll Brothers',
        'tollbrothers': 'Toll Brothers',
        'toll brothers=lacamas hills': 'Toll Brothers',
        'songbird': 'Songbird',
        'songb': 'Songbird',
        'dr horton': 'Dr Horton',
        'drh': 'Dr Horton',
        'pulte': 'Pulte',
        'urban nw': 'Urban Nw',
        'urban nw parkers landing': 'Urban Nw',
        'wharton': 'Wharton',
        'bridger': 'Bridger',
        'bridger cabin': 'Bridger',
        'cascadia': 'Cascadia',
        'ferrer': 'Ferrer',
        'jerry nutter': 'Nutter',
        'nutter': 'Nutter',
        'timbercrest': 'Timbercrest',
    }
    
    normalized = mapping.get(builder_name.lower(), builder_name.title())
    return normalized

builder_ids = {
    'Toll Brothers': '2f89a496-2474-419b-a1d9-9afda2a5a32a',
    'Songbird': '0a167b17-6c3b-40ec-9dc1-df97b77c5cf6',
    'Dr Horton': '93315a06-d6d6-42b4-bde5-9e95f1e833b6',
    'Pulte': '7f18cc9d-5dc2-4060-b406-e4d09df27ebc',
    'Urban Nw': '9a504f8c-5ea8-419b-a98d-dc3992cd89d9',
    'Wharton': 'be15c8a7-58d1-42cb-92cf-2316dfd0f3ff',
    'Bridger': 'dcbb8f57-ec98-48ad-8f3d-51570370e350',
    'Cascadia': 'f677b9f0-f120-474f-a8bb-a3423e08d0f6',
    'Ferrer': '320d127d-9446-4397-9be9-36cff3b00506',
    'Nutter': '1a3baa42-5aa2-4cc9-8bb3-6310d86390b6',
    'Timbercrest': 'a1693244-ea23-4d02-8f86-1eec5bf30803',
}

csv_path = r'c:\Users\user1\Documents\h2ojobs.CSV'
jobs_by_lot = defaultdict(list)

print("Parsing CSV...")
with open(csv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        subject = row.get('Subject', '').strip().strip('"')
        if not subject:
            continue
        categories = row.get('Categories', '').strip().strip('"')
        if 'WARRANTY' in categories.upper() or 'WARRANTY' in subject.upper():
            continue
        if 'PUNCH' in categories.upper() or 'PUNCH' in subject.upper():
            continue
        builder, subdivision, phase, lot_number = parse_subject(subject)
        if not builder or not subdivision or not lot_number or not phase:
            continue
        is_complete = 'COMPLETE' in categories.upper()
        location = row.get('Location', '').strip().strip('"')
        description = row.get('Description', '').strip().strip('"')
        start_date = row.get('Start Date', '').strip().strip('"')
        start_time = row.get('Start Time', '').strip().strip('"')
        end_date = row.get('End Date', '').strip().strip('"')
        end_time = row.get('End Time', '').strip().strip('"')
        address, city, state, zip_code = parse_address(location)
        if not zip_code:
            zip_code = '00000'  # Default for missing zip
        # Normalize builder name for consistent key
        normalized_builder_key = normalize_builder_name(builder)
        job_key = (normalized_builder_key, subdivision, lot_number)
        
        # Store the original builder name for later use
        jobs_by_lot[job_key].append({
            'builder_name': normalized_builder_key,  # Store normalized name
            'phase': phase,
            'is_complete': is_complete,
            'address': address,
            'city': city,
            'state': state,
            'zip': zip_code,
            'scheduled_start': parse_date(start_date, start_time),
            'scheduled_end': parse_date(end_date, end_time),
            'end_date': end_date,  # Store raw end_date for completion_date calculation
            'description': description[:500] if description else None,
            'status': 'Completed' if is_complete else 'In Progress',
        })

phase_order = ['Pre-Construction', 'Rough', 'Post and Beam', 'Top Out', 'Trim/Final']
jobs_to_import = []

for (builder, subdivision, lot_number), job_list in jobs_by_lot.items():
    complete_jobs = [j for j in job_list if j['is_complete']]
    incomplete_jobs = [j for j in job_list if not j['is_complete']]
    if complete_jobs:
        complete_jobs.sort(key=lambda j: (
            phase_order.index(j['phase']) if j['phase'] in phase_order else 999
        ), reverse=True)
        jobs_to_import.append((builder, subdivision, lot_number, complete_jobs[0]))
    elif incomplete_jobs:
        incomplete_jobs.sort(key=lambda j: (
            phase_order.index(j['phase']) if j['phase'] in phase_order else 999
        ), reverse=True)
        jobs_to_import.append((builder, subdivision, lot_number, incomplete_jobs[0]))

print(f"Jobs to import: {len(jobs_to_import)}")

# Generate SQL INSERT statements in batches of 50
batch_size = 50
for batch_start in range(0, len(jobs_to_import), batch_size):
    batch_end = min(batch_start + batch_size, len(jobs_to_import))
    batch = jobs_to_import[batch_start:batch_end]
    
    print(f"\n-- Batch {batch_start//batch_size + 1}: Jobs {batch_start+1} to {batch_end}")
    print("INSERT INTO jobs (tenant_id, builder_id, community, lot_number, phase, status, address_line1, city, state, zip, scheduled_start, scheduled_end, notes, completion_date, warranty_start_date, warranty_end_date, created_at, updated_at)")
    print("VALUES")
    
    values = []
    for builder, subdivision, lot_number, job_data in batch:
        # Use normalized builder name from job_data
        normalized_builder = job_data.get('builder_name', normalize_builder_name(builder))
        builder_id = builder_ids.get(normalized_builder)
        if not builder_id:
            print(f"  -- WARNING: Builder ID not found for '{normalized_builder}' (original: '{builder}')", file=sys.stderr)
            continue
        
        scheduled_start_sql = escape_sql(job_data['scheduled_start']) if job_data['scheduled_start'] else 'NULL'
        scheduled_end_sql = escape_sql(job_data['scheduled_end']) if job_data['scheduled_end'] else 'NULL'
        notes_sql = escape_sql(job_data['description']) if job_data['description'] else 'NULL'
        
        # Calculate completion_date and warranty dates for completed jobs
        completion_date_sql = 'NULL'
        warranty_start_sql = 'NULL'
        warranty_end_sql = 'NULL'
        
        if job_data['is_complete'] and job_data['status'] == 'Completed':
            # For completed jobs, use End Date as completion_date
            completion_date = parse_date_only(job_data.get('end_date'))
            if completion_date:
                completion_date_sql = escape_sql(completion_date)
                warranty_start_sql = escape_sql(completion_date)
                warranty_end_date = add_year_to_date(completion_date)
                if warranty_end_date:
                    warranty_end_sql = escape_sql(warranty_end_date)
        
        value = f"  ('all_county', '{builder_id}'::uuid, {escape_sql(subdivision)}, {escape_sql(lot_number)}, {escape_sql(job_data['phase'])}, {escape_sql(job_data['status'])}, {escape_sql(job_data['address'])}, {escape_sql(job_data['city'])}, {escape_sql(job_data['state'])}, {escape_sql(job_data['zip'])}, {scheduled_start_sql}::timestamptz, {scheduled_end_sql}::timestamptz, {notes_sql}, {completion_date_sql}::date, {warranty_start_sql}::date, {warranty_end_sql}::date, now(), now())"
        values.append(value)
    
    print(',\n'.join(values))
    print("ON CONFLICT (builder_id, community, lot_number, phase, tenant_id) DO NOTHING;")
    print()

