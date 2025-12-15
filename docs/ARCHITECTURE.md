# Architecture

- Postgres is the single source of truth
- API implements validation, business rules, and access
- Frontend communicates with API via JWT auth
- Shared tables: `builders`, `builder_contacts`
- Tenant-scoped tables contain `tenant_id` filter and include `bids`, `jobs`, `service_calls`
- Audit log captures create/update/delete operations
