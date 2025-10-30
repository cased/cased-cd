#!/bin/bash

set -e

echo "🛑 Tearing down ArgoCD cluster..."

# Stop nginx
if pgrep nginx > /dev/null; then
    echo "🔄 Stopping nginx..."
    pkill nginx 2>/dev/null || true
    echo "✅ nginx stopped"
fi

# Restore original nginx config if backup exists
NGINX_CONF="/opt/homebrew/etc/nginx/nginx.conf"
if [ -f "${NGINX_CONF}.backup" ]; then
    echo "🔄 Restoring original nginx config..."
    mv "${NGINX_CONF}.backup" "$NGINX_CONF"
    echo "✅ nginx config restored"
fi

# Delete k3d cluster
if k3d cluster list | grep -q "cased-cd"; then
    echo "🗑️  Deleting k3d cluster..."
    k3d cluster delete cased-cd
    echo "✅ Cluster 'cased-cd' deleted"
else
    echo "ℹ️  Cluster 'cased-cd' not found"
fi

# Clean up credentials file
if [ -f ".argocd-credentials" ]; then
    rm .argocd-credentials
    echo "✅ Credentials file removed"
fi

echo ""
echo "✨ Teardown complete!"
echo ""
echo "💡 To set up again, run:"
echo "   ./scripts/setup-argocd.sh"
echo ""
