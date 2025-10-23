#!/bin/bash
set -e

echo "🚀 Starting Cased CD with Real ArgoCD + Seed Data"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not running"
    echo "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running"
    echo "   Please start Docker Desktop"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Please install Node.js 18+: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required (you have v$NODE_VERSION)"
    exit 1
fi

echo "✅ All prerequisites met"
echo ""

# Check if cluster already exists
if k3d cluster list 2>/dev/null | grep -q cased-cd; then
    echo "📦 k3d cluster 'cased-cd' already exists"
    echo ""
    read -p "Do you want to tear it down and recreate? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Tearing down existing cluster..."
        ./scripts/teardown-argocd.sh
        echo ""
    else
        echo "⏭️  Skipping cluster setup, using existing cluster"
        SKIP_SETUP=true
    fi
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Setup ArgoCD cluster if needed
if [ "$SKIP_SETUP" != "true" ]; then
    echo "🏗️  Setting up k3d cluster with ArgoCD..."
    ./scripts/setup-argocd.sh
    echo ""

    echo "🌱 Seeding ArgoCD with test data..."
    ./scripts/seed-argocd.sh
    echo ""
fi

# Load credentials
if [ -f .argocd-credentials ]; then
    source .argocd-credentials
    echo "🔐 ArgoCD Credentials:"
    echo "   Username: $ARGOCD_USERNAME"
    echo "   Password: $ARGOCD_PASSWORD"
    echo ""
fi

# Start Vite dev server
echo "🌐 Starting Vite dev server with real ArgoCD..."
echo ""

# Kill existing Vite server if running
if lsof -i:5173 &> /dev/null; then
    echo "⚠️  Port 5173 is already in use. Stopping existing process..."
    lsof -ti:5173 | xargs kill 2>/dev/null || true
    sleep 1
fi

echo "==========================================="
echo "✨ Environment Ready!"
echo "==========================================="
echo ""
echo "🏗️  Architecture:"
echo "   Browser → Vite (5173) → nginx (8090) → k3d (9000) → ArgoCD"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 ArgoCD API: http://localhost:8090/api/v1"
echo ""
echo "🔑 Login Credentials:"
echo "   Username: admin"
if [ -n "$ARGOCD_PASSWORD" ]; then
    echo "   Password: $ARGOCD_PASSWORD"
else
    echo "   Password: (check .argocd-credentials file)"
fi
echo ""
echo "📊 Test Data Includes:"
echo "   • 3 repositories (ArgoCD examples, Kubernetes examples, Bitnami)"
echo "   • 3 sample applications (guestbook, helm-guestbook, kustomize-guestbook)"
echo "   • 2 mock clusters (staging, production)"
echo ""
echo "🛑 To stop everything:"
echo "   Ctrl+C to stop Vite"
echo "   ./scripts/teardown-argocd.sh to tear down cluster"
echo ""
echo "📖 Starting Vite..."
echo ""

# Start Vite with real API
VITE_USE_REAL_API=true npm run dev
