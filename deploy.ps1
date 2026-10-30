# =========================================================================
# Safar Saarthi - Windows PowerShell Deployment Script
# =========================================================================

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "       🚀 Deploying Safar Saarthi Production Stack (PowerShell)  " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Check docker availability
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "❌ Error: Docker is not installed or not in PATH."
    exit 1
}

# 2. Check environment file
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "ℹ️  Created .env file. Please review values for production." -ForegroundColor Gray
}

# 3. Build containers
Write-Host "📦 Building application container images..." -ForegroundColor Green
docker compose build

# 4. Start database and cache
Write-Host "🐘 Starting PostgreSQL and Redis..." -ForegroundColor Green
docker compose up -d postgres redis

# 5. Wait for PostgreSQL
Write-Host "⏳ Waiting for PostgreSQL to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 6. Apply database migrations
Write-Host "🔄 Applying Prisma migrations and seeds..." -ForegroundColor Green
docker compose run --rm backend sh -c "npx prisma migrate deploy --schema=backend/prisma/schema.prisma && npm run prisma:seed --workspace=backend"

# 7. Start full stack
Write-Host "🌐 Starting Backend, AI Multi-Agent Service, and Frontend..." -ForegroundColor Green
docker compose up -d

# 8. Report Status
Start-Sleep -Seconds 3
docker compose ps

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "       ✅ Safar Saarthi successfully deployed!                   " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Frontend:   http://localhost:5173  (or http://localhost)" -ForegroundColor White
Write-Host "Backend:    http://localhost:5000" -ForegroundColor White
Write-Host "Health:     http://localhost:5000/health" -ForegroundColor White
Write-Host "AI Service: http://localhost:8000/health" -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
