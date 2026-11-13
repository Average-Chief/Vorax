# Stage 1: Build React Dashboard
FROM node:20-alpine AS dashboard-builder
WORKDIR /dashboard
COPY dashboard/package*.json ./
RUN npm ci
COPY dashboard/ ./
RUN npm run build

# Stage 2: Python 3.12 Slim Runtime
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

# Copy application files, migrations, entrypoint, and samples
COPY alembic.ini ./
COPY alembic/ ./alembic
COPY app/ ./app
COPY samples/ ./samples
COPY tests/ ./tests
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Copy built dashboard assets from Stage 1
COPY --from=dashboard-builder /dashboard/dist ./dashboard/dist

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
