# Builder System Audit Report

**Date**: 2025-01-XX  
**Purpose**: Document current Builder implementation before adding Vendors/Portals or workflow linking features

---

## 1. Builder Table Fields

### 1.1 Builder Model Schema
```python
class Builder(Base):
    __tablename__ = "builders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False, unique=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

### 1.2 Field Details

| Field | Type | Nullable | Unique | Description |
|-------|------|----------|--------|-------------|
| `id` | UUID | No | Yes (PK) | Primary key, auto-generated |
| `name` | Text | No | Yes | Builder company name (unique constraint) |
| `notes` | Text | Yes | No | Free-form notes about the builder |
| `created_at` | DateTime (TZ) | No | No | Timestamp when record was created (system-generated) |
| `updated_at` | DateTime (TZ) | No | No | Timestamp when record was last updated (system-generated) |

### 1.3 Constraints
- **Unique Constraint**: `name` must be unique across all builders
- **No tenant_id**: Builders are **shared across all tenants** (see Section 5)

### 1.4 Relationships
- **One-to-Many**: `Builder` → `BuilderContact` (cascade delete)
- **One-to-Many**: `Builder` → `Job` (required relationship)
- **One-to-Many**: `Builder` → `Bid` (optional relationship)
- **One-to-Many**: `Builder` → `ServiceCall` (optional relationship)

---

## 2. Builder → Job Relationship

### 2.1 Relationship Type
**Required Many-to-One**: Every Job **must** have a Builder.

### 2.2 Database Schema
```python
class Job(Base):
    builder_id = Column(UUID(as_uuid=True), ForeignKey("builders.id"), nullable=False)
    # ... other fields
```

### 2.3 Key Characteristics
- **Required**: `nullable=False` - Jobs cannot exist without a builder
- **Foreign Key**: References `builders.id` with standard FK constraint
- **Part of Unique Constraint**: Builder is included in the job uniqueness constraint:
  ```python
  UniqueConstraint('builder_id', 'community', 'lot_number', 'phase', 'tenant_id', 
                   name='uq_job_per_lot_phase')
  ```
  This ensures that the same builder cannot have duplicate jobs for the same community/lot/phase/tenant combination.

### 2.4 Usage in Jobs
- **Filtering**: Jobs can be filtered by `builder_id` in list endpoints
- **Display**: Builder name is shown in job lists and detail pages
- **Workflow**: When a job is completed, the system checks for builder contacts to create review requests (see Section 4.1)

### 2.5 API Endpoints
- `GET /api/v1/jobs?builder_id={uuid}` - Filter jobs by builder
- Job creation requires `builder_id` in request body
- Job detail pages include builder information

---

## 3. Builder → Service Call Relationship

### 3.1 Relationship Type
**Optional Many-to-One**: Service Calls **may** have a Builder, but it's not required.

### 3.2 Database Schema
```python
class ServiceCall(Base):
    builder_id = Column(UUID(as_uuid=True), ForeignKey("builders.id"), nullable=True)
    # ... other fields
```

### 3.3 Key Characteristics
- **Optional**: `nullable=True` - Service calls can exist without a builder
- **Foreign Key**: References `builders.id` with standard FK constraint
- **Index**: There's an index on `builder_id` for performance: `ix_service_calls_builder_id`

### 3.4 Usage in Service Calls
- **Filtering**: Service calls can be filtered by `builder_id` in list endpoints
- **Display**: Builder name is shown in service call lists and detail pages (if set)
- **Import Automation**: When importing service calls from external sources (e.g., Outlook calendar), the system can auto-create builders if a `builder_name` is found in the import data (see Section 4.2)

### 3.5 Use Cases
- Service calls related to builder projects (warranty work, follow-ups)
- Service calls that originated from a builder referral
- Tracking which builder is responsible for a service call

### 3.6 API Endpoints
- `GET /api/v1/service-calls?builder_id={uuid}` - Filter service calls by builder
- Service call creation allows `builder_id` in request body (optional)

---

## 4. Existing Builder-Specific Workflows

### 4.1 Job Completion → Review Request Automation

**Trigger**: When a Job status changes to "Completed"

**Workflow**:
1. System checks if job has a `builder_id` (always true, since it's required)
2. Queries for `BuilderContact` records associated with the builder
3. If contacts exist and the first contact has an email:
   - Checks if a `ReviewRequest` already exists for this job
   - If no review request exists, creates one using:
     - `customer_name`: First builder contact's name
     - `customer_email`: First builder contact's email
     - `customer_phone`: First builder contact's phone
     - `job_id`: The completed job's ID
     - `tenant_id`: The job's tenant_id
4. Review request can then be sent to the builder contact

**Code Location**: `apps/api/app/core/automation.py` → `on_job_status_changed()`

**Notes**:
- Only uses the **first** builder contact found (may need improvement)
- Requires builder contact to have an email address
- Review request is created but not automatically sent (manual send required)

### 4.2 Import/Migration Automation

**Trigger**: When importing jobs or service calls from external sources (e.g., Outlook calendar, CSV)

**Workflow**:
1. Import process encounters a `builder_name` in the source data
2. Calls `find_or_create_builder()` function:
   - First attempts exact case-insensitive match on builder name
   - If not found, attempts partial match (ILIKE)
   - If still not found, creates new builder with:
     - `name`: The builder name from import
     - `notes`: "Auto-created during import by {username}"
3. Uses the found/created builder for the imported job or service call

**Code Location**: `apps/api/app/crud.py` → `find_or_create_builder()`

**Usage**:
- `bulk_import_jobs()` - Creates builders when importing jobs
- `bulk_import_service_calls()` - Creates builders when importing service calls

**Notes**:
- Auto-creation includes audit logging
- Handles race conditions (multiple imports creating same builder simultaneously)
- Case-insensitive matching prevents duplicates

### 4.3 Builder Contact Visibility Filtering

**Workflow**: When listing builder contacts, the system filters by `visibility` field:
- `visibility = 'both'`: Contact appears for all tenants
- `visibility = 'all_county'`: Contact appears only for All County tenant
- `visibility = 'h2o'`: Contact appears only for H2O tenant

**Code Location**: `apps/api/app/crud.py` → `list_builder_contacts()`

**Note**: This is a tenant-scoped visibility filter, but the Builder itself is not tenant-specific.

### 4.4 Job Contact Linking

**Workflow**: Builder contacts can be linked to specific jobs via the `JobContact` junction table:
- Allows associating specific builder contacts with specific jobs
- Includes optional `role_on_job` field for job-specific role description
- Used for communication and tracking which contact is responsible for a job

**Code Location**: 
- `apps/api/app/crud.py` → `add_job_contact()`, `remove_job_contact()`
- `apps/api/app/api/router.py` → Job contact endpoints

---

## 5. Tenant-Specific vs Shared

### 5.1 **Builders are SHARED across all tenants**

**Evidence**:
- `Builder` model has **NO `tenant_id` field**
- Builder audit logs use `tenant_id=None`:
  ```python
  await db.execute(models.AuditLog.__table__.insert().values(
      tenant_id=None,  # <-- No tenant_id
      entity_type='builder',
      ...
  ))
  ```
- Builder list endpoint has **no tenant_id parameter**:
  ```python
  @router.get('/builders')
  async def list_builders(...)  # No tenant_id filter
  ```

### 5.2 Implications
- **Single Builder Pool**: All tenants see and use the same builder list
- **No Tenant Isolation**: A builder created by one tenant is visible to all tenants
- **Shared Data**: Builder name uniqueness is enforced globally, not per-tenant
- **Cross-Tenant Usage**: A builder can be used in jobs for "all_county" tenant and service calls for "h2o" tenant

### 5.3 Builder Contacts
- Builder contacts **do have tenant visibility** via the `visibility` field
- But the Builder itself is shared - contacts are just filtered by visibility when listing

### 5.4 Design Rationale
- Builders represent real-world construction companies
- These companies may work with multiple plumbing contractors (tenants)
- Sharing builders prevents duplicate entries for the same company
- Tenant-specific data (like which contacts to use) is handled via the `visibility` field on contacts

---

## 6. Portal/Login Storage

### 6.1 **Builders DO NOT have portal/logins stored**

**Evidence**:
- `Builder` model has only: `id`, `name`, `notes`, `created_at`, `updated_at`
- **No fields for**:
  - Portal URL
  - Login credentials
  - External system IDs
  - OAuth tokens
  - Authentication information
  - API keys

### 6.2 Comparison with Other Entities
For reference, `ChannelAccount` (marketing module) **does** have portal/login fields:
```python
class ChannelAccount(Base):
    login_email = Column(String, nullable=True)
    credential_vault_ref = Column(String, nullable=True)
    oauth_connected = Column(Boolean, nullable=False, default=False)
    oauth_provider = Column(String, nullable=True)
    oauth_token_ref = Column(String, nullable=True)
    external_id = Column(String, nullable=True)
```

**Builders have none of these fields.**

### 6.3 Current State
- Builders are simple reference entities
- No integration with external systems
- No portal access or authentication
- No external API connections

---

## 7. Tags and Metadata

### 7.1 **Builders DO NOT have tags or metadata fields**

**Evidence**:
- `Builder` model has only: `id`, `name`, `notes`, `created_at`, `updated_at`
- **No fields for**:
  - Tags (array or text)
  - Categories
  - Metadata (JSON or key-value)
  - Type/classification
  - External identifiers
  - Custom fields

### 7.2 Comparison with Other Entities
For reference, `ContentItem` (marketing module) **does** have tags:
```python
class ContentItem(Base):
    tags = Column(ARRAY(String), nullable=True)
    target_city = Column(String, nullable=True)
    source_type = Column(String, nullable=True)
    source_ref = Column(String, nullable=True)
```

**Builders have none of these fields.**

### 7.3 Current State
- Only `name` and `notes` fields for categorization
- `notes` field is free-form text (could theoretically contain tags, but not structured)
- No way to link builders to external systems via metadata
- No way to categorize or group builders beyond name matching

### 7.4 Potential Workaround
- `notes` field could be used to store unstructured metadata
- But this is not searchable, filterable, or structured
- Not suitable for programmatic linking to portals or external systems

---

## 8. Summary of Findings

### 8.1 Builder Table Fields
- **Minimal schema**: Only `id`, `name`, `notes`, `created_at`, `updated_at`
- **No tenant_id**: Builders are shared across all tenants
- **Unique constraint**: Builder name must be unique globally

### 8.2 Relationships
- **Jobs**: Required relationship (every job must have a builder)
- **Service Calls**: Optional relationship (service calls may have a builder)
- **Bids**: Optional relationship (bids may have a builder)
- **BuilderContacts**: One-to-many (builder has multiple contacts)

### 8.3 Existing Workflows
1. **Job Completion Automation**: Creates review requests using builder contact emails
2. **Import Automation**: Auto-creates builders during bulk imports
3. **Contact Visibility Filtering**: Filters contacts by tenant visibility
4. **Job Contact Linking**: Links specific contacts to specific jobs

### 8.4 Portal/Login Storage
- **NO**: Builders do not have any portal or login fields
- **NO**: No external authentication or API integration
- **NO**: No credential storage

### 8.5 Tags/Metadata
- **NO**: Builders do not have tags or structured metadata fields
- **NO**: No way to programmatically link builders to external systems
- **LIMITED**: Only `notes` field available (unstructured text)

### 8.6 Tenant Scope
- **SHARED**: Builders are shared across all tenants (no tenant_id field)
- **Implication**: Any builder created by any tenant is visible to all tenants
- **Design**: Prevents duplicate builder entries for the same company

---

## 9. Recommendations for Future Development

### 9.1 If Adding Portal/Login Support
**Required Changes**:
1. Add fields to `Builder` model:
   - `portal_url` (String, nullable)
   - `portal_type` (String, nullable) - e.g., 'buildertrend', 'coconstruct', 'procore'
   - `external_id` (String, nullable) - ID in external system
   - `api_key` or `credential_vault_ref` (String, nullable)
   - `oauth_connected` (Boolean, default=False)
   - `last_sync_at` (DateTime, nullable)

2. Consider tenant isolation:
   - If portals should be tenant-specific, add `tenant_id` to Builder
   - Or create a separate `BuilderPortal` junction table

### 9.2 If Adding Tags/Metadata
**Required Changes**:
1. Add fields to `Builder` model:
   - `tags` (ARRAY(String), nullable) - For categorization
   - `metadata` (JSON, nullable) - For flexible key-value storage
   - `category` or `type` (String, nullable) - For classification

2. Consider search/filtering:
   - Add indexes on tag/category fields
   - Update list endpoints to filter by tags

### 9.3 If Adding Workflow Linking
**Required Changes**:
1. Add fields to `Builder` model:
   - `workflow_enabled` (Boolean, default=False)
   - `workflow_config` (JSON, nullable) - For workflow-specific settings
   - `workflow_system` (String, nullable) - Which workflow system to use

2. Or create separate `BuilderWorkflow` table:
   - Links builders to workflow systems
   - Allows multiple workflows per builder
   - More flexible for future expansion

### 9.4 Migration Considerations
- **Backward Compatibility**: Existing builders will have NULL values for new fields
- **Data Migration**: May need to populate new fields from existing data
- **API Changes**: Update schemas and endpoints to handle new fields
- **Frontend Updates**: Update UI to display/edit new fields

---

## 10. Current API Endpoints

### 10.1 Builder Endpoints
- `POST /api/v1/builders` - Create builder
- `GET /api/v1/builders` - List builders (with search, pagination)
- `GET /api/v1/builders/{id}` - Get builder details
- `PATCH /api/v1/builders/{id}` - Update builder
- `DELETE /api/v1/builders/{id}` - Delete builder (cascades to contacts)

### 10.2 Builder Contact Endpoints
- `POST /api/v1/builders/{id}/contacts` - Create contact
- `GET /api/v1/builders/{id}/contacts` - List contacts (with tenant visibility filter)
- `PATCH /api/v1/builder-contacts/{id}` - Update contact
- `DELETE /api/v1/builder-contacts/{id}` - Delete contact

### 10.3 Job Contact Endpoints
- `GET /api/v1/jobs/{id}/contacts` - Get contacts linked to job
- `POST /api/v1/jobs/{id}/contacts` - Link contact to job
- `DELETE /api/v1/jobs/{id}/contacts/{contact_id}` - Unlink contact from job

---

## 11. Database Constraints and Indexes

### 11.1 Constraints
- **Unique Constraint**: `uq_builders_name` on `name` column
- **Foreign Keys**:
  - `jobs.builder_id` → `builders.id`
  - `service_calls.builder_id` → `builders.id`
  - `bids.builder_id` → `builders.id`
  - `builder_contacts.builder_id` → `builders.id` (CASCADE DELETE)

### 11.2 Indexes
- Index on `builder_contacts.builder_id` for performance
- Index on `service_calls.builder_id` for filtering
- Index on `jobs.builder_id` (implicit via FK, but may have explicit index)

---

## 12. Frontend Implementation

### 12.1 Builders Page (`/builders`)
- Simple list view with search
- Create/update builder form
- Displays: name, notes, created date
- **No portal/login UI**
- **No tags/metadata UI**

### 12.2 Builder Usage in Other Pages
- **Jobs**: Builder dropdown/selector in job forms
- **Service Calls**: Optional builder selector
- **Bids**: Optional builder selector
- **Job Detail**: Shows builder name and linked contacts

---

**End of Audit Report**

This document provides a complete picture of the Builder system as it exists today. Use this as a reference when planning additions for Vendors/Portals or workflow linking features.

