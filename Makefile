dev:
	docker-compose -f infra/docker-compose.yml up --build

migrate:
	docker-compose -f infra/docker-compose.yml run --rm api alembic upgrade head

seed:
	docker-compose -f infra/docker-compose.yml run --rm api python -m app.seed

test:
	docker-compose -f infra/docker-compose.yml run --rm api pytest -q
