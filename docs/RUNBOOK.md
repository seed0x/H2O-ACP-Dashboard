# Runbook

- Start dev environment:

```bash
cd infra
docker-compose up --build
```

- Run migrations:

```bash
docker-compose run --rm api alembic upgrade head
```

- Seed DB:

```bash
docker-compose run --rm api python -m app.seed
```

- Run tests (inside api container):

```bash
docker-compose run --rm api pytest
```

- Reset DB: drop & re-create via Postgres client or rerun migrations after drop.
