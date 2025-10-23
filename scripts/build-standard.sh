#!/bin/bash
set -e

# Build standard (free) tier image
# This image contains only the React frontend served by nginx

VERSION=${1:-latest}
REGISTRY=${REGISTRY:-ghcr.io/cased}
IMAGE_NAME="cased-cd"

echo "Building Cased CD Standard image..."
echo "Registry: $REGISTRY"
echo "Image: $IMAGE_NAME"
echo "Version: $VERSION"

docker build \
  --target standard \
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
echo "  docker run -p 8080:80 -e ARGOCD_SERVER=http://argocd-server.argocd.svc.cluster.local:80 $REGISTRY/$IMAGE_NAME:$VERSION"
