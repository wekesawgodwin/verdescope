#!/bin/sh
# Container entrypoint: migrate, seed an empty database, then serve.
set -e
alembic upgrade head
python -m app.seed
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips='*' --workers "${WEB_CONCURRENCY:-2}"
