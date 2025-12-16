import asyncio
from app.db.session import engine, AsyncSessionLocal
from app.models import Base, Builder, BuilderContact, Job, ServiceCall, Bid, BidLineItem, MarketingChannel
from sqlalchemy.ext.asyncio import AsyncSession

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # create marketing channels
        channels = [
            MarketingChannel(key='facebook', display_name='Facebook', supports_autopost=True),
            MarketingChannel(key='instagram', display_name='Instagram', supports_autopost=True),
            MarketingChannel(key='google_my_business', display_name='Google My Business', supports_autopost=True),
            MarketingChannel(key='nextdoor', display_name='Nextdoor', supports_autopost=False),
            MarketingChannel(key='website_pictures', display_name='Website Pictures', supports_autopost=False),
            MarketingChannel(key='website_blogs', display_name='Website Blogs', supports_autopost=False),
        ]
        db.add_all(channels)
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
