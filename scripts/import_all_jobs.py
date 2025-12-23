"""
Import all jobs - reads SQL file and executes batches
"""
import re

sql_file = 'scripts/job_inserts_all.sql'

with open(sql_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Split into batches
batches = re.split(r'-- Batch \d+:', content)

print(f"Found {len(batches)-1} batches")
print("\nTo import all jobs, execute each batch SQL statement via Supabase MCP")
print("Batch 1 is ready to execute...")

# Show first batch SQL
if len(batches) > 1:
    batch1_sql = batches[1].strip()
    # Remove the print statements and get just the SQL
    sql_lines = [line for line in batch1_sql.split('\n') if line.strip() and not line.strip().startswith('print')]
    batch1_clean = '\n'.join(sql_lines)
    print(f"\nFirst batch SQL ({len(batch1_clean)} chars):")
    print(batch1_clean[:500] + "..." if len(batch1_clean) > 500 else batch1_clean)

