# =========================================================================
# Safar Saarthi Frontend - Multi-Stage Production Dockerfile (Nginx)
# =========================================================================

# Stage 1: Build static assets
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm ci

# Copy shared types package source and compile
COPY packages/shared ./packages/shared
RUN npm run build --workspace=@safar-saarthi/shared

# Copy frontend source and build production bundle
COPY frontend ./frontend
WORKDIR /app/frontend

# Set production API base URL (defaults to /api for Nginx reverse proxy)
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

# Build React + Vite SPA (outputs to frontend/dist)
RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled static assets from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy custom Nginx configuration (supporting SPA fallback, gzip & reverse proxy)
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
