#!/usr/bin/env python3
"""Ensure admin user exists with correct password"""
import os
import sys
import asyncio
sys.path.insert(0, '/app')
from app.db.session import AsyncSessionLocal
from app.models import User
from app.core.password import hash_password
from sqlalchemy import select

async def fix_admin():
    """Create or update admin user"""
    import os
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(User.username == "admin")
            )
            admin_user = result.scalar_one_or_none()
            
            admin_password = os.getenv("ADMIN_PASSWORD", "admin121")
            
            if admin_user:
                # Update password
                admin_user.hashed_password = hash_password(admin_password)
                admin_user.role = "admin"
                admin_user.is_active = True
                admin_user.tenant_id = None
                print(f"✓ Updated admin user password")
            else:
                # Create admin user
                admin_user = User(
                    username="admin",
                    email="admin@h2oplumbers.com",
                    hashed_password=hash_password(admin_password),
                    role="admin",
                    tenant_id=None,
                    is_active=True
                )
                db.add(admin_user)
                print(f"✓ Created admin user")
            
            await db.commit()
            return True
    except Exception as e:
        print(f"⚠ Could not fix admin user: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(fix_admin())
    sys.exit(0 if success else 1)
