# Safar Saarthi — Backup, Disaster Recovery & Rollback Guide

This guide establishes production backup, disaster recovery, and operational rollback procedures for Safar Saarthi across PostgreSQL, Redis, Docker containers, and Prisma schema migrations.

---

## 1. Database Backup Procedures (PostgreSQL 16)

### 1.1 Automated Daily Logical Backups (`pg_dump`)
Logical backups export schema and table records into compressed SQL archives.

#### On-Demand Manual Backup
```bash
# Execute within the PostgreSQL container or from host with pg_dump installed
docker exec -t safar-saarthi-postgres pg_dump \
  -U postgres \
  -d safar_saarthi \
  -F c \
  -b -v \
  -f /var/lib/postgresql/data/backup_$(date +%Y%m%d_%H%M%S).dump
```

#### Automated Daily Backup Cron Job
Add to host `/etc/cron.d/safar_backup` or Kubernetes CronJob:
```bash
0 2 * * * root docker exec -t safar-saarthi-postgres pg_dump -U postgres -d safar_saarthi -F c | gzip > /backups/safar_saarthi_$(date +\%F).dump.gz
# Retain backups for 30 days
0 3 * * * root find /backups -name "safar_saarthi_*.dump.gz" -mtime +30 -delete
```

### 1.2 Point-in-Time Recovery (PITR) & Physical Backups
For mission-critical production deployments:
1. **Enable WAL Archiving**:
   In `postgresql.conf`:
   ```ini
   wal_level = replica
   archive_mode = on
   archive_command = 'test ! -f /mnt/wal_archive/%f && cp %p /mnt/wal_archive/%f'
   max_wal_senders = 3
   ```
2. **Base Backups**: Run `pg_basebackup -D /backups/base -Ft -z -P` weekly.
3. This allows restoring the database to any exact second in the past 7–14 days.

---

## 2. Disaster Recovery & Database Restoration Runbook

### 2.1 Restoring from a Logical Dump (`pg_restore`)
```bash
# 1. Temporarily scale down backend gateway to stop incoming database writes
docker compose stop backend

# 2. Terminate existing connections and recreate clean database
docker exec -i safar-saarthi-postgres psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'safar_saarthi' AND pid <> pg_backend_pid();"
docker exec -i safar-saarthi-postgres psql -U postgres -c "DROP DATABASE IF EXISTS safar_saarthi;"
docker exec -i safar-saarthi-postgres psql -U postgres -c "CREATE DATABASE safar_saarthi;"

# 3. Restore dump file using pg_restore
docker exec -i safar-saarthi-postgres pg_restore \
  -U postgres \
  -d safar_saarthi \
  -v /var/lib/postgresql/data/backup_TARGET.dump

# 4. Run Prisma schema verification
docker compose run --rm backend npx prisma migrate status

# 5. Restart backend gateway
docker compose start backend
```

---

## 3. Redis Persistence & Cache Recovery

Safar Saarthi uses Redis for rate limiting, provider response caching, and temporary session state.
- **RDB Snapshots**: Captured automatically every 60 seconds if 1,000 keys change (`save 60 1000`).
- **AOF (Append Only File)**: Enabled via `appendonly yes` and `appendfsync everysec` in production.
- **Cache Eviction Policy**: Configured to `volatile-lru` or `allkeys-lru` with a `maxmemory 512mb` ceiling.
- **Cold Start Recovery**: If Redis completely fails or restarts empty, the backend automatically queries upstream providers and benchmarks without crashing (cache-aside pattern).

---

## 4. Application Rollback Strategies

### 4.1 Container & Docker Image Rollbacks
When a newly deployed container version exhibits unexpected runtime issues:

1. **Tag Pinning**: Production deployments should always use immutable semantic version tags rather than mutable `:latest` tags:
   ```yaml
   image: safar-saarthi-backend:v1.2.0 # Good
   ```
2. **Instant Reversion**:
   ```bash
   # Rollback to previously verified image
   docker tag safar-saarthi-backend:v1.1.0 safar-saarthi-backend:active
   docker compose up -d --no-deps backend
   ```
3. **Healthcheck Protection**: `docker-compose.yml` uses strict health checks (`interval: 10s`, `retries: 3`). If a container fails its `/health` probe, container orchestrators (Docker Swarm / Kubernetes) abort the rollout and keep the previous replica running.

### 4.2 Database Schema Migration Rollbacks (Prisma)
Prisma operates an append-only migration tracking engine (`_prisma_migrations`).

#### Standard Schema Rollback Procedure
1. Never delete historical migration folders that have already run on production.
2. Create a compensating "down" migration:
   ```bash
   # Revert changes in schema.prisma, then create compensating migration
   npx prisma migrate dev --name revert_feature_xyz
   ```
3. In emergency production hotfixes where an unreleased migration broke:
   ```bash
   # Mark the failed migration as rolled back in Prisma metadata
   npx prisma migrate resolve --rolled-back "20261028_failed_migration_name"
   ```

---

## 5. Pre-Deployment Verification Checklist

Before triggering production deployment:
- [ ] Automated CI pipeline passed on master branch (lint, typecheck, backend tests, AI tests, E2E).
- [ ] Database backup executed and verified on external storage.
- [ ] Production `.env` verified for non-default `JWT_SECRET`, secure `DATABASE_URL`, and SSL configurations.
- [ ] CORS allowed origins restricted to approved production domain names.
- [ ] Upstream API keys verified in developer consoles (Amadeus quota, IRCTC credentials).
