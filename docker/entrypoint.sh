#!/bin/sh
set -e

# Default ArgoCD server URL if not provided
ARGOCD_SERVER=${ARGOCD_SERVER:-http://argocd-server.argocd.svc.cluster.local:80}

# Determine proxy target based on enterprise mode
# If ENTERPRISE_BACKEND_SERVICE is set, route all API requests through the enterprise backend
# Otherwise, route directly to ArgoCD server
if [ -n "$ENTERPRISE_BACKEND_SERVICE" ]; then
  PROXY_TARGET="http://${ENTERPRISE_BACKEND_SERVICE}:8081"
  echo "Enterprise mode enabled: proxying API requests through $PROXY_TARGET"
  echo "Enterprise backend will forward requests to ArgoCD at: $ARGOCD_SERVER"
else
  PROXY_TARGET="$ARGOCD_SERVER"
  echo "Standard mode: proxying API requests directly to $PROXY_TARGET"
fi

# Replace environment variables in nginx config template
# Write to /tmp since /etc/nginx is not writable by non-root user
envsubst '${PROXY_TARGET}' < /etc/nginx/nginx.conf.template > /tmp/nginx.conf

# Test nginx configuration
nginx -t -c /tmp/nginx.conf

echo "Starting nginx..."
exec nginx -g 'daemon off;' -c /tmp/nginx.conf
