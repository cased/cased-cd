#!/bin/sh
set -e

# Default ArgoCD server URL if not provided
ARGOCD_SERVER=${ARGOCD_SERVER:-http://argocd-server.argocd.svc.cluster.local:80}

echo "Configuring nginx to proxy to ArgoCD server: $ARGOCD_SERVER"

# Replace environment variables in nginx config template
envsubst '${ARGOCD_SERVER}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Test nginx configuration
nginx -t

echo "Starting nginx..."
exec nginx -g 'daemon off;'
