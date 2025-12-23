-- Comprehensive Test Data Seeding Script
-- This script adds test data for all major features to verify UI/UX flows

-- ============================================================================
-- 1. CUSTOMERS (H2O Tenant)
-- ============================================================================
INSERT INTO customers (id, tenant_id, name, phone, email, address_line1, city, state, zip, notes, tags, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'h2o', 'Carol Johnson', '360-555-0101', 'carol.johnson@email.com', '1234 Main Street', 'Vancouver', 'WA', '98660', 'Regular customer, prefers morning appointments', ARRAY['VIP', 'Warranty'], NOW(), NOW()),
  (gen_random_uuid(), 'h2o', 'Michael Chen', '360-555-0102', 'michael.chen@email.com', '5678 Oak Avenue', 'Vancouver', 'WA', '98661', 'Commercial customer', ARRAY['Commercial'], NOW(), NOW()),
  (gen_random_uuid(), 'h2o', 'Sarah Williams', '360-555-0103', 'sarah.w@email.com', '9012 Pine Road', 'Vancouver', 'WA', '98662', NULL, ARRAY['Warranty'], NOW(), NOW()),
  (gen_random_uuid(), 'h2o', 'Robert Martinez', '360-555-0104', 'robert.m@email.com', '3456 Elm Street', 'Vancouver', 'WA', '98663', 'Emergency calls preferred', ARRAY[], NOW(), NOW()),
  (gen_random_uuid(), 'h2o', 'Jennifer Brown', '360-555-0105', 'jennifer.brown@email.com', '7890 Maple Drive', 'Vancouver', 'WA', '98664', NULL, ARRAY['VIP'], NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. SERVICE CALLS (H2O Tenant) - Linked to customers above
-- ============================================================================
-- First, get customer IDs we just inserted
WITH customer_ids AS (
  SELECT id, name FROM customers WHERE tenant_id = 'h2o' ORDER BY created_at DESC LIMIT 5
),
-- Get a builder ID for some service calls
builder_id AS (
  SELECT id FROM builders LIMIT 1
),
-- Generate service calls with various statuses and dates
service_calls_data AS (
  SELECT 
    c.id as customer_id,
    b.id as builder_id,
    c.name as customer_name,
    c.phone,
    c.email,
    c.address_line1,
    c.city,
    c.state,
    c.zip,
    row_number() OVER () as rn
  FROM customer_ids c
  CROSS JOIN builder_id b
)
INSERT INTO service_calls (
  id, tenant_id, builder_id, customer_id, customer_name, phone, email, 
  address_line1, city, state, zip, issue_description, priority, status,
  scheduled_start, scheduled_end, assigned_to, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'h2o',
  builder_id,
  customer_id,
  customer_name,
  phone,
  email,
  address_line1,
  city,
  state,
  zip,
  CASE 
    WHEN rn = 1 THEN 'Leaky faucet in kitchen sink'
    WHEN rn = 2 THEN 'Water heater not heating properly'
    WHEN rn = 3 THEN 'Drain clogged in master bathroom'
    WHEN rn = 4 THEN 'Toilet running constantly'
    WHEN rn = 5 THEN 'Low water pressure in shower'
  END,
  CASE 
    WHEN rn IN (1, 4) THEN 'High'
    ELSE 'Normal'
  END,
  CASE 
    WHEN rn = 1 THEN 'Scheduled'
    WHEN rn = 2 THEN 'In Progress'
    WHEN rn = 3 THEN 'Completed'
    WHEN rn = 4 THEN 'Scheduled'
    WHEN rn = 5 THEN 'New'
  END,
  -- Schedule some calls for today, some for this week, some for next week
  CASE 
    WHEN rn = 1 THEN NOW() + INTERVAL '2 hours'
    WHEN rn = 2 THEN NOW() - INTERVAL '1 hour'
    WHEN rn = 3 THEN NOW() - INTERVAL '4 hours'
    WHEN rn = 4 THEN NOW() + INTERVAL '5 hours'
    WHEN rn = 5 THEN NOW() + INTERVAL '2 days'
  END,
  CASE 
    WHEN rn = 1 THEN NOW() + INTERVAL '3 hours'
    WHEN rn = 2 THEN NOW() + INTERVAL '1 hour'
    WHEN rn = 3 THEN NOW() - INTERVAL '3 hours'
    WHEN rn = 4 THEN NOW() + INTERVAL '6 hours'
    WHEN rn = 5 THEN NOW() + INTERVAL '3 days'
  END,
  CASE 
    WHEN rn IN (1, 2, 3) THEN 'Mike Tech'
    WHEN rn = 4 THEN 'Sarah Tech'
    ELSE NULL
  END,
  NOW() - INTERVAL '7 days' + (rn || ' days')::INTERVAL,
  NOW() - INTERVAL '7 days' + (rn || ' days')::INTERVAL
FROM service_calls_data;

-- Add a few more service calls spread across the month for calendar view
INSERT INTO service_calls (
  id, tenant_id, customer_id, customer_name, phone, email,
  address_line1, city, state, zip, issue_description, priority, status,
  scheduled_start, scheduled_end, assigned_to, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'h2o',
  (SELECT id FROM customers WHERE tenant_id = 'h2o' ORDER BY RANDOM() LIMIT 1),
  'Test Customer ' || (i::text),
  '360-555-' || LPAD((1000 + i)::text, 4, '0'),
  'test' || i || '@email.com',
  (100 + i)::text || ' Test Street',
  'Vancouver',
  'WA',
  '98660',
  'Test service call issue ' || i,
  CASE WHEN i % 3 = 0 THEN 'High' ELSE 'Normal' END,
  CASE 
    WHEN i % 4 = 0 THEN 'Completed'
    WHEN i % 4 = 1 THEN 'Scheduled'
    WHEN i % 4 = 2 THEN 'In Progress'
    ELSE 'New'
  END,
  -- Spread calls across the month
  NOW() + (i || ' days')::INTERVAL + (i % 8 || ' hours')::INTERVAL,
  NOW() + (i || ' days')::INTERVAL + ((i % 8 + 2) || ' hours')::INTERVAL,
  CASE WHEN i % 2 = 0 THEN 'Mike Tech' ELSE 'Sarah Tech' END,
  NOW() - INTERVAL '14 days' + (i || ' days')::INTERVAL,
  NOW() - INTERVAL '14 days' + (i || ' days')::INTERVAL
FROM generate_series(6, 25) AS i;

-- ============================================================================
-- 3. JOBS (All County) - Add a few more jobs with various phases and statuses
-- ============================================================================
WITH builder_ids AS (
  SELECT id, name FROM builders ORDER BY name LIMIT 5
),
job_data AS (
  SELECT 
    b.id as builder_id,
    b.name as builder_name,
    row_number() OVER () as rn
  FROM builder_ids b
  CROSS JOIN generate_series(1, 8) AS s
  ORDER BY b.id, s
)
INSERT INTO jobs (
  id, tenant_id, builder_id, community, lot_number, plan, phase, status,
  address_line1, city, state, zip, scheduled_start, scheduled_end,
  tech_name, assigned_to, notes, created_at, updated_at,
  warranty_start_date, warranty_end_date, completion_date
)
SELECT
  gen_random_uuid(),
  'all_county',
  builder_id,
  CASE 
    WHEN builder_name LIKE '%Toll%' THEN 'Northside'
    WHEN builder_name LIKE '%Horton%' THEN 'Curtin Creek'
    ELSE 'Test Community ' || rn::text
  END,
  LPAD((rn * 10)::text, 3, '0'),
  'Plan ' || (rn % 5 + 1)::text,
  CASE 
    WHEN rn % 6 = 0 THEN 'Completed'
    WHEN rn % 6 = 1 THEN 'Pre-Construction'
    WHEN rn % 6 = 2 THEN 'Rough-In'
    WHEN rn % 6 = 3 THEN 'Post and Beam'
    WHEN rn % 6 = 4 THEN 'Top Out'
    ELSE 'Trim'
  END,
  CASE 
    WHEN rn % 6 = 0 THEN 'Completed'
    WHEN rn % 6 = 1 THEN 'Active'
    ELSE 'In Progress'
  END,
  (rn * 100)::text || ' Construction Lane',
  'Vancouver',
  'WA',
  '98660',
  CASE 
    WHEN rn % 6 != 0 THEN NOW() + (rn || ' days')::INTERVAL
    ELSE NULL
  END,
  CASE 
    WHEN rn % 6 != 0 THEN NOW() + ((rn + 7) || ' days')::INTERVAL
    ELSE NULL
  END,
  CASE WHEN rn % 2 = 0 THEN 'John Tech' ELSE 'Jane Tech' END,
  'Project Manager ' || (rn % 3 + 1)::text,
  'Test job notes for lot ' || LPAD((rn * 10)::text, 3, '0'),
  NOW() - INTERVAL '30 days' + (rn || ' days')::INTERVAL,
  NOW() - INTERVAL '30 days' + (rn || ' days')::INTERVAL,
  CASE WHEN rn % 6 = 0 THEN NOW()::DATE - INTERVAL '90 days' ELSE NULL END,
  CASE WHEN rn % 6 = 0 THEN NOW()::DATE - INTERVAL '90 days' + INTERVAL '1 year' ELSE NULL END,
  CASE WHEN rn % 6 = 0 THEN NOW()::DATE - INTERVAL '90 days' ELSE NULL END
FROM job_data
ON CONFLICT (builder_id, community, lot_number, phase, tenant_id) DO NOTHING;

-- ============================================================================
-- 4. BIDS (Both Tenants)
-- ============================================================================
WITH builder_ids AS (
  SELECT id FROM builders ORDER BY name LIMIT 3
)
INSERT INTO bids (
  id, tenant_id, builder_id, project_name, status, due_date, sent_date,
  amount_cents, notes, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  CASE WHEN s % 2 = 0 THEN 'h2o' ELSE 'all_county' END,
  b.id,
  'Project ' || s::text || ' - ' || b.id::text,
  CASE 
    WHEN s % 4 = 0 THEN 'Accepted'
    WHEN s % 4 = 1 THEN 'Sent'
    WHEN s % 4 = 2 THEN 'Draft'
    ELSE 'Rejected'
  END,
  NOW() + (s || ' days')::INTERVAL,
  CASE WHEN s % 4 IN (0, 1) THEN NOW() - (s || ' days')::INTERVAL ELSE NULL END,
  (10000 + s * 1000) * 100, -- Amount in cents
  'Test bid notes for project ' || s::text,
  NOW() - INTERVAL '14 days' + (s || ' days')::INTERVAL,
  NOW() - INTERVAL '14 days' + (s || ' days')::INTERVAL
FROM builder_ids b
CROSS JOIN generate_series(1, 12) AS s
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. REVIEW REQUESTS (H2O) - Linked to completed service calls
-- ============================================================================
WITH completed_calls AS (
  SELECT 
    sc.id as service_call_id,
    sc.customer_name,
    sc.email,
    sc.phone,
    sc.created_at
  FROM service_calls sc
  WHERE sc.tenant_id = 'h2o' AND sc.status = 'Completed'
  LIMIT 5
)
INSERT INTO review_requests (
  id, tenant_id, service_call_id, customer_name, customer_email, customer_phone,
  token, status, sent_at, expires_at, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'h2o',
  service_call_id,
  customer_name,
  email,
  phone,
  'test_token_' || service_call_id::text,
  CASE 
    WHEN RANDOM() > 0.5 THEN 'pending'
    ELSE 'completed'
  END,
  NOW() - INTERVAL '3 days',
  NOW() + INTERVAL '27 days',
  created_at + INTERVAL '1 day',
  created_at + INTERVAL '1 day'
FROM completed_calls
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. JOB TASKS (All County) - Add tasks for some jobs
-- ============================================================================
WITH active_jobs AS (
  SELECT id, tenant_id, phase, status
  FROM jobs
  WHERE tenant_id = 'all_county' AND status != 'Completed'
  LIMIT 10
)
INSERT INTO job_tasks (
  id, job_id, tenant_id, title, description, status, assigned_to, due_date,
  created_at, updated_at
)
SELECT
  gen_random_uuid(),
  j.id,
  j.tenant_id,
  CASE 
    WHEN j.phase = 'Post and Beam' THEN 'Review Highlight Plans'
    WHEN j.phase = 'Post and Beam' THEN 'Create Job Account'
    WHEN j.phase = 'Top Out' THEN 'Place Open Order'
    ELSE 'General Task ' || s::text
  END,
  'Task description for ' || j.id::text || ' task ' || s::text,
  CASE 
    WHEN s % 3 = 0 THEN 'completed'
    WHEN s % 3 = 1 THEN 'in_progress'
    ELSE 'pending'
  END,
  CASE WHEN s % 2 = 0 THEN 'John Tech' ELSE 'Jane Tech' END,
  NOW() + (s || ' days')::INTERVAL,
  NOW() - INTERVAL '7 days' + (s || ' days')::INTERVAL,
  NOW() - INTERVAL '7 days' + (s || ' days')::INTERVAL
FROM active_jobs j
CROSS JOIN generate_series(1, 2) AS s
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Summary
-- ============================================================================
SELECT 
  'Customers' as table_name, COUNT(*) as count FROM customers WHERE tenant_id = 'h2o'
UNION ALL
SELECT 'Service Calls', COUNT(*) FROM service_calls WHERE tenant_id = 'h2o'
UNION ALL
SELECT 'Jobs', COUNT(*) FROM jobs WHERE tenant_id = 'all_county'
UNION ALL
SELECT 'Bids', COUNT(*) FROM bids
UNION ALL
SELECT 'Review Requests', COUNT(*) FROM review_requests WHERE tenant_id = 'h2o'
UNION ALL
SELECT 'Job Tasks', COUNT(*) FROM job_tasks WHERE tenant_id = 'all_county';

