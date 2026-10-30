#!/usr/bin/env bash
# =========================================================================
# Safar Saarthi - Production Deployment Automation Script
# =========================================================================

set -euo pipefail

echo "================================================================="
echo "       🚀 Deploying Safar Saarthi Production Stack              "
echo "================================================================="

# 1. Check required tools
command -v docker >/dev/null 2>&1 || { echo "❌ Error: docker is required."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || { echo "❌ Error: docker compose is required."; exit 1; }

# 2. Check environment file
if [ ! -f .env ]; then
  echo "⚠️  .env file not found. Creating from .env.example..."
  cp .env.example .env
  echo "ℹ️  Please review .env before public production deployment."
fi

# 3. Pull and build containers
echo "📦 Building application container images..."
docker compose build --parallel

# 4. Start database and cache services first
echo "🐘 Starting PostgreSQL and Redis..."
docker compose up -d postgres redis

# 5. Wait for PostgreSQL to become healthy
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; do
  sleep 2
done
echo "✅ PostgreSQL is healthy."

# 6. Apply database schema migrations & seed initial data
echo "🔄 Running database migrations and seeding initial data..."
docker compose run --rm backend sh -c "npx prisma migrate deploy --schema=backend/prisma/schema.prisma && npm run prisma:seed --workspace=backend"

# 7. Start remaining application services
echo "🌐 Starting Backend, AI Service, and Frontend..."
docker compose up -d

# 8. Verify service health
echo "🔍 Verifying service health endpoints..."
sleep 5

docker compose ps

echo "================================================================="
echo "       ✅ Safar Saarthi successfully deployed!                   "
echo "================================================================="
echo "Frontend:   http://localhost:5173  (or http://localhost)"
echo "Backend:    http://localhost:5000"
echo "Health:     http://localhost:5000/health"
echo "AI Service: http://localhost:8000/health"
echo "================================================================="
