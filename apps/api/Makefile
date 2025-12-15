up:
	docker-compose -f ../../infra/docker-compose.yml up --build

migrate:
	docker-compose -f ../../infra/docker-compose.yml run --rm api alembic upgrade head

seed:
	docker-compose -f ../../infra/docker-compose.yml run --rm api python -m app.seed

run:
	docker-compose -f ../../infra/docker-compose.yml run --rm -p 8000:8000 api
