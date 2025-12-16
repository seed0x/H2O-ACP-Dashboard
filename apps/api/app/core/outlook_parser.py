"""
Outlook Calendar Parser
Parses Outlook calendar exports (CSV/ICS) and extracts job/service call information
"""
import re
import csv
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass
import icalendar
from io import StringIO


@dataclass
class ParsedCalendarEvent:
    """Parsed calendar event with extracted job information"""
    title: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    description: Optional[str] = None
    location: Optional[str] = None
    builder_name: Optional[str] = None
    community: Optional[str] = None
    lot_number: Optional[str] = None
    phase: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    job_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    customer_name: Optional[str] = None
    tech_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class OutlookParser:
    """Parser for Outlook calendar exports"""
    
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
    
    PHASE_PATTERNS = {
        'TO': ['TO', 'TOP OUT', 'TOP-OUT', 'TOPOUT', 'ROUGH IN', 'ROUGH-IN', 'ROUGHIN', 'ROUGH'],
        'PB': ['PB', 'POST AND BEAM', 'POST & BEAM', 'POST&BEAM'],
        'TRIM': ['TRIM', 'FINISH'],
        'WARRANTY': ['WARRANTY', 'WARR'],
        'GO BACK': ['GO BACK', 'GOBACK', 'GB'],
        'PAY CALL': ['PAY CALL', 'PAYCALL'],
        'PUNCH': ['PUNCH', 'PUNCHLIST', 'PUNCH-LIST', 'PUNCH LIST'],
    }
    
    JOB_TYPE_INDICATORS = {
        'warranty': ['WARRANTY', 'WARR'],
        'go_back': ['GO BACK', 'GOBACK', 'GB'],
        'service_call': ['SERVICE', 'CALL'],
        'job': ['TO', 'PB', 'SCT', 'ROUGH', 'PUNCH'],
    }
    
    def parse_csv(self, csv_content: str) -> List[ParsedCalendarEvent]:
        """Parse Outlook CSV export"""
        events = []
        reader = csv.DictReader(StringIO(csv_content))
        
        for row in reader:
            title = row.get('Subject', '') or row.get('Title', '')
            start_date = row.get('Start Date', '') or row.get('Start', '')
            start_time = row.get('Start Time', '')
            end_date = row.get('End Date', '') or row.get('End', '')
            end_time = row.get('End Time', '')
            location = row.get('Location', '')
            description = row.get('Description', '') or row.get('Body', '')
            
            start_dt = self._parse_datetime(start_date, start_time)
            end_dt = self._parse_datetime(end_date, end_time)
            
            event = ParsedCalendarEvent(
                title=title,
                start_time=start_dt,
                end_time=end_dt,
                description=description,
                location=location
            )
            
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
            date_formats = ['%m/%d/%Y', '%Y-%m-%d', '%m-%d-%Y', '%d/%m/%Y']
            date_part = None
            for fmt in date_formats:
                try:
                    date_part = datetime.strptime(date_str.strip(), fmt).date()
                    break
                except ValueError:
                    continue
            
            if not date_part:
                return None
            
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
        full_text = f"{event.title} {event.description or ''} {event.location or ''}".upper()
        
        # Extract phone and email from description/notes (search description first, then notes)
        search_text = (event.description or '') + ' ' + (event.notes or '')
        event.phone = self._extract_phone(search_text)
        event.email = self._extract_email(search_text)
        
        # Check for H2O service call format: "PatS-est01" (customer code - call description)
        # Pattern: 3+ letters + 1 letter (e.g., "PatS" = first 3 of last name + first letter of first name)
        h2o_match = re.match(r'^([A-Za-z]{3,}[A-Za-z]?)\s*-\s*(.+)$', event.title)
        if h2o_match:
            customer_code = h2o_match.group(1)
            call_description = h2o_match.group(2).strip()
            event.job_type = 'service_call'
            event.status = 'open'
            event.customer_name = customer_code  # Use customer code as customer name
            # Store the full title as issue description, customer code in notes
            event.notes = f"Imported from Outlook: {event.title}\nCustomer Code: {customer_code}\nCall: {call_description}"
            if event.description:
                event.notes += f"\n\nDescription:\n{event.description}"
        else:
            # All County job parsing
            event.builder_name = self._extract_builder_name(title_upper)
            event.phase = self._extract_phase(title_upper)
            event.lot_number = self._extract_lot_number(title_upper)
            event.community = self._extract_community(title_upper)
            
            # Extract tech name from description/body for All County jobs
            if event.description:
                event.tech_name = self._extract_tech_name(event.description)
        
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
        
        if not event.job_type:
            event.job_type = self._determine_job_type(title_upper)
        
        if event.job_type == 'warranty':
            event.status = 'scheduled'
        elif event.job_type == 'go_back':
            event.status = 'scheduled'
        elif event.job_type == 'service_call':
            event.status = 'open'
        else:
            event.status = 'scheduled'
        
        if not event.notes:
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
                return builder_name.title()
        return None
    
    def _extract_phase(self, text: str) -> Optional[str]:
        """Extract phase from text - TO=Top Out, PB=Post & Beam, TRIM=Finish"""
        hyphenated_phases = {
            'TO': r'TO\s*-\s*LOT',
            'PB': r'PB\s*-\s*LOT',
            'TRIM': r'TRIM\s*-\s*LOT',
            'WARRANTY': r'WARRANTY\s*-\s*LOT',
        }
        
        for phase_key, pattern in hyphenated_phases.items():
            if re.search(pattern, text, re.IGNORECASE):
                return phase_key
        
        phase_matches = []
        for phase_key, patterns in self.PHASE_PATTERNS.items():
            for pattern in patterns:
                pattern_escaped = re.escape(pattern).replace(r'\-', r'[- ]?').replace(r'\ ', r'[ -]?')
                if re.search(rf'\b{pattern_escaped}\b', text, re.IGNORECASE):
                    phase_matches.append((phase_key, len(pattern)))
        
        if phase_matches:
            phase_matches.sort(key=lambda x: x[1], reverse=True)
            return phase_matches[0][0]
        
        return 'TO'
    
    def _extract_lot_number(self, text: str) -> Optional[str]:
        """Extract lot number from text"""
        patterns = [
            r'LOT\s*[#]?\s*(\d+)',
            r'LOT[#]?(\d+)',
            r'-LOT\s*(\d+)',
            r'-LOT(\d+)',
            r'#(\d+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _extract_community(self, text: str) -> Optional[str]:
        """Extract community name from text"""
        text_clean = re.sub(r'(TO|PB|SCT|WARRANTY|LOT).*', '', text, flags=re.IGNORECASE)
        
        match = re.search(r'-\s*([A-Z\s]+?)(?:-|TO|LOT|$)', text_clean)
        if match:
            community = match.group(1).strip()
            if len(community) > 2:
                return community
        
        common_communities = ['LACAMAS HILLS', 'MEADOWVIEW', 'FAIRWINDS', 'CUTTER', 'CURTAIN CREEK', 'NORTHSIDE', 'LUDEN ESTATES']
        for community in common_communities:
            if community in text_clean:
                return community
        
        return None
    
    def _extract_address(self, text: str) -> Optional[Dict[str, str]]:
        """Extract address from text"""
        address_patterns = [
            r'(\d+\s+[NESW]?\s*\d+\w*\s+(?:ST|STREET|AVE|AVENUE|RD|ROAD|PL|PLACE|LN|LANE|DR|DRIVE|CT|COURT|BLVD|BOULEVARD|LOOP|WAY|CIR|CIRCLE|CT)\s+([A-Z\s]+?)\s+([A-Z]{2})\s+(\d{5}))',
            r'(\d+\s+[NESW]?\s*\d+\w*\s+(?:ST|STREET|AVE|AVENUE|RD|ROAD|PL|PLACE|LN|LANE|DR|DRIVE|CT|COURT|BLVD|BOULEVARD|LOOP|WAY|CIR|CIRCLE|CT)\s+([A-Z\s]+?)(?:,\s*([A-Z]{2}))?\s*(\d{5})?)',
            r'(\d+\s+[NESW]?\s*[A-Z\s]+?\s+(?:ST|STREET|AVE|AVENUE|RD|ROAD|PL|PLACE|LN|LANE|DR|DRIVE|CT|COURT|BLVD|BOULEVARD|LOOP|WAY|CIR|CIRCLE|CT)\s+([A-Z\s]+?)(?:,\s*([A-Z]{2}))?\s*(\d{5})?)',
        ]
        
        for pattern in address_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                address_line1 = match.group(1).strip()
                city = match.group(2).strip() if match.lastindex >= 2 and match.group(2) else None
                state = match.group(3).strip() if match.lastindex >= 3 and match.group(3) else 'WA'
                zip_code = match.group(4).strip() if match.lastindex >= 4 and match.group(4) else None
                
                if city:
                    city = ' '.join(city.split())
                
                return {
                    'address_line1': address_line1,
                    'city': city or 'Vancouver',
                    'state': state or 'WA',
                    'zip': zip_code or None
                }
        
        return None
    
    def _extract_phone(self, text: str) -> Optional[str]:
        """Extract phone numbers from text, concatenate multiple with commas"""
        if not text:
            return None
        
        # Phone patterns: various formats
        patterns = [
            r'\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # Standard US format
            r'\(\d{3}\)\s?\d{3}[-.\s]?\d{4}',  # (123) 456-7890
            r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',  # 123-456-7890
            r'\d{10}',  # 1234567890
        ]
        
        phones = []
        for pattern in patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                # Clean up the phone number
                cleaned = re.sub(r'[^\d]', '', match)
                if len(cleaned) == 10 or (len(cleaned) == 11 and cleaned.startswith('1')):
                    # Format as (XXX) XXX-XXXX
                    if len(cleaned) == 11:
                        cleaned = cleaned[1:]
                    formatted = f"({cleaned[:3]}) {cleaned[3:6]}-{cleaned[6:]}"
                    if formatted not in phones:
                        phones.append(formatted)
        
        if phones:
            return ', '.join(phones)
        return None
    
    def _extract_email(self, text: str) -> Optional[str]:
        """Extract email addresses from text, concatenate multiple with commas"""
        if not text:
            return None
        
        # Email pattern
        pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = re.findall(pattern, text)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_emails = []
        for email in emails:
            email_lower = email.lower()
            if email_lower not in seen:
                seen.add(email_lower)
                unique_emails.append(email)
        
        if unique_emails:
            return ', '.join(unique_emails)
        return None
    
    def _extract_tech_name(self, text: str) -> Optional[str]:
        """Extract tech name from description/body (usually a single word or name)"""
        if not text:
            return None
        
        # Remove common prefixes/suffixes
        text = text.strip()
        
        # If it's a single word or short phrase (likely a name)
        words = text.split()
        if len(words) <= 3:
            # Check if it looks like a name (starts with capital, mostly letters)
            cleaned = ' '.join(words)
            if re.match(r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$', cleaned):
                return cleaned
        
        # Look for patterns like "Tech: name" or "Assigned: name"
        patterns = [
            r'(?:tech|assigned|technician)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',
            r'^([A-Z][a-z]+)$',  # Single capitalized word
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _determine_job_type(self, text: str) -> str:
        """Determine job type from text"""
        text_upper = text.upper()
        
        for job_type, indicators in self.JOB_TYPE_INDICATORS.items():
            for indicator in indicators:
                if indicator in text_upper:
                    return job_type
        
        return 'job'


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

