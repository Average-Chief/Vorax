#!/bin/sh
set -e

# If a custom command was provided (e.g. running samples or pytest), execute it
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

echo "Starting A2A Gateway..."

# Wait for DB with retry backoff up to 30s
MAX_RETRIES=15
COUNT=0
until alembic upgrade head || [ $COUNT -ge $MAX_RETRIES ]; do
  COUNT=$((COUNT+1))
  echo "Alembic migration failed or database not ready. Retrying in 2s ($COUNT/$MAX_RETRIES)..."
  sleep 2
done

if [ $COUNT -ge $MAX_RETRIES ]; then
  echo "Failed to apply database migrations after 30s. Exiting."
  exit 1
fi

echo "Database migrations applied successfully."
echo "Starting Uvicorn server on 0.0.0.0:8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
