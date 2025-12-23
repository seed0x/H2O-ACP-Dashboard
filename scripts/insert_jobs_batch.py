"""
Insert jobs in batches directly to database
"""
import csv
import re
from datetime import datetime
from collections import defaultdict
import json

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

# Builder IDs from database
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
        job_key = (builder.title(), subdivision, lot_number)
        jobs_by_lot[job_key].append({
            'phase': phase,
            'is_complete': is_complete,
            'address': address,
            'city': city,
            'state': state,
            'zip': zip_code,
            'scheduled_start': parse_date(start_date, start_time),
            'scheduled_end': parse_date(end_date, end_time),
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

# Output as JSON for processing
jobs_data = []
for builder, subdivision, lot_number, job_data in jobs_to_import:
    normalized_builder = builder_mapping.get(builder, builder)
    builder_id = builder_ids.get(normalized_builder)
    if not builder_id:
        print(f"WARNING: Builder {normalized_builder} not found in builder_ids")
        continue
    
    job_dict = {
        'builder_id': builder_id,
        'builder_name': normalized_builder,
        'community': subdivision,
        'lot_number': lot_number,
        'phase': job_data['phase'],
        'status': job_data['status'],
        'address_line1': job_data['address'],
        'city': job_data['city'],
        'state': job_data['state'],
        'zip': job_data['zip'],
        'scheduled_start': job_data['scheduled_start'],
        'scheduled_end': job_data['scheduled_end'],
        'notes': job_data['description'],
    }
    jobs_data.append(job_dict)

print(f"Valid jobs with builder IDs: {len(jobs_data)}")
print(f"\nFirst job sample:")
if jobs_data:
    print(json.dumps(jobs_data[0], indent=2))

