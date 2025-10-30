#!/bin/sh
set -e

# Default ArgoCD server URL if not provided
# Uses HTTPS by default (ArgoCD's default configuration)
ARGOCD_SERVER=${ARGOCD_SERVER:-https://argocd-server.argocd.svc.cluster.local}

# Set proxy target to ArgoCD server
export PROXY_TARGET="$ARGOCD_SERVER"
echo "Proxying API requests to ArgoCD at: $PROXY_TARGET"

# Detect DNS resolver from /etc/resolv.conf
# In Kubernetes, this will be the cluster DNS (e.g., 10.96.0.10)
# In Docker, this will be 127.0.0.11 (Docker's embedded DNS)
export DNS_RESOLVER=$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf)
echo "Using DNS resolver: $DNS_RESOLVER"

# Replace environment variables in nginx config template
# Write to /tmp since /etc/nginx is not writable by non-root user
envsubst '${PROXY_TARGET} ${DNS_RESOLVER}' < /etc/nginx/nginx.conf.template > /tmp/nginx.conf

# Test nginx configuration
nginx -t -c /tmp/nginx.conf

echo "Starting nginx..."
exec nginx -g 'daemon off;' -c /tmp/nginx.conf
