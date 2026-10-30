# Safar Saarthi — Infrastructure Guide

This folder contains container definitions and orchestration configs for local development and cloud deployments.

## Quickstart Local Data Services

Start PostgreSQL 16 and Redis 7 in detached mode:

```bash
docker compose -f infra/docker-compose.yml up -d
```

To stop services:

```bash
docker compose -f infra/docker-compose.yml down
```

## Service Details
- **PostgreSQL**: Port 5432, User `postgres`, Password `postgrespassword`, Database `safar_saarthi`.
- **Redis**: Port 6379, Default without password for local development.
