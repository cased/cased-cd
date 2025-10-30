#!/bin/bash
# Integration test: Docker build and configuration
# Tests that Docker images build successfully and configuration works

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_FAILURES=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🐳 Docker Build Integration Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; TEST_FAILURES=$((TEST_FAILURES + 1)); }
info() { echo -e "${YELLOW}ℹ${NC} $1"; }
section() { echo -e "${BLUE}▸${NC} $1"; }

# Test 1: Build standard image
test_build_standard() {
  section "Test 1: Build standard Docker image"

  if docker build \
    --target standard \
    --tag cased-cd-test:standard \
    --file "$PROJECT_ROOT/Dockerfile" \
    "$PROJECT_ROOT" > /tmp/docker-build-standard.log 2>&1; then
    pass "Standard image builds successfully"
  else
    fail "Standard image build failed (see /tmp/docker-build-standard.log)"
    cat /tmp/docker-build-standard.log
  fi

  echo ""
}

# Test 2: Container configuration
test_standard_container_config() {
  section "Test 2: Container configuration"

  # Start container
  CONTAINER_ID=$(docker run -d \
    -e ARGOCD_SERVER=http://test-argocd:80 \
    --name cased-cd-test-standard \
    cased-cd-test:standard 2>/dev/null || true)

  if [ -z "$CONTAINER_ID" ]; then
    fail "Failed to start container"
    echo ""
    return
  fi

  # Wait for container to start
  sleep 2

  # Check logs for correct routing message
  LOGS=$(docker logs cased-cd-test-standard 2>&1)

  if echo "$LOGS" | grep -q "Proxying API requests to ArgoCD at: http://test-argocd:80"; then
    pass "Container correctly configured to proxy to ArgoCD"
  else
    fail "Container configuration incorrect"
    echo "Expected: 'Proxying API requests to ArgoCD at: http://test-argocd:80'"
    echo "Got:"
    echo "$LOGS"
  fi

  # Cleanup
  docker rm -f cased-cd-test-standard > /dev/null 2>&1 || true

  echo ""
}

# Test 3: Health check endpoint works
test_health_endpoint() {
  section "Test 3: Health check endpoint"

  # Start container with port mapping
  CONTAINER_ID=$(docker run -d \
    -p 18080:8080 \
    -e ARGOCD_SERVER=http://test-argocd:80 \
    --name cased-cd-test-health \
    cased-cd-test:standard 2>/dev/null || true)

  if [ -z "$CONTAINER_ID" ]; then
    fail "Failed to start container for health check test"
    echo ""
    return
  fi

  # Wait for nginx to start
  sleep 5

  # Check if container is running
  if ! docker ps | grep -q cased-cd-test-health; then
    fail "Container not running - check logs:"
    docker logs cased-cd-test-health 2>&1 | tail -20
    docker rm -f cased-cd-test-health > /dev/null 2>&1 || true
    echo ""
    return
  fi

  # Check health endpoint
  if curl -f -s http://localhost:18080/health > /dev/null 2>&1; then
    pass "Health check endpoint responds successfully"
  else
    fail "Health check endpoint not responding"
    info "Container logs:"
    docker logs cased-cd-test-health 2>&1 | tail -10
  fi

  # Cleanup
  docker rm -f cased-cd-test-health > /dev/null 2>&1 || true

  echo ""
}

# Cleanup function
cleanup() {
  info "Cleaning up test containers and images..."
  docker rm -f cased-cd-test-standard cased-cd-test-health > /dev/null 2>&1 || true
  docker rmi -f cased-cd-test:standard > /dev/null 2>&1 || true
  rm -f /tmp/docker-build-*.log
}

trap cleanup EXIT

# Run tests
test_build_standard
test_standard_container_config
test_health_endpoint

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $TEST_FAILURES -eq 0 ]; then
  echo -e "${GREEN}✓ All Docker integration tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ $TEST_FAILURES test(s) failed${NC}"
  exit 1
fi
