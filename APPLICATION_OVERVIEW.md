# H2O-ACP Operations Platform - Application Overview

## Executive Summary

The H2O-ACP Operations Platform is a multi-tenant operations management system for plumbing contractors. It manages new construction jobs (All County), service/warranty calls (H2O), builder relationships, bids, marketing content, and customer reviews. The system includes a unified Dataflow signaling layer that aggregates actionable items across all modules.

---

## 1. Major Modules/Tabs

### 1.1 Dashboard (`/`)
- **Purpose**: Central hub with Dataflow signaling layer
- **Components**: 
  - Dataflow component showing actionable signals from Reviews, Marketing, and Dispatch
  - Signal cards with counts, descriptions, owners, and primary actions
  - Quick access to urgent items
- **Read-only**: Yes (displays aggregated data)
- **Key Features**:
  - Real-time signal counts by category
  - Direct navigation to underlying records
  - Action buttons (≤2 clicks to resolve)

### 1.2 All County Jobs (`/jobs`)
- **Purpose**: Manage new construction projects
- **Tenant**: `all_county`
- **Key Features**:
  - List view with search and status filtering
  - Job detail pages with full editing
  - Quick actions (Mark Complete)
  - Builder contact linking
  - Warranty tracking
- **Statuses**: New, Scheduled, In Progress, Completed, On Hold
- **Editable**: All fields except `id`, `created_at`, `updated_at`

### 1.3 H2O Service Calls (`/service-calls`)
- **Purpose**: Service and warranty call management
- **Tenant**: `h2o`
- **Key Features**:
  - List view with search and status filtering
  - Service call detail pages
  - Quick actions (Mark Complete, Create Review Request)
  - Priority levels (Normal, High, Urgent)
- **Statuses**: New, Scheduled, Dispatched, Completed, On Hold
- **Editable**: All fields except `id`, `created_at`, `updated_at`

### 1.4 Reviews (`/reviews`)
- **Purpose**: Customer review management and recovery
- **Tenant**: `h2o` (primary)
- **Tabs**: 
  - Review Requests (pending, sent, completed, expired)
  - Reviews (submitted reviews with ratings/comments)
  - Recovery Tickets (for low ratings)
- **Key Features**:
  - Create review requests from completed service calls
  - Public review submission page
  - Review approval/make public
  - Recovery ticket creation and tracking
- **Editable**: Status, comments, public visibility, recovery ticket status/resolution

### 1.5 Marketing (`/marketing`)
- **Purpose**: Social media content planning and posting
- **Tabs**: Content Items, Post Instances, Channel Accounts
- **Key Features**:
  - Content item creation and management
  - Generate Posts modal (bulk create PostInstances)
  - Channel-based default scheduling
  - Post instance detail with caption overrides
  - Mark Posted modal (requires proof: URL or screenshot)
  - Calendar view (shows scheduled PostInstances only)
- **Content Statuses**: Idea → Draft → Needs Approval → Scheduled → Posted
- **Post Statuses**: Draft → Scheduled → Posted → Failed
- **Editable**: All fields except `id`, `created_at`, `updated_at`

### 1.6 Analytics (`/analytics`)
- **Purpose**: Business intelligence and performance metrics
- **Sections**:
  - Overview Metrics (active jobs, completed jobs, pending calls, ratings, etc.)
  - Review Analytics (ratings distribution, completion rates)
  - Performance Metrics (job completion times, service call response times)
- **Read-only**: Yes (aggregated data only)

### 1.7 Builders (`/builders`)
- **Purpose**: Builder company and contact management
- **Key Features**:
  - Simple list view with search
  - Create/update builders
  - Builder contacts management (via detail pages)
- **Editable**: Name, notes

### 1.8 Bids (`/bids`)
- **Purpose**: Project bid and proposal management
- **Key Features**:
  - List view with filters (tenant, builder, status, search)
  - Bid detail pages with line items
  - Status tracking (Draft, Sent, Won, Lost)
- **Statuses**: Draft, Sent, Won, Lost
- **Editable**: All fields except `id`, `created_at`, `updated_at`

---

## 2. Core Data Models and Relationships

### 2.1 User Management
```
User
├── id (UUID, PK)
├── username (unique)
├── email (unique, optional)
├── hashed_password
├── full_name
├── role ('admin', 'user', 'viewer')
├── is_active
├── tenant_id (optional - None = access to all tenants)
├── created_at, updated_at, last_login
└── Notifications (one-to-many)
```

### 2.2 Builder System
```
Builder
├── id (UUID, PK)
├── name (unique)
├── notes
├── created_at, updated_at
├── contacts (one-to-many: BuilderContact)
└── Referenced by:
    ├── Jobs (many-to-one)
    ├── Bids (many-to-one, optional)
    └── ServiceCalls (many-to-one, optional)

BuilderContact
├── id (UUID, PK)
├── builder_id (FK → Builder)
├── name, role
├── phone, email
├── preferred_contact_method
├── notes
├── visibility ('both', 'jobs', 'bids')
├── created_at, updated_at
└── Linked to Jobs via JobContact (many-to-many)

JobContact (junction table)
├── job_id (FK → Job, PK)
├── builder_contact_id (FK → BuilderContact, PK)
└── role_on_job
```

### 2.3 Dispatch Module (Jobs & Service Calls)
```
Job
├── id (UUID, PK)
├── tenant_id ('all_county')
├── builder_id (FK → Builder, required)
├── community, lot_number, plan, phase
├── status
├── address (line1, city, state, zip)
├── scheduled_start, scheduled_end
├── tech_name, assigned_to
├── warranty_start_date, warranty_end_date, warranty_notes
├── completion_date
├── notes
├── created_at, updated_at
└── Unique constraint: (builder_id, community, lot_number, phase, tenant_id)

ServiceCall
├── id (UUID, PK)
├── tenant_id ('h2o')
├── builder_id (FK → Builder, optional)
├── customer_name, phone, email
├── address (line1, city, state, zip)
├── issue_description
├── priority ('Normal', 'High', 'Urgent')
├── status
├── scheduled_start, scheduled_end
├── assigned_to
├── notes
├── created_at, updated_at
└── Can trigger ReviewRequest (one-to-many, optional)
```

### 2.4 Bidding System
```
Bid
├── id (UUID, PK)
├── tenant_id
├── builder_id (FK → Builder, optional)
├── project_name
├── status ('Draft', 'Sent', 'Won', 'Lost')
├── due_date, sent_date
├── amount_cents
├── notes
├── created_at, updated_at
└── line_items (one-to-many: BidLineItem)

BidLineItem
├── id (UUID, PK)
├── bid_id (FK → Bid)
├── category, description
├── qty, unit_price_cents, total_cents
├── notes
└── created_at, updated_at
```

### 2.5 Marketing Module
```
MarketingChannel
├── id (UUID, PK)
├── key (unique, e.g., 'google_business_profile', 'facebook')
├── display_name
├── supports_autopost (boolean)
└── accounts (one-to-many: ChannelAccount)

ChannelAccount
├── id (UUID, PK)
├── tenant_id
├── channel_id (FK → MarketingChannel)
├── name, external_id, profile_url
├── login_email, credential_vault_ref
├── oauth_connected, oauth_provider, oauth_token_ref
├── status ('active', 'inactive')
├── notes
└── post_instances (one-to-many: PostInstance)

ContentItem
├── id (UUID, PK)
├── tenant_id
├── title
├── base_caption (can be overridden per PostInstance)
├── media_urls (array)
├── cta_type, cta_url
├── tags (array)
├── target_city
├── template_id (future use)
├── status ('Idea', 'Draft', 'Needs Approval', 'Scheduled', 'Posted')
├── owner, reviewer
├── draft_due_date
├── notes
├── source_type, source_ref
├── created_at, updated_at
└── post_instances (one-to-many: PostInstance)

PostInstance
├── id (UUID, PK)
├── tenant_id
├── content_item_id (FK → ContentItem)
├── channel_account_id (FK → ChannelAccount)
├── caption_override (optional, overrides base_caption)
├── scheduled_for (datetime)
├── status ('Draft', 'Scheduled', 'Posted', 'Failed')
├── posted_at, post_url
├── posted_manually, screenshot_url
├── autopost_enabled
├── publish_job_id (FK → PublishJob, if autoposted)
├── last_error
└── created_at, updated_at

PublishJob
├── id (UUID, PK)
├── tenant_id
├── post_instance_id (FK → PostInstance)
├── attempt_no
├── method, provider
├── status
├── response_ref, error
└── created_at
```

### 2.6 Review System
```
ReviewRequest
├── id (UUID, PK)
├── tenant_id
├── service_call_id (FK → ServiceCall, optional)
├── job_id (FK → Job, optional)
├── customer_name, customer_email, customer_phone
├── token (unique, for public review link)
├── status ('pending', 'sent', 'completed', 'expired')
├── sent_at, completed_at, expires_at
├── reminder_sent
├── created_at, updated_at
└── review (one-to-one: Review, optional)

Review
├── id (UUID, PK)
├── review_request_id (FK → ReviewRequest, unique)
├── rating (1-5 stars)
├── comment
├── customer_name, customer_email
├── is_public (boolean)
├── created_at, updated_at
└── recovery_tickets (one-to-many: RecoveryTicket, optional)

RecoveryTicket
├── id (UUID, PK)
├── tenant_id
├── review_id (FK → Review)
├── service_call_id (FK → ServiceCall, optional)
├── customer_name, customer_email, customer_phone
├── issue_description
├── status ('open', 'in_progress', 'resolved', 'closed')
├── assigned_to
├── resolution_notes
└── created_at, updated_at
```

### 2.7 Supporting Models
```
AuditLog
├── id (UUID, PK)
├── tenant_id (optional)
├── entity_type, entity_id
├── action ('create', 'update', 'delete')
├── field (optional, for updates)
├── old_value, new_value (optional)
├── changed_by
└── changed_at
└── READ-ONLY: All fields (system-generated)

Notification
├── id (UUID, PK)
├── user_id (FK → User, optional - None = all users in tenant)
├── tenant_id
├── type ('overdue', 'reminder', 'status_change', 'review_received', 'escalation')
├── title, message
├── entity_type, entity_id (optional)
├── read (boolean)
└── created_at
```

---

## 3. Read-Only vs Editable

### 3.1 Read-Only Entities
- **AuditLog**: System-generated, cannot be modified
- **Analytics**: Aggregated data, no direct editing
- **PublishJob**: System-generated from autopost attempts
- **Dashboard/Dataflow**: Display-only, actions navigate to editable entities

### 3.2 Editable Entities (with restrictions)
- **User**: Admin-only creation/editing, password changes require verification
- **Builder**: Name must be unique, contacts cascade delete
- **Job**: Status changes trigger automation, unique constraint on (builder, community, lot, phase, tenant)
- **ServiceCall**: Status changes trigger automation
- **Bid**: Line items cascade delete with bid
- **ContentItem**: Status workflow enforced (Idea → Draft → Needs Approval → Scheduled → Posted)
- **PostInstance**: 
  - Scheduled instances require caption + datetime
  - Marking as Posted requires proof (URL or screenshot)
  - Cannot edit after Posted
- **ReviewRequest**: Status transitions controlled
- **Review**: Can toggle public visibility, cannot edit rating/comment after submission
- **RecoveryTicket**: Status transitions controlled

### 3.3 System-Generated Fields (never editable)
- `id` (UUID)
- `created_at`, `updated_at`
- `token` (ReviewRequest)
- `publish_job_id` (PostInstance, set by autopost system)

---

## 4. Existing Workflows

### 4.1 Job Completion Workflow
1. User marks Job status as "Completed"
2. **Automation triggers** (`on_job_status_changed`):
   - Sets `completion_date` if not already set
   - Creates notification for `assigned_to` user (if exists)
   - Checks for BuilderContact with email
   - If contact exists and no ReviewRequest exists, creates ReviewRequest
3. ReviewRequest can be sent manually or automatically
4. Customer submits review via public link
5. If rating < 3 stars, RecoveryTicket auto-created

### 4.2 Service Call Completion Workflow
1. User marks ServiceCall status as "Completed"
2. **Automation triggers** (`on_service_call_status_changed`):
   - Creates notification for `assigned_to` user (if exists)
   - Calls `on_service_call_completed`:
     - Checks if email exists and status is "completed"
     - Checks if ReviewRequest already exists
     - Creates ReviewRequest if conditions met
     - Sends review request email
3. Customer submits review via public link
4. If rating < 3 stars, RecoveryTicket auto-created

### 4.3 Review Submission Workflow
1. Customer submits review via public link (token-based)
2. **Automation triggers** (`on_review_received`):
   - If rating < 3 stars:
     - Creates RecoveryTicket
     - Notifies all admin users
   - If rating ≥ 3 stars:
     - Notifies all admin users
3. Admin can make review public (`is_public = true`)
4. RecoveryTicket can be assigned and resolved

### 4.4 Marketing Content Workflow
1. Create ContentItem (status: "Idea" or "Draft")
2. Add base caption, media URLs, CTA
3. Change status to "Needs Approval" (if required)
4. Approver changes status to "Scheduled"
5. Click "Generate Posts" button:
   - Select Channel Accounts
   - System applies channel-based default scheduling
   - Optionally override caption per account
   - Creates PostInstances (status: "Draft" or "Scheduled")
6. PostInstances with caption + datetime become "Scheduled"
7. Calendar view shows only Scheduled PostInstances
8. When post is published:
   - Mark as Posted (requires proof: URL or screenshot)
   - Status changes to "Posted"
   - `posted_at` timestamp set

### 4.5 Scheduled Tasks (Background)
- **Overdue Items Check**: Runs periodically, creates notifications for overdue jobs/service calls
- **Review Request Automation**: Sends reminders for pending requests
- **Stale Items Escalation**: Escalates items that haven't been updated
- **Daily Summary**: Generates daily reports (if configured)

---

## 5. Builders Module - Detailed

### 5.1 Builder Entity
- **Purpose**: Represents a builder company (e.g., "ABC Construction")
- **Fields**:
  - `name`: Unique identifier (required)
  - `notes`: Free-form text for additional information
- **Relationships**:
  - Has many `BuilderContact` records
  - Referenced by `Job` (required), `Bid` (optional), `ServiceCall` (optional)

### 5.2 BuilderContact Entity
- **Purpose**: Individual contacts within a builder company
- **Fields**:
  - `name`: Contact's name
  - `role`: Job title/role (e.g., "Project Manager")
  - `phone`, `email`: Contact information
  - `preferred_contact_method`: How to reach them
  - `notes`: Additional context
  - `visibility`: Controls where contact appears ('both', 'jobs', 'bids')
- **Relationships**:
  - Belongs to one `Builder`
  - Can be linked to multiple `Job` records via `JobContact` junction table

### 5.3 JobContact Junction Table
- **Purpose**: Links specific builder contacts to specific jobs
- **Fields**:
  - `job_id` + `builder_contact_id` (composite primary key)
  - `role_on_job`: Optional role description for this specific job
- **Use Case**: A builder may have multiple contacts, and different jobs may involve different contacts

### 5.4 Builder Workflows
1. **Create Builder**: Admin creates builder with name and optional notes
2. **Add Contacts**: Admin adds builder contacts with role and contact info
3. **Link to Job**: When creating/editing a job, admin can link builder contacts
4. **Review Request**: When job completes, system checks for builder contact email to create review request

### 5.5 Builder Data Usage
- **In Jobs**: Builder is required, contacts can be linked for communication
- **In Bids**: Builder is optional, used for tracking which builder the bid is for
- **In Service Calls**: Builder is optional, used when service call is related to a builder project
- **In Review Requests**: Builder contacts' emails are used to send review requests for completed jobs

### 5.6 Builder API Endpoints
- `POST /builders` - Create builder
- `GET /builders` - List builders (with search)
- `GET /builders/{id}` - Get builder details
- `PATCH /builders/{id}` - Update builder
- `DELETE /builders/{id}` - Delete builder (cascades to contacts)
- `POST /builders/{id}/contacts` - Add contact
- `GET /builders/{id}/contacts` - List contacts
- `PATCH /builder-contacts/{id}` - Update contact
- `DELETE /builder-contacts/{id}` - Delete contact

---

## 6. Dataflow Signaling Layer

### 6.1 Purpose
Aggregates actionable items across Reviews, Marketing, and Dispatch modules into a unified view. Not a dashboard—it's a signaling layer that highlights what needs attention.

### 6.2 Signal Types

#### Reviews Signals
- `review_not_requested`: Completed service calls without review request
- `review_no_response`: Review requests sent but no response (7+ days)
- `needs_recovery`: Reviews with 1-3 star ratings requiring recovery

#### Marketing Signals
- `marketing_posts_not_ready`: Posts scheduled in next 72h but not ready (missing caption or in wrong status)
- `marketing_posts_missed`: Posts past scheduled time not marked Posted
- `marketing_needs_approval`: Content items needing approval

#### Dispatch Signals
- `dispatch_unscheduled_calls`: Service calls without scheduled time
- `dispatch_jobs_unassigned_tech`: Jobs without assigned tech
- `dispatch_todays_jobs_by_tech`: Today's jobs grouped by tech (informational)

### 6.3 Signal Properties
Each signal includes:
- `id`: Unique identifier
- `type`: Signal type (see above)
- `title`: Short description
- `description`: Detailed explanation
- `owner`: Default owner from `signal_config.py` (configurable)
- `priority`: 'low', 'medium', 'high'
- `actions`: Array of action objects with `label`, `action` ('navigate', 'assign', 'mark_done'), `params`
- `icon`: Emoji or icon identifier
- `link`: Direct link to underlying record

### 6.4 Signal Configuration
- **Default Ownership**: Defined in `apps/api/app/core/signal_config.py`
  - Maps signal types to default owners (e.g., 'admin', 'marketing_manager')
  - Supports wildcard patterns
- **Schedule Defaults**: Defined in `apps/api/app/core/schedule_config.py`
  - Channel-based default scheduling slots
  - Format: `(days_from_now, hour, minute)`

### 6.5 API Endpoints
- `GET /api/v1/signals/all?tenant_id={id}` - Get all signals
- `GET /api/v1/signals/reviews?tenant_id={id}` - Get reviews signals only
- `GET /api/v1/signals/marketing?tenant_id={id}` - Get marketing signals only
- `GET /api/v1/signals/dispatch?tenant_id={id}` - Get dispatch signals only

### 6.6 Frontend Integration
- **Sidebar**: Badge counts for Reviews, Marketing, Dispatch categories
- **Dashboard**: Dataflow component showing all signals with cards
- **Auto-refresh**: Signal counts refresh every 30 seconds

---

## 7. Authentication & Authorization

### 7.1 Authentication
- JWT-based authentication
- Login endpoint: `POST /api/v1/login`
- Token stored in localStorage
- Token included in `Authorization: Bearer {token}` header

### 7.2 User Roles
- **admin**: Full access, can manage users
- **user**: Standard access, can edit entities
- **viewer**: Read-only access (if implemented)

### 7.3 Tenant Isolation
- Most entities have `tenant_id` field
- Users can have `tenant_id` set (restricted to that tenant) or `None` (access to all tenants)
- API endpoints filter by `tenant_id` parameter

---

## 8. Audit Logging

### 8.1 Scope
All create, update, and delete operations are logged to `AuditLog` table.

### 8.2 Logged Information
- `entity_type`: Type of entity (e.g., 'job', 'service_call', 'builder')
- `entity_id`: UUID of the entity
- `action`: 'create', 'update', 'delete'
- `field`: Field name (for updates)
- `old_value`, `new_value`: Previous and new values (for updates)
- `changed_by`: Username of user who made the change
- `changed_at`: Timestamp

### 8.3 Access
- `GET /api/v1/audit?entity_type={type}&entity_id={id}` - Get audit log for specific entity
- Displayed in detail pages (e.g., Job detail page shows audit history)

---

## 9. Notifications

### 9.1 Notification Types
- `overdue`: Item is past due
- `reminder`: Reminder for upcoming item
- `status_change`: Entity status changed
- `review_received`: New review submitted
- `escalation`: Item escalated due to inactivity

### 9.2 Notification Targets
- `user_id`: Specific user (if set)
- `user_id = None`: All users in tenant (broadcast)

### 9.3 API Endpoints
- `GET /api/v1/notifications` - List notifications for current user
- `PATCH /api/v1/notifications/{id}/read` - Mark as read
- `DELETE /api/v1/notifications/{id}` - Delete notification

### 9.4 Frontend Integration
- NotificationCenter component (if implemented)
- Badge counts in sidebar
- Toast notifications for actions

---

## 10. Key Constraints & Business Rules

### 10.1 Data Integrity
- Builder name must be unique
- Job unique constraint: (builder_id, community, lot_number, phase, tenant_id)
- ReviewRequest token must be unique
- ReviewRequest can have either `service_call_id` OR `job_id` (not both)

### 10.2 Workflow Rules
- PostInstance: Cannot be "Scheduled" without `caption_override` or `base_caption` AND `scheduled_for`
- PostInstance: Cannot mark as "Posted" without proof (URL or screenshot)
- ContentItem: Status transitions should follow: Idea → Draft → Needs Approval → Scheduled → Posted
- ReviewRequest: Status transitions: pending → sent → completed/expired

### 10.3 Automation Rules
- Job/ServiceCall completion triggers review request creation (if email exists)
- Low rating (< 3 stars) triggers recovery ticket creation
- Status changes trigger notifications for assigned users

---

## 11. Technology Stack

### 11.1 Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (via SQLAlchemy async)
- **ORM**: SQLAlchemy 2.0+ (async)
- **Migrations**: Alembic
- **Authentication**: JWT (python-jose)
- **Scheduling**: APScheduler (for background tasks)

### 11.2 Frontend
- **Framework**: Next.js 14 (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + inline styles
- **HTTP Client**: Axios
- **Icons**: @iconscout/react-unicons

### 11.3 Deployment
- **API**: Can be deployed to Vercel (serverless), Railway, or Docker
- **Web**: Next.js static/SSR to Vercel or similar
- **Database**: PostgreSQL (Supabase, Railway, or self-hosted)

---

## 12. API Structure

### 12.1 Base URL
- `/api/v1` prefix for all API routes

### 12.2 Main Endpoint Groups
- `/builders` - Builder management
- `/bids` - Bid management
- `/jobs` - Job management
- `/service-calls` - Service call management
- `/reviews` - Review system
- `/marketing` - Marketing module (content items, post instances, channels)
- `/signals` - Dataflow signals
- `/analytics` - Analytics endpoints
- `/notifications` - Notification management
- `/audit` - Audit log access
- `/users` - User management (admin only)

### 12.3 Common Patterns
- List endpoints: `GET /{resource}?tenant_id={id}&status={status}&search={query}`
- Detail endpoints: `GET /{resource}/{id}`
- Create endpoints: `POST /{resource}` (with body)
- Update endpoints: `PATCH /{resource}/{id}` (with body)
- Delete endpoints: `DELETE /{resource}/{id}`

---

## 13. Future Considerations

### 13.1 Known Limitations
- Builder contacts are simple - no hierarchy or organization
- No bulk operations for many entities
- Review request emails are sent but email delivery status not tracked
- Marketing autopost requires external integration setup
- No built-in file upload (media URLs must be external)

### 13.2 Potential Enhancements
- Builder contact hierarchy (primary, secondary)
- Bulk job/service call operations
- Email delivery tracking
- File upload service integration
- Advanced analytics and reporting
- Mobile app (API is ready)
- Multi-language support
- Advanced permission system (beyond roles)

---

## 14. Integration Points

### 14.1 External Services
- **Email**: Review request emails (requires SMTP configuration)
- **OAuth**: Marketing channel accounts (Facebook, Google, Instagram, etc.)
- **File Storage**: Media URLs for marketing content (external service required)

### 14.2 Internal Integrations
- **Dataflow**: Aggregates signals from all modules
- **Notifications**: Triggered by automation and scheduled tasks
- **Audit Log**: Captures all changes automatically
- **Analytics**: Aggregates data from all modules

---

This overview provides a complete picture of the application as it exists today. Use this as a reference when implementing new features to ensure clean integration with existing systems.

