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

# Create k3d cluster with port forwarding for ArgoCD
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

# Patch ArgoCD server to disable TLS and enable CORS (for local dev)
echo "🔧 Configuring ArgoCD for local development..."
kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge -p '{"data":{"server.insecure":"true"}}'
kubectl set env deployment/argocd-server -n argocd ARGOCD_SERVER_CORS_ALLOWED_ORIGINS="http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178"
kubectl wait --for=condition=available --timeout=120s deployment/argocd-server -n argocd

# Get initial admin password
echo "🔐 Getting admin credentials..."
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

echo ""
echo "✅ ArgoCD is ready!"
echo ""
echo "📋 Credentials:"
echo "   Username: admin"
echo "   Password: $ARGOCD_PASSWORD"
echo ""
echo "🌐 ArgoCD API available at: http://localhost:9000"
echo ""
echo "💡 To access ArgoCD UI, run:"
echo "   kubectl port-forward svc/argocd-server -n argocd 9001:80"
echo "   Then visit: http://localhost:9001"
echo ""
echo "🛑 To tear down the cluster, run:"
echo "   ./scripts/teardown-argocd.sh"
echo ""

# Save credentials to a file for easy access
cat > .argocd-credentials <<EOF
ARGOCD_USERNAME=admin
ARGOCD_PASSWORD=$ARGOCD_PASSWORD
ARGOCD_API_URL=http://localhost:9000
EOF

echo "📝 Credentials saved to .argocd-credentials"

# Setup nginx CORS proxy
echo "🔧 Setting up nginx CORS proxy..."
if ! command -v nginx &> /dev/null; then
    echo "❌ nginx not found. Installing..."
    brew install nginx
fi

# Create nginx CORS config
cat > /tmp/nginx-argocd-cors.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 9000;

        location / {
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Allow-Origin' '$http_origin' always;
                add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
                add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
                add_header 'Access-Control-Max-Age' 1728000;
                add_header 'Content-Type' 'text/plain; charset=utf-8';
                add_header 'Content-Length' 0;
                return 204;
            }

            add_header 'Access-Control-Allow-Origin' '$http_origin' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;

            proxy_pass http://localhost:9001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
EOF

# Start port-forward to 9001
kubectl port-forward -n argocd deployment/argocd-server 9001:8080 > /dev/null 2>&1 &
PORTFORWARD_PID=$!
echo $PORTFORWARD_PID > .argocd-portforward.pid

# Start nginx
nginx -c /tmp/nginx-argocd-cors.conf

echo ""
echo "🔧 CORS proxy running on port 9000 (proxying to ArgoCD on 9001)"
