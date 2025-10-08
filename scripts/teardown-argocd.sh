#!/bin/bash

set -e

echo "🛑 Tearing down ArgoCD cluster..."

# Stop nginx
if pgrep -f "nginx.*nginx-argocd-cors" > /dev/null; then
    nginx -s stop -c /tmp/nginx-argocd-cors.conf 2>/dev/null || pkill -f "nginx.*nginx-argocd-cors"
    echo "✅ Nginx CORS proxy stopped"
fi

# Stop port-forward
if [ -f ".argocd-portforward.pid" ]; then
    kill $(cat .argocd-portforward.pid) 2>/dev/null
    rm .argocd-portforward.pid
    echo "✅ Port forward stopped"
fi

# Delete k3d cluster
if k3d cluster list | grep -q "cased-cd"; then
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

# Clean up nginx config
if [ -f "/tmp/nginx-argocd-cors.conf" ]; then
    rm /tmp/nginx-argocd-cors.conf
    echo "✅ Nginx config removed"
fi

echo "✨ Cleanup complete!"
