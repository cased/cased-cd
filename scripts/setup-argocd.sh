#!/bin/bash

set -e

echo "🚀 Setting up local ArgoCD cluster..."

# Check if k3d is installed
if ! command -v k3d &> /dev/null; then
    echo "❌ k3d not found. Installing..."
    brew install k3d
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Installing..."
    brew install kubectl
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "❌ nginx not found. Installing..."
    brew install nginx
fi

# Delete existing cluster if it exists
if k3d cluster list | grep -q cased-cd; then
    echo "🗑️  Deleting existing cluster..."
    k3d cluster delete cased-cd
fi

# Create k3d cluster with port forwarding for LoadBalancer
echo "📦 Creating k3d cluster 'cased-cd'..."
k3d cluster create cased-cd \
  --port "9000:80@loadbalancer" \
  --wait

# Wait for cluster to be ready
echo "⏳ Waiting for cluster to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=60s

# Create ArgoCD namespace
echo "📝 Creating argocd namespace..."
kubectl create namespace argocd

# Install ArgoCD
echo "⚙️  Installing ArgoCD..."
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
echo "⏳ Waiting for ArgoCD to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd

# Patch ArgoCD server to disable TLS (for local dev)
echo "🔧 Configuring ArgoCD for local development..."
kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge -p '{"data":{"server.insecure":"true"}}'

# Restart ArgoCD server to apply config
kubectl rollout restart deployment/argocd-server -n argocd
kubectl wait --for=condition=available --timeout=120s deployment/argocd-server -n argocd

# Change argocd-server service to LoadBalancer type
echo "🌐 Exposing ArgoCD via LoadBalancer..."
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'

# Wait for LoadBalancer to be assigned
echo "⏳ Waiting for LoadBalancer IP..."
sleep 5

# Get initial admin password
echo "🔐 Getting admin credentials..."
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

# Configure nginx CORS proxy on port 8090
echo "🔧 Configuring nginx CORS proxy..."
NGINX_CONF="/opt/homebrew/etc/nginx/nginx.conf"

# Backup original nginx.conf if not already backed up
if [ ! -f "${NGINX_CONF}.backup" ]; then
    cp "$NGINX_CONF" "${NGINX_CONF}.backup"
fi

# Update nginx config with ArgoCD CORS proxy
cat > "$NGINX_CONF" << 'EOF'
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    # ArgoCD CORS Proxy for local development
    server {
        listen       8090;
        server_name  localhost;

        location / {
            # Handle preflight OPTIONS requests
            if ($request_method = 'OPTIONS') {
                return 204;
            }

            # Proxy to k3d ArgoCD LoadBalancer on port 9000
            proxy_pass http://127.0.0.1:9000;
            proxy_http_version 1.1;

            # Add CORS headers for all responses
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept' always;
            add_header 'Access-Control-Max-Age' '86400' always;

            # Proxy headers
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
    }

    include servers/*;
}
EOF

# Test nginx config
nginx -t

# Restart nginx to apply config
echo "🔄 Restarting nginx..."
# Stop any existing nginx processes
pkill nginx 2>/dev/null || true
sleep 1
# Start nginx
nginx

echo ""
echo "✅ ArgoCD is ready!"
echo ""
echo "📋 Credentials:"
echo "   Username: admin"
echo "   Password: $ARGOCD_PASSWORD"
echo ""
echo "🌐 Access Points:"
echo "   Frontend API: http://localhost:8090/api/v1 (nginx CORS proxy)"
echo "   Direct ArgoCD: http://localhost:9000 (k3d LoadBalancer)"
echo ""
echo "🏗️  Architecture:"
echo "   Frontend (5173-5178) → nginx (8090) → k3d LoadBalancer (9000) → ArgoCD"
echo "                           ↑ CORS headers added here"
echo ""
echo "💡 To start the frontend:"
echo "   npm run dev:real"
echo ""
echo "🛑 To tear down the cluster:"
echo "   ./scripts/teardown-argocd.sh"
echo ""

# Save credentials to a file for easy access
cat > .argocd-credentials <<EOF
ARGOCD_USERNAME=admin
ARGOCD_PASSWORD=$ARGOCD_PASSWORD
ARGOCD_API_URL=http://localhost:8090/api/v1
EOF

echo "📝 Credentials saved to .argocd-credentials"
echo ""
