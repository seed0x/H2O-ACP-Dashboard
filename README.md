# Plumbing Ops Platform

A comprehensive operations management platform for plumbing businesses, built with Next.js (frontend) and FastAPI (backend).

## Features

- **Service Call Management**: Track service calls with workflow, check-offs, and follow-up tasks
- **Job Management**: Manage construction jobs with phases, contacts, and scheduling
- **Customer Management**: Centralized customer database with service history
- **Marketing Module**: Plan and schedule social media content across multiple accounts
- **Review System**: Automated review request generation and tracking
- **Analytics Dashboard**: Real-time insights and performance metrics
- **Tech Scheduling**: Daily schedules for field technicians
- **Bid Management**: Track bids from draft to won/lost

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.12, SQLAlchemy 2.0, Alembic
- **Database**: PostgreSQL (Supabase/Render/Railway)
- **Deployment**: Vercel (frontend), Render (backend)

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.12+
- PostgreSQL database
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Plumbing-ops-platform
   ```

2. **Set up backend**
   ```bash
   cd apps/api
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your database URL
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

3. **Set up frontend**
   ```bash
   cd apps/web
   npm install
   cp .env.example .env.local
   # Edit .env.local with your API URL (optional for local dev)
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for Vercel and Render.

### Quick Deployment Checklist

**Backend (Render):**
- [ ] Create PostgreSQL database
- [ ] Create Render web service
- [ ] Set environment variables (DATABASE_URL, JWT_SECRET, etc.)
- [ ] Deploy and run migrations

**Frontend (Vercel):**
- [ ] Connect GitHub repository
- [ ] Set root directory to `apps/web`
- [ ] Set `NEXT_PUBLIC_API_URL` environment variable
- [ ] Deploy

## Environment Variables

### Backend (.env)

See `.env.example` for all required variables. Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `ADMIN_PASSWORD`: Admin user password
- `JWT_SECRET`: Secret for JWT tokens
- `CORS_ORIGINS`: Allowed CORS origins

### Frontend (.env.local)

- `NEXT_PUBLIC_API_URL`: Backend API URL (optional in development)

## Project Structure

```
.
├── apps/
│   ├── api/              # FastAPI backend
│   │   ├── app/
│   │   │   ├── api/      # API routes
│   │   │   ├── core/     # Core utilities
│   │   │   ├── db/       # Database session
│   │   │   └── models.py # SQLAlchemy models
│   │   ├── alembic/      # Database migrations
│   │   └── requirements.txt
│   └── web/              # Next.js frontend
│       ├── app/          # Next.js app directory
│       ├── components/   # React components
│       └── lib/          # Utilities
├── vercel.json           # Vercel configuration
├── render.yaml           # Render configuration
└── DEPLOYMENT.md         # Deployment guide
```

## Database Migrations

```bash
cd apps/api

# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

## Testing

```bash
# Backend tests
cd apps/api
pytest

# Frontend tests (if configured)
cd apps/web
npm test
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

Proprietary - All rights reserved

## Support

For deployment issues, see [DEPLOYMENT.md](./DEPLOYMENT.md).
For development issues, check the logs:
- Backend: Render Dashboard → Logs
- Frontend: Vercel Dashboard → Function Logs
