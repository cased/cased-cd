# Multi-stage build for Cased CD
# Builds both Standard (nginx) and Enterprise (Go) images from a single Dockerfile

# ==============================================================================
# Stage 1: Build React Frontend (shared by both images)
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
# Stage 2: Standard Image (nginx + React) - FREE TIER
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

# ==============================================================================
# Stage 3: Build Go Backend (enterprise only)
# ==============================================================================
FROM golang:1.21-alpine AS backend-builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy Go module files
COPY backend/go.mod backend/go.sum ./

# Download Go dependencies
RUN go mod download

# Copy Go source code
COPY backend/ ./

# Build the Go binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o rbac-proxy main.go

# ==============================================================================
# Stage 4: Enterprise Image (Go + React + RBAC) - ENTERPRISE TIER
# ==============================================================================
FROM alpine:latest AS enterprise

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy Go binary from backend builder
COPY --from=backend-builder /app/rbac-proxy /app/rbac-proxy

# Copy React build from frontend builder
COPY --from=frontend-builder /app/dist /app/dist

# Environment variables for configuration
ENV PORT=8080
ENV ARGOCD_SERVER=http://argocd-server.argocd.svc.cluster.local:80

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

# Run the Go binary
CMD ["/app/rbac-proxy"]
