"""
Seed test data for development and testing
This script wipes existing operational data and populates with test data

Run from apps/api: python -m seed_test_data
"""
import asyncio
from datetime import datetime, timedelta, date, timezone
from uuid import uuid4

from app.models import (
    Builder, BuilderContact, Job, JobTask, ServiceCall, ServiceCallWorkflow,
    Bid, BidLineItem
)
from app.db.session import AsyncSessionLocal


async def wipe_operational_data(db: AsyncSessionLocal):
    """Remove all operational data, keeping system tables"""
    print("🧹 Cleaning existing operational data...")
    
    from sqlalchemy import text
    
    # Delete in order of dependencies (using text() for raw SQL)
    await db.execute(text("DELETE FROM job_tasks"))
    await db.execute(text("DELETE FROM service_call_workflows"))
    await db.execute(text("DELETE FROM bid_line_items"))
    await db.execute(text("DELETE FROM bids"))
    await db.execute(text("DELETE FROM job_contacts"))
    await db.execute(text("DELETE FROM review_requests"))
    await db.execute(text("DELETE FROM recovery_tickets"))
    await db.execute(text("DELETE FROM reviews"))
    await db.execute(text("DELETE FROM notifications WHERE entity_type != 'system'"))
    await db.execute(text("DELETE FROM service_calls"))
    await db.execute(text("DELETE FROM jobs"))
    await db.execute(text("DELETE FROM builder_contacts"))
    await db.execute(text("DELETE FROM builders"))
    
    await db.commit()
    print("✅ Operational data cleaned")


async def create_test_builders(db: AsyncSessionLocal):
    """Create test builders"""
    print("🏗️  Creating test builders...")
    
    builders_data = [
        {"name": "All County Construction", "notes": "Primary builder partner"},
        {"name": "Green Valley Builders", "notes": "Test builder for warranty workflows"},
        {"name": "Sunset Homes", "notes": "Test builder for phase tasks"},
    ]
    
    builders = []
    for data in builders_data:
        builder = Builder(
            id=uuid4(),
            name=data["name"],
            notes=data["notes"]
        )
        db.add(builder)
        builders.append(builder)
    
    await db.flush()
    
    # Create builder contacts
    contacts_data = [
        {"builder": builders[0], "name": "John Smith", "role": "Project Manager", "email": "john@allcounty.com", "phone": "555-0101"},
        {"builder": builders[0], "name": "Sarah Johnson", "role": "Supervisor", "email": "sarah@allcounty.com", "phone": "555-0102"},
        {"builder": builders[1], "name": "Mike Davis", "role": "Owner", "email": "mike@greenvalley.com", "phone": "555-0201"},
    ]
    
    for data in contacts_data:
        contact = BuilderContact(
            id=uuid4(),
            builder_id=data["builder"].id,
            name=data["name"],
            role=data["role"],
            email=data["email"],
            phone=data["phone"],
            preferred_contact_method="email"
        )
        db.add(contact)
    
    await db.commit()
    print(f"✅ Created {len(builders)} builders with contacts")
    return builders


async def create_test_jobs(db: AsyncSessionLocal, builders):
    """Create test jobs with various phases and statuses"""
    print("🔨 Creating test jobs...")
    
    tenant_id = "all_county"
    now = datetime.now(timezone.utc)
    
    jobs_data = [
        # Job in Post & Beam phase - should auto-create tasks
        {
            "builder": builders[0],
            "community": "Oak Ridge Estates",
            "lot_number": "42",
            "phase": "PB",
            "status": "In Progress",
            "address_line1": "123 Oak Ridge Drive",
            "city": "Vancouver",
            "state": "WA",
            "zip": "98660",
            "assigned_to": "tech1",
            "scheduled_start": now + timedelta(days=1),
            "scheduled_end": now + timedelta(days=5),
        },
        # Job in Top Out phase - should auto-create task
        {
            "builder": builders[0],
            "community": "Oak Ridge Estates",
            "lot_number": "43",
            "phase": "rough",
            "status": "Scheduled",
            "address_line1": "125 Oak Ridge Drive",
            "city": "Vancouver",
            "state": "WA",
            "zip": "98660",
            "assigned_to": "tech2",
            "scheduled_start": now + timedelta(days=2),
            "scheduled_end": now + timedelta(days=6),
        },
        # Completed job in Trim phase - should have warranty
        {
            "builder": builders[1],
            "community": "Green Valley",
            "lot_number": "15",
            "phase": "trim",
            "status": "Completed",
            "address_line1": "789 Green Valley Blvd",
            "city": "Portland",
            "state": "WA",
            "zip": "98660",
            "assigned_to": "tech1",
            "completion_date": date.today() - timedelta(days=30),
            "warranty_start_date": date.today() - timedelta(days=30),
            "warranty_end_date": date.today() + timedelta(days=335),
            "warranty_notes": "Auto-started warranty on completion",
        },
        # Job nearing warranty expiration
        {
            "builder": builders[1],
            "community": "Green Valley",
            "lot_number": "10",
            "phase": "final",
            "status": "Completed",
            "address_line1": "785 Green Valley Blvd",
            "city": "Portland",
            "state": "WA",
            "zip": "98660",
            "assigned_to": "tech2",
            "completion_date": date.today() - timedelta(days=350),
            "warranty_start_date": date.today() - timedelta(days=350),
            "warranty_end_date": date.today() + timedelta(days=15),
            "warranty_notes": "Warranty expiring soon",
        },
        # Overdue job
        {
            "builder": builders[2],
            "community": "Sunset Hills",
            "lot_number": "22",
            "phase": "TO",
            "status": "In Progress",
            "address_line1": "456 Sunset Way",
            "city": "Vancouver",
            "state": "WA",
            "zip": "98660",
            "assigned_to": "tech1",
            "scheduled_start": now - timedelta(days=5),
            "scheduled_end": now - timedelta(days=2),
        },
    ]
    
    jobs = []
    for data in jobs_data:
        job = Job(
            id=uuid4(),
            tenant_id=tenant_id,
            builder_id=data["builder"].id,
            community=data["community"],
            lot_number=data["lot_number"],
            phase=data["phase"],
            status=data["status"],
            address_line1=data["address_line1"],
            city=data["city"],
            state=data["state"],
            zip=data["zip"],
            assigned_to=data.get("assigned_to"),
            scheduled_start=data.get("scheduled_start"),
            scheduled_end=data.get("scheduled_end"),
            completion_date=data.get("completion_date"),
            warranty_start_date=data.get("warranty_start_date"),
            warranty_end_date=data.get("warranty_end_date"),
            warranty_notes=data.get("warranty_notes"),
        )
        db.add(job)
        jobs.append(job)
    
    await db.flush()
    
    # Create phase-based tasks for jobs that should have them
    # Job 0 (PB phase) - should have "Highlight Plans" and "Job Account"
    pb_job = jobs[0]
    task1 = JobTask(
        id=uuid4(),
        job_id=pb_job.id,
        tenant_id=tenant_id,
        title="Highlight Plans",
        description="Review and highlight plans for post and beam phase",
        status="pending",
        assigned_to=pb_job.assigned_to
    )
    task2 = JobTask(
        id=uuid4(),
        job_id=pb_job.id,
        tenant_id=tenant_id,
        title="Job Account",
        description="Set up job account for post and beam work",
        status="in_progress",
        assigned_to=pb_job.assigned_to
    )
    db.add(task1)
    db.add(task2)
    
    # Job 1 (rough/Top Out phase) - should have "Open Order"
    rough_job = jobs[1]
    task3 = JobTask(
        id=uuid4(),
        job_id=rough_job.id,
        tenant_id=tenant_id,
        title="Open Order",
        description="Open order for top out materials and supplies",
        status="pending",
        assigned_to=rough_job.assigned_to
    )
    db.add(task3)
    
    await db.commit()
    print(f"✅ Created {len(jobs)} test jobs with phase tasks")
    return jobs


async def create_test_service_calls(db: AsyncSessionLocal, builders):
    """Create test service calls with various statuses"""
    print("📞 Creating test service calls...")
    
    tenant_id = "h2o"
    now = datetime.now(timezone.utc)
    
    service_calls_data = [
        # Active service call - should have workflow
        {
            "builder": builders[0],
            "customer_name": "Alice Johnson",
            "phone": "555-1001",
            "email": "alice@example.com",
            "address_line1": "123 Oak Ridge Drive",
            "city": "Vancouver",
            "state": "WA",
            "zip": "98660",
            "issue_description": "Leaky faucet in kitchen",
            "priority": "Normal",
            "status": "Scheduled",
            "assigned_to": "tech1",
            "scheduled_start": now + timedelta(hours=2),
            "scheduled_end": now + timedelta(hours=4),
        },
        # Service call in progress - should have workflow started
        {
            "builder": builders[1],
            "customer_name": "Bob Smith",
            "phone": "555-1002",
            "email": "bob@example.com",
            "address_line1": "789 Green Valley Blvd",
            "city": "Portland",
            "state": "WA",
            "zip": "98660",
            "issue_description": "Water heater not working",
            "priority": "High",
            "status": "In Progress",
            "assigned_to": "tech2",
            "scheduled_start": now - timedelta(hours=1),
            "scheduled_end": now + timedelta(hours=2),
        },
        # Completed service call - should have completed workflow
        {
            "builder": builders[0],
            "customer_name": "Carol Williams",
            "phone": "555-1003",
            "email": "carol@example.com",
            "address_line1": "456 Sunset Way",
            "city": "Vancouver",
            "state": "WA",
            "zip": "98660",
            "issue_description": "Drain cleaning",
            "priority": "Normal",
            "status": "Completed",
            "assigned_to": "tech1",
            "scheduled_start": now - timedelta(days=2),
            "scheduled_end": now - timedelta(days=2, hours=-2),
        },
        # Service call needing bid
        {
            "builder": builders[1],
            "customer_name": "David Brown",
            "phone": "555-1004",
            "email": "david@example.com",
            "address_line1": "321 Main St",
            "city": "Vancouver",
            "state": "WA",
            "zip": "98660",
            "issue_description": "Full bathroom remodel",
            "priority": "Normal",
            "status": "In Progress",
            "assigned_to": "tech2",
            "scheduled_start": now + timedelta(days=1),
            "scheduled_end": now + timedelta(days=1, hours=3),
        },
        # Overdue service call
        {
            "builder": builders[0],
            "customer_name": "Eva Martinez",
            "phone": "555-1005",
            "email": "eva@example.com",
            "address_line1": "654 Park Ave",
            "city": "Vancouver",
            "state": "WA",
            "zip": "98660",
            "issue_description": "Sink installation",
            "priority": "High",
            "status": "Scheduled",
            "assigned_to": "tech1",
            "scheduled_start": now - timedelta(days=1),
            "scheduled_end": now - timedelta(hours=12),
        },
    ]
    
    service_calls = []
    for data in service_calls_data:
        sc = ServiceCall(
            id=uuid4(),
            tenant_id=tenant_id,
            builder_id=data["builder"].id if data["builder"] else None,
            customer_name=data["customer_name"],
            phone=data["phone"],
            email=data["email"],
            address_line1=data["address_line1"],
            city=data["city"],
            state=data["state"],
            zip=data["zip"],
            issue_description=data["issue_description"],
            priority=data["priority"],
            status=data["status"],
            assigned_to=data["assigned_to"],
            scheduled_start=data["scheduled_start"],
            scheduled_end=data["scheduled_end"],
        )
        db.add(sc)
        service_calls.append(sc)
    
    await db.flush()
    
    # Create workflows for service calls
    # SC 1 (In Progress) - workflow at step 2
    sc1 = service_calls[1]
    workflow1 = ServiceCallWorkflow(
        id=uuid4(),
        service_call_id=sc1.id,
        tenant_id=tenant_id,
        current_step=2,
        completed=False,
        paperwork_photo_urls=["https://example.com/photo1.jpg"],
        needs_permit=True,
        permit_notes="Permit #12345 required",
        needs_reschedule=False,
    )
    db.add(workflow1)
    
    # SC 2 (Completed) - workflow completed
    sc2 = service_calls[2]
    workflow2 = ServiceCallWorkflow(
        id=uuid4(),
        service_call_id=sc2.id,
        tenant_id=tenant_id,
        current_step=6,
        completed=True,
        completed_at=now - timedelta(days=2),
        paperwork_photo_urls=["https://example.com/photo2.jpg"],
        needs_permit=False,
        needs_reschedule=False,
        needs_parts_order=False,
        needs_bid=False,
        needs_pricing=True,
        estimated_price=250.00,
        needs_price_approval=False,
    )
    db.add(workflow2)
    
    # SC 3 (Needs bid) - workflow at step 4, needs bid
    sc3 = service_calls[3]
    workflow3 = ServiceCallWorkflow(
        id=uuid4(),
        service_call_id=sc3.id,
        tenant_id=tenant_id,
        current_step=4,
        completed=False,
        paperwork_photo_urls=["https://example.com/photo3.jpg"],
        needs_permit=True,
        permit_notes="Building permit needed",
        needs_reschedule=False,
        needs_parts_order=True,
        parts_order_notes="Order tiles and fixtures",
        needs_bid=True,
    )
    db.add(workflow3)
    
    # Create a bid linked to workflow3
    bid = Bid(
        id=uuid4(),
        tenant_id=tenant_id,
        builder_id=sc3.builder_id,
        project_name=f"Bathroom Remodel - {sc3.customer_name}",
        status="Drafting",
        amount_cents=1500000,  # $15,000
        notes="Full bathroom remodel bid"
    )
    db.add(bid)
    await db.flush()
    
    # Update workflow to link bid
    workflow3.bid_id = bid.id
    
    await db.commit()
    print(f"✅ Created {len(service_calls)} test service calls with workflows")
    return service_calls


async def main():
    """Main execution"""
    print("🚀 Starting test data seed...")
    print("This will WIPE all existing operational data and create test data")
    print("System tables (users, marketing_channels, etc.) will be preserved\n")
    
    async with AsyncSessionLocal() as db:
        try:
            # Wipe existing data
            await wipe_operational_data(db)
            
            # Create test data
            builders = await create_test_builders(db)
            jobs = await create_test_jobs(db, builders)
            service_calls = await create_test_service_calls(db, builders)
            
            print("\n✅ Test data seed completed successfully!")
            print(f"   - {len(builders)} builders")
            print(f"   - {len(jobs)} jobs")
            print(f"   - {len(service_calls)} service calls")
            print("\n🧪 Test scenarios included:")
            print("   ✓ Post & Beam phase job (auto-tasks created)")
            print("   ✓ Top Out phase job (auto-task created)")
            print("   ✓ Completed job with active warranty")
            print("   ✓ Job with warranty expiring soon")
            print("   ✓ Overdue job")
            print("   ✓ Service call in progress (workflow started)")
            print("   ✓ Completed service call (workflow completed)")
            print("   ✓ Service call needing bid (workflow with bid)")
            print("   ✓ Overdue service call")
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Error seeding test data: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(main())

