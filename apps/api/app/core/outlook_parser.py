"""
Outlook Calendar Parser
Parses Outlook calendar exports (CSV/ICS) and extracts job/service call information
"""
import re
import csv
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import icalendar
from io import StringIO


@dataclass
class ParsedCalendarEvent:
    """Parsed calendar event with extracted job information"""
    title: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    description: Optional[str]
    location: Optional[str]
    # Extracted fields
    builder_name: Optional[str] = None
    community: Optional[str] = None
    lot_number: Optional[str] = None
    phase: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    job_type: Optional[str] = None  # 'job', 'service_call', 'warranty', 'go_back'
    status: Optional[str] = None
    notes: Optional[str] = None


class OutlookParser:
    """Parser for Outlook calendar exports"""
    
    # Common builder name patterns (case-insensitive)
    BUILDER_PATTERNS = [
        r'TOLL\s+BROTHERS',
        r'DR\s+HORTON',
        r'DRH',
        r'PULTE',
        r'NORTHWYND',
        r'WHARTON',
        r'CLEVJ',
        r'SONGBIRD',
        r'URBAN\s+NW',
    ]
    
    # Phase abbreviations
    # TO = Top Out / Rough In
    # PB = Post & Beam
    # TRIM = Finish
    PHASE_PATTERNS = {
        'TO': ['TO', 'TOP OUT', 'TOP-OUT', 'TOPOUT', 'ROUGH IN', 'ROUGH-IN', 'ROUGHIN', 'ROUGH'],
        'PB': ['PB', 'POST AND BEAM', 'POST & BEAM', 'POST&BEAM', 'POST AND BEAM'],
        'TRIM': ['TRIM', 'FINISH'],
        'SCT': ['SCT', 'ROUGH', 'ROUGH-IN'],
        'WARRANTY': ['WARRANTY', 'WARR'],
        'GO BACK': ['GO BACK', 'GOBACK', 'GB'],
        'PAY CALL': ['PAY CALL', 'PAYCALL'],
        'PUNCH': ['PUNCH', 'PUNCHLIST', 'PUNCH-LIST', 'PUNCH LIST'],
    }
    
    # Job type indicators
    JOB_TYPE_INDICATORS = {
        'warranty': ['WARRANTY', 'WARR'],
        'go_back': ['GO BACK', 'GOBACK', 'GB'],
        'service_call': ['SERVICE', 'CALL'],
        'job': ['TO', 'PB', 'SCT', 'ROUGH', 'PUNCH'],
    }
    
    def __init__(self):
        self.builder_cache: Dict[str, str] = {}
    
    def parse_csv(self, csv_content: str) -> List[ParsedCalendarEvent]:
        """Parse Outlook CSV export"""
        events = []
        reader = csv.DictReader(StringIO(csv_content))
        
        for row in reader:
            # Outlook CSV typically has: Subject, Start Date, Start Time, End Date, End Time, etc.
            title = row.get('Subject', '') or row.get('Title', '')
            start_date = row.get('Start Date', '') or row.get('Start', '')
            start_time = row.get('Start Time', '')
            end_date = row.get('End Date', '') or row.get('End', '')
            end_time = row.get('End Time', '')
            location = row.get('Location', '')
            description = row.get('Description', '') or row.get('Body', '')
            
            # Parse dates
            start_dt = self._parse_datetime(start_date, start_time)
            end_dt = self._parse_datetime(end_date, end_time)
            
            event = ParsedCalendarEvent(
                title=title,
                start_time=start_dt,
                end_time=end_dt,
                description=description,
                location=location
            )
            
            # Extract job information
            self._extract_job_info(event)
            events.append(event)
        
        return events
    
    def parse_ics(self, ics_content: str) -> List[ParsedCalendarEvent]:
        """Parse ICS/iCalendar file"""
        events = []
        calendar = icalendar.Calendar.from_ical(ics_content)
        
        for component in calendar.walk():
            if component.name == 'VEVENT':
                title = str(component.get('summary', ''))
                start_dt = component.get('dtstart')
                end_dt = component.get('dtend')
                location = str(component.get('location', ''))
                description = str(component.get('description', ''))
                
                start_datetime = None
                end_datetime = None
                
                if start_dt:
                    dt = start_dt.dt
                    if isinstance(dt, datetime):
                        start_datetime = dt
                    elif hasattr(dt, 'date'):
                        start_datetime = datetime.combine(dt.date(), datetime.min.time())
                
                if end_dt:
                    dt = end_dt.dt
                    if isinstance(dt, datetime):
                        end_datetime = dt
                    elif hasattr(dt, 'date'):
                        end_datetime = datetime.combine(dt.date(), datetime.min.time())
                
                event = ParsedCalendarEvent(
                    title=title,
                    start_time=start_datetime,
                    end_time=end_datetime,
                    description=description,
                    location=location
                )
                
                self._extract_job_info(event)
                events.append(event)
        
        return events
    
    def _parse_datetime(self, date_str: str, time_str: str = '') -> Optional[datetime]:
        """Parse date and time strings into datetime"""
        if not date_str:
            return None
        
        try:
            # Try common date formats
            date_formats = [
                '%m/%d/%Y',
                '%Y-%m-%d',
                '%m-%d-%Y',
                '%d/%m/%Y',
            ]
            
            date_part = None
            for fmt in date_formats:
                try:
                    date_part = datetime.strptime(date_str.strip(), fmt).date()
                    break
                except ValueError:
                    continue
            
            if not date_part:
                return None
            
            # Parse time if provided
            time_part = datetime.min.time()
            if time_str:
                time_formats = ['%H:%M:%S', '%H:%M', '%I:%M %p', '%I:%M:%S %p']
                for fmt in time_formats:
                    try:
                        time_part = datetime.strptime(time_str.strip(), fmt).time()
                        break
                    except ValueError:
                        continue
            
            return datetime.combine(date_part, time_part)
        except Exception:
            return None
    
    def _extract_job_info(self, event: ParsedCalendarEvent):
        """Extract job information from event title and description"""
        title_upper = event.title.upper()
        # Combine title, description, and location for full text search
        full_text = f"{event.title} {event.description or ''} {event.location or ''}".upper()
        
        # Extract builder name
        event.builder_name = self._extract_builder_name(title_upper)
        
        # Extract phase
        event.phase = self._extract_phase(title_upper)
        
        # Extract lot number
        event.lot_number = self._extract_lot_number(title_upper)
        
        # Extract community
        event.community = self._extract_community(title_upper)
        
        # Extract address - prioritize location field, then description, then title
        address_info = None
        if event.location:
            address_info = self._extract_address(event.location.upper())
        if not address_info and event.description:
            address_info = self._extract_address(event.description.upper())
        if not address_info:
            address_info = self._extract_address(full_text)
        
        if address_info:
            event.address_line1 = address_info.get('address_line1')
            event.city = address_info.get('city')
            event.state = address_info.get('state', 'WA')
            event.zip = address_info.get('zip')
        
        # Determine job type
        event.job_type = self._determine_job_type(title_upper)
        
        # Set default status based on job type and categories
        if event.job_type == 'warranty':
            event.status = 'scheduled'
        elif event.job_type == 'go_back':
            event.status = 'scheduled'
        elif event.job_type == 'service_call':
            event.status = 'open'
        else:
            event.status = 'scheduled'
        
        # Store original text as notes
        event.notes = f"Imported from Outlook: {event.title}"
        if event.description:
            event.notes += f"\n\nDescription:\n{event.description}"
        if event.location and not event.address_line1:
            event.notes += f"\n\nLocation: {event.location}"
    
    def _extract_builder_name(self, text: str) -> Optional[str]:
        """Extract builder name from text"""
        for pattern in self.BUILDER_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                builder_name = match.group(0).strip()
                # Normalize common variations
                if 'DR HORTON' in builder_name.upper() or 'DRH' in text.upper():
                    return 'DR HORTON'
                elif 'TOLL BROTHERS' in builder_name.upper():
                    return 'TOLL BROTHERS'
                elif 'PULTE' in builder_name.upper():
                    return 'PULTE'
                elif 'NORTHWYND' in builder_name.upper():
                    return 'NORTHWYND'
                elif 'WHARTON' in builder_name.upper():
                    return 'WHARTON'
                elif 'CLEVJ' in builder_name.upper():
                    return 'CLEVJ'
                elif 'SONGBIRD' in builder_name.upper():
                    return 'SONGBIRD'
                elif 'URBAN NW' in builder_name.upper():
                    return 'URBAN NW'
                return builder_name.title()  # Capitalize properly
        return None
    
    def _extract_phase(self, text: str) -> Optional[str]:
        """Extract phase from text
        TO = Top Out / Rough In
        PB = Post & Beam
        TRIM = Finish
        """
        # First check for hyphenated format like "TO-LOT", "PB-LOT", "TRIM-LOT"
        hyphenated_phases = {
            'TO': r'TO\s*-\s*LOT',
            'PB': r'PB\s*-\s*LOT',
            'TRIM': r'TRIM\s*-\s*LOT',
            'WARRANTY': r'WARRANTY\s*-\s*LOT',
        }
        
        for phase_key, pattern in hyphenated_phases.items():
            if re.search(pattern, text, re.IGNORECASE):
                return phase_key
        
        # Then check for full text patterns (longer patterns first)
        phase_matches = []
        for phase_key, patterns in self.PHASE_PATTERNS.items():
            for pattern in patterns:
                # Use word boundaries but allow hyphens and spaces
                pattern_escaped = re.escape(pattern).replace(r'\-', r'[- ]?').replace(r'\ ', r'[ -]?')
                if re.search(rf'\b{pattern_escaped}\b', text, re.IGNORECASE):
                    phase_matches.append((phase_key, len(pattern)))  # Store phase and pattern length
        
        if phase_matches:
            # Return the phase with the longest matching pattern (most specific)
            phase_matches.sort(key=lambda x: x[1], reverse=True)
            return phase_matches[0][0]
        
        return 'TO'  # Default phase (Top Out / Rough In)
    
    def _extract_lot_number(self, text: str) -> Optional[str]:
        """Extract lot number from text"""
        # Patterns: LOT 110, LOT-110, LOT110, #110, -LOT 110, -LOT110
        patterns = [
            r'LOT\s*[#]?\s*(\d+)',
            r'LOT[#]?(\d+)',
            r'-LOT\s*(\d+)',  # Handle "TO-LOT 110" format
            r'-LOT(\d+)',     # Handle "TO-LOT110" format
            r'#(\d+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _extract_community(self, text: str) -> Optional[str]:
        """Extract community name from text"""
        # Look for patterns like "COMMUNITY-TO-LOT" or "COMMUNITY NAME"
        # Common patterns: LACAMAS HILLS, MEADOWVIEW, etc.
        
        # Remove common prefixes
        text_clean = re.sub(r'(TO|PB|SCT|WARRANTY|LOT).*', '', text, flags=re.IGNORECASE)
        
        # Look for builder-community pattern: BUILDER-COMMUNITY
        match = re.search(r'-\s*([A-Z\s]+?)(?:-|TO|LOT|$)', text_clean)
        if match:
            community = match.group(1).strip()
            if len(community) > 2:  # Filter out short matches
                return community
        
        # Look for standalone community names (common ones)
        common_communities = [
            'LACAMAS HILLS', 'MEADOWVIEW', 'FAIRWINDS', 'CUTTER',
        ]
        for community in common_communities:
            if community in text_clean:
                return community
        
        return None
    
    def _extract_address(self, text: str) -> Optional[Dict[str, str]]:
        """Extract address from text"""
        # Address patterns: "123 STREET NAME CITY, STATE ZIP"
        # Common format: "4826 N ADAMS ST CAMAS" or "1106 SE 194TH PL VANCOUVER WA 98607"
        
        # Pattern for street address with city, state, zip
        address_patterns = [
            # "2726 N 48TH AVE CAMAS WA 98607" - full address with state and zip
            r'(\d+\s+[NESW]?\s*\d+\w*\s+(?:ST|STREET|AVE|AVENUE|RD|ROAD|PL|PLACE|LN|LANE|DR|DRIVE|CT|COURT|BLVD|BOULEVARD|LOOP|WAY|CIR|CIRCLE|CT)\s+([A-Z\s]+?)\s+([A-Z]{2})\s+(\d{5}))',
            # "4826 N ADAMS ST CAMAS" or "1106 SE 194TH PL VANCOUVER" - address with city
            r'(\d+\s+[NESW]?\s*\d+\w*\s+(?:ST|STREET|AVE|AVENUE|RD|ROAD|PL|PLACE|LN|LANE|DR|DRIVE|CT|COURT|BLVD|BOULEVARD|LOOP|WAY|CIR|CIRCLE|CT)\s+([A-Z\s]+?)(?:,\s*([A-Z]{2}))?\s*(\d{5})?)',
            # "762 SE FAIRWINDS LOOP" - simple address
            r'(\d+\s+[NESW]?\s*[A-Z\s]+?\s+(?:ST|STREET|AVE|AVENUE|RD|ROAD|PL|PLACE|LN|LANE|DR|DRIVE|CT|COURT|BLVD|BOULEVARD|LOOP|WAY|CIR|CIRCLE|CT)\s+([A-Z\s]+?)(?:,\s*([A-Z]{2}))?\s*(\d{5})?)',
        ]
        
        for pattern in address_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                address_line1 = match.group(1).strip()
                city = match.group(2).strip() if match.lastindex >= 2 and match.group(2) else None
                state = match.group(3).strip() if match.lastindex >= 3 and match.group(3) else 'WA'
                zip_code = match.group(4).strip() if match.lastindex >= 4 and match.group(4) else None
                
                # Clean up city name (remove extra spaces, normalize)
                if city:
                    city = ' '.join(city.split())
                
                return {
                    'address_line1': address_line1,
                    'city': city or 'Vancouver',
                    'state': state or 'WA',
                    'zip': zip_code or None
                }
        
        return None
    
    def _determine_job_type(self, text: str) -> str:
        """Determine job type from text"""
        text_upper = text.upper()
        
        for job_type, indicators in self.JOB_TYPE_INDICATORS.items():
            for indicator in indicators:
                if indicator in text_upper:
                    return job_type
        
        return 'job'  # Default


def parse_outlook_export(file_path: str, file_type: str = 'auto') -> List[ParsedCalendarEvent]:
    """
    Parse Outlook calendar export file
    
    Args:
        file_path: Path to CSV or ICS file
        file_type: 'csv', 'ics', or 'auto' (detect from extension)
    
    Returns:
        List of parsed calendar events
    """
    parser = OutlookParser()
    
    if file_type == 'auto':
        if file_path.lower().endswith('.csv'):
            file_type = 'csv'
        elif file_path.lower().endswith('.ics'):
            file_type = 'ics'
        else:
            raise ValueError(f"Unknown file type. Use .csv or .ics extension, or specify file_type")
    
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        content = f.read()
    
    if file_type == 'csv':
        return parser.parse_csv(content)
    elif file_type == 'ics':
        return parser.parse_ics(content)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

