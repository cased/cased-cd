#!/bin/sh
set -e

# Default ArgoCD server URL if not provided
ARGOCD_SERVER=${ARGOCD_SERVER:-http://argocd-server.argocd.svc.cluster.local:80}
RBAC_PROXY_SERVICE=${RBAC_PROXY_SERVICE:-cased-cd-rbac-proxy.argocd.svc.cluster.local}

echo "Configuring nginx to proxy to ArgoCD server: $ARGOCD_SERVER"
echo "Configuring nginx to proxy RBAC requests to: $RBAC_PROXY_SERVICE:8081"

# Replace environment variables in nginx config template
# Write to /tmp since /etc/nginx is not writable by non-root user
envsubst '${ARGOCD_SERVER} ${RBAC_PROXY_SERVICE}' < /etc/nginx/nginx.conf.template > /tmp/nginx.conf

# Test nginx configuration
nginx -t -c /tmp/nginx.conf

echo "Starting nginx..."
exec nginx -g 'daemon off;' -c /tmp/nginx.conf
