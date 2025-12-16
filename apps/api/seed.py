import asyncio
from app.db.session import engine, AsyncSessionLocal
from app.models import Base, Builder, BuilderContact, Job, ServiceCall, Bid, BidLineItem, User
from app.core.password import hash_password
from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Ensure admin user exists with correct password
        result = await db.execute(
            select(User).where(User.username == "admin")
        )
        admin_user = result.scalar_one_or_none()
        
        if admin_user:
            # Update password if user exists
            admin_user.hashed_password = hash_password(settings.admin_password)
            admin_user.role = "admin"
            admin_user.is_active = True
            print(f"Updated admin user password")
        else:
            # Create admin user
            admin_user = User(
                username="admin",
                email="admin@example.com",
                hashed_password=hash_password(settings.admin_password),
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            print(f"Created admin user with password from ADMIN_PASSWORD env var")
        
        await db.flush()
        # create builders
        b1 = Builder(name='Starline Plumbing', notes='Large builder')
        b2 = Builder(name='Cascade Homes', notes='Local builder')
        db.add_all([b1, b2])
        await db.flush()

        # contacts
        c1 = BuilderContact(builder_id=b1.id, name='PM One', role='PM', email='pm1@starline.com')
        c2 = BuilderContact(builder_id=b1.id, name='Warranty Guy', role='Warranty', email='warranty@starline.com', visibility='h2o')
        c3 = BuilderContact(builder_id=b2.id, name='PM Two', role='PM', email='pm@cascade.com')
        db.add_all([c1, c2, c3])
        await db.flush()

        # job
        job = Job(tenant_id='all_county', builder_id=b1.id, community='Rivertown', lot_number='101', phase='rough', status='Pending', address_line1='123 Main St', city='Seattle', state='WA', zip='98000')
        db.add(job)

        # service call
        sc = ServiceCall(tenant_id='h2o', builder_id=b2.id, customer_name='John Doe', address_line1='456 Elm St', city='Tacoma', state='WA', zip='98101', issue_description='Leak under sink', status='New')
        db.add(sc)

        # bid
        bid = Bid(tenant_id='all_county', project_name='New Development A', status='Draft', builder_id=b1.id)
        db.add(bid)
        await db.flush()
        bi1 = BidLineItem(bid_id=bid.id, category='labor', description='Install fixtures', qty=1, unit_price_cents=200000, total_cents=200000)
        db.add(bi1)

        await db.commit()
    print('Seed complete')

if __name__ == '__main__':
    asyncio.run(seed())
