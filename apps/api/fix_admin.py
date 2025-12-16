"""
Script to fix admin user password
Run this to ensure admin user exists with correct password from ADMIN_PASSWORD env var
"""
import asyncio
import sys
from app.db.session import AsyncSessionLocal
from app.models import User
from app.core.password import hash_password
from app.core.config import settings
from sqlalchemy import select

async def fix_admin():
    async with AsyncSessionLocal() as db:
        # Check if admin user exists
        result = await db.execute(
            select(User).where(User.username == "admin")
        )
        admin_user = result.scalar_one_or_none()
        
        if admin_user:
            print(f"Found admin user in database")
            print(f"Updating password to match ADMIN_PASSWORD env var...")
            admin_user.hashed_password = hash_password(settings.admin_password)
            admin_user.role = "admin"
            admin_user.is_active = True
        else:
            print(f"Admin user not found, creating new one...")
            admin_user = User(
                username="admin",
                email="admin@example.com",
                hashed_password=hash_password(settings.admin_password),
                role="admin",
                is_active=True
            )
            db.add(admin_user)
        
        await db.commit()
        print(f"[OK] Admin user fixed!")
        print(f"   Username: admin")
        print(f"   Password: {settings.admin_password}")
        print(f"   (from ADMIN_PASSWORD env var)")

if __name__ == '__main__':
    try:
        asyncio.run(fix_admin())
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        sys.exit(1)

