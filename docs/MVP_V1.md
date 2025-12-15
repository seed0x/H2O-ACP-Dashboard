# MVP v1

This is an MVP implementation of the Plumbing Ops Platform.

Tenants: `all_county`, `h2o`.

Shared data: `builders`, `builder_contacts`.

Tenant-scoped data: `bids`, `jobs` (All County), `service_calls` (H2O), `audit_log`.

Authentication:
- `POST /login` accepts `password` in query string and returns a JWT for the `admin` user.
- For MVP, the frontend stores the JWT in `localStorage` and includes it via `Authorization` header: `Bearer <token>`.
	Note: production apps should use httpOnly cookies for better security.

Endpoints overview:
- GET /health
- Auth: POST /login
- Builders: /builders
- Builder contacts: /builders/{id}/contacts
- Bids: /bids
- Bid line items: /bids/{id}/line-items
- Jobs: /jobs
- Service calls: /service-calls
- Audit: /audit

See README for running locally.
