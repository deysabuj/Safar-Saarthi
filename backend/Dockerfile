# =========================================================================
# Safar Saarthi Backend - Multi-Stage Production Dockerfile
# =========================================================================

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native compilation if required
RUN apk add --no-cache python3 make g++

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all monorepo dependencies (including devDependencies for TypeScript build)
RUN npm ci

# Copy shared types package source and compile
COPY packages/shared ./packages/shared
RUN npm run build --workspace=@safar-saarthi/shared

# Copy backend source code & Prisma schema
COPY backend ./backend

# Generate Prisma Client & compile TypeScript
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install runtime tools for healthchecks
RUN apk add --no-cache wget

# Create non-root system user for security
RUN addgroup -S safargroup && adduser -S safaruser -G safargroup

# Copy workspace package manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/

# Copy compiled shared library, backend dist, and hoisted node_modules with Prisma client
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma

# Set correct ownership
RUN chown -R safaruser:safargroup /app

USER safaruser

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "backend/dist/index.js"]
