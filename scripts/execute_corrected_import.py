"""
Execute the corrected job import SQL in batches
"""
import re

sql_file = 'scripts/corrected_job_inserts.sql'

with open(sql_file, 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Extract SQL batches (everything between "-- Batch X:" and the next "-- Batch" or end of file)
batches = re.split(r'-- Batch \d+:', content)

print(f"Found {len(batches)-1} batches")

# Skip the first element (everything before the first batch)
sql_batches = []
for i in range(1, len(batches)):
    batch_content = batches[i].strip()
    # Remove any print statements or other non-SQL content
    lines = [line for line in batch_content.split('\n') if line.strip() and not line.strip().startswith('print')]
    sql_batch = '\n'.join(lines)
    if sql_batch.strip():
        sql_batches.append(sql_batch)
        print(f"\nBatch {i} SQL ({len(sql_batch)} chars):")
        print(sql_batch[:300] + "..." if len(sql_batch) > 300 else sql_batch)

print(f"\n\nTotal batches to execute: {len(sql_batches)}")
print("\nTo execute, use Supabase MCP to run each batch SQL statement")

