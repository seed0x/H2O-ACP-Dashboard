import os
import time
import sys
import psycopg

def wait_for_db(retries=30, delay=2):
    url = os.getenv("DATABASE_URL")
    if not url:
        print("DATABASE_URL not set, exit")
        sys.exit(1)
    for i in range(retries):
        try:
            with psycopg.connect(url) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    print("DB ready")
                    return
        except Exception as e:
            print(f"Waiting for DB, attempt {i+1}/{retries}, error: {e}")
            time.sleep(delay)
    print("Timeout waiting for DB")
    sys.exit(1)

if __name__ == '__main__':
    wait_for_db()
