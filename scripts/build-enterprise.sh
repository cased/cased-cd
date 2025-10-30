#!/bin/bash
set -e

# Build enterprise tier image
# This image contains the React frontend + Go backend for RBAC and user management

VERSION=${1:-latest}
REGISTRY=${REGISTRY:-ghcr.io/cased}
IMAGE_NAME="cased-cd-enterprise"

echo "Building Cased CD Enterprise image..."
echo "Registry: $REGISTRY"
echo "Image: $IMAGE_NAME"
echo "Version: $VERSION"

docker build \
  --target enterprise \
  --platform linux/amd64,linux/arm64 \
  -t "$REGISTRY/$IMAGE_NAME:$VERSION" \
  -t "$REGISTRY/$IMAGE_NAME:latest" \
  .

echo ""
echo "✅ Build complete!"
echo ""
echo "To push to registry:"
echo "  docker push $REGISTRY/$IMAGE_NAME:$VERSION"
echo "  docker push $REGISTRY/$IMAGE_NAME:latest"
echo ""
echo "To run locally:"
echo "  docker run -p 8080:8080 $REGISTRY/$IMAGE_NAME:$VERSION"
echo ""
echo "Note: Enterprise image requires Kubernetes access for RBAC management"
echo "      Set KUBECONFIG or run in-cluster with proper RBAC permissions"
