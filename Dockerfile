# Multi-stage build for Cased CD Community Edition
# Builds Standard (nginx + React) image

# ==============================================================================
# Stage 1: Build React Frontend
# ==============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the React application
RUN npm run build

# ==============================================================================
# Stage 2: Standard Image (nginx + React) - COMMUNITY EDITION
# ==============================================================================
FROM nginx:alpine AS standard

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy built frontend files
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy nginx configuration template and entrypoint
COPY docker/nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker/entrypoint.sh /entrypoint.sh

# Make entrypoint executable
RUN chmod +x /entrypoint.sh

# Set default ArgoCD server URL (can be overridden via environment variable)
ENV ARGOCD_SERVER=http://argocd-server.argocd.svc.cluster.local:80

# Expose port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

# Start with entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
