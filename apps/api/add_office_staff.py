"""
Script to add office staff users to the database.
Run with: python -m app.add_office_staff
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.db.session import AsyncSessionLocal
from app.models import User
from app.core.password import hash_password
from sqlalchemy import select

async def add_office_staff():
    """Add office staff users (sandi and skylee) with admin privileges"""
    office_staff = [
        {
            "username": "sandi",
            "password": "sandi121",
            "full_name": "Sandi",
            "role": "admin",
            "tenant_id": None  # None means access to all tenants
        },
        {
            "username": "skylee",
            "password": "skylee121",
            "full_name": "Skylee",
            "role": "admin",
            "tenant_id": None  # None means access to all tenants
        }
    ]
    
    try:
        async with AsyncSessionLocal() as db:
            for user_data in office_staff:
                # Check if user already exists
                result = await db.execute(
                    select(User).where(User.username == user_data["username"])
                )
                existing_user = result.scalar_one_or_none()
                
                if existing_user:
                    # Update existing user
                    existing_user.hashed_password = hash_password(user_data["password"])
                    existing_user.full_name = user_data["full_name"]
                    existing_user.role = user_data["role"]
                    existing_user.tenant_id = user_data["tenant_id"]
                    existing_user.is_active = True
                    print(f"✓ Updated user: {user_data['username']} (role: {user_data['role']})")
                else:
                    # Create new user
                    new_user = User(
                        username=user_data["username"],
                        email=f"{user_data['username']}@h2oplumbers.com",
                        hashed_password=hash_password(user_data["password"]),
                        full_name=user_data["full_name"],
                        role=user_data["role"],
                        tenant_id=user_data["tenant_id"],
                        is_active=True
                    )
                    db.add(new_user)
                    print(f"✓ Created user: {user_data['username']} (role: {user_data['role']})")
            
            await db.commit()
            print("\n✓ Office staff users added successfully!")
            return True
    except Exception as e:
        print(f"✗ Error adding office staff users: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(add_office_staff())

