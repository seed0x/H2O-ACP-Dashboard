API app

Commands:

- Run development containers:

```bash
cd infra
docker-compose up --build
```

- Run migrations

```bash
docker-compose run --rm api alembic upgrade head
```

- Seed

```bash
docker-compose run --rm api python -m app.seed
```
