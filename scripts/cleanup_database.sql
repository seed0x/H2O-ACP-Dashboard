-- Database Cleanup Script
-- WARNING: This will delete data. Review carefully before running.
-- Run this in Supabase SQL Editor or via psql

-- Option 1: Full Cleanup (deletes everything except users and system tables)
-- Uncomment the section you want to use

BEGIN;

-- ============================================
-- OPTION A: Delete Jobs and Service Calls Only
-- ============================================
-- This keeps builders, users, and other reference data

-- Delete related data first (respects foreign keys)
DELETE FROM job_contacts;
DELETE FROM review_requests WHERE job_id IS NOT NULL OR service_call_id IS NOT NULL;
DELETE FROM recovery_tickets WHERE service_call_id IS NOT NULL;

-- Delete main tables
DELETE FROM jobs;
DELETE FROM service_calls;

-- ============================================
-- OPTION B: Full Cleanup (Everything except users/system)
-- ============================================
-- Uncomment below if you want to delete everything

-- DELETE FROM job_contacts;
-- DELETE FROM bid_line_items;
-- DELETE FROM bids;
-- DELETE FROM builder_contacts;
-- DELETE FROM jobs;
-- DELETE FROM service_calls;
-- DELETE FROM review_requests;
-- DELETE FROM reviews;
-- DELETE FROM recovery_tickets;
-- DELETE FROM notifications;
-- DELETE FROM post_instances;
-- DELETE FROM publish_jobs;
-- DELETE FROM content_items;
-- DELETE FROM media_assets;
-- DELETE FROM channel_accounts;
-- DELETE FROM marketing_channels;
-- DELETE FROM portal_rules;
-- DELETE FROM builder_portal_accounts;
-- DELETE FROM portal_accounts;
-- DELETE FROM portal_definitions;
-- DELETE FROM builders;
-- DELETE FROM audit_log;  -- Optional: keep audit history

COMMIT;

-- Verify deletions
SELECT 
    'jobs' as table_name, COUNT(*) as remaining_rows FROM jobs
UNION ALL
SELECT 'service_calls', COUNT(*) FROM service_calls
UNION ALL
SELECT 'builders', COUNT(*) FROM builders
UNION ALL
SELECT 'bids', COUNT(*) FROM bids
UNION ALL
SELECT 'users', COUNT(*) FROM users;

