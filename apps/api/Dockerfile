FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/* \
	&& pip install -r requirements.txt
COPY . /app
RUN chmod +x /app/docker-entrypoint.sh
CMD ["/app/docker-entrypoint.sh"]
