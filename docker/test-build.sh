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

# Test 2: Build enterprise image
test_build_enterprise() {
  section "Test 2: Build enterprise Docker image"

  if docker build \
    --target enterprise \
    --tag cased-cd-test:enterprise \
    --file "$PROJECT_ROOT/Dockerfile" \
    "$PROJECT_ROOT" > /tmp/docker-build-enterprise.log 2>&1; then
    pass "Enterprise image builds successfully"
  else
    fail "Enterprise image build failed (see /tmp/docker-build-enterprise.log)"
    cat /tmp/docker-build-enterprise.log
  fi

  echo ""
}

# Test 3: Standard image configuration (no enterprise)
test_standard_container_config() {
  section "Test 3: Standard container configuration"

  # Start container with standard config
  CONTAINER_ID=$(docker run -d \
    -e ARGOCD_SERVER=http://test-argocd:80 \
    --name cased-cd-test-standard \
    cased-cd-test:standard 2>/dev/null || true)

  if [ -z "$CONTAINER_ID" ]; then
    fail "Failed to start standard container"
    echo ""
    return
  fi

  # Wait for container to start
  sleep 2

  # Check logs for correct routing message
  LOGS=$(docker logs cased-cd-test-standard 2>&1)

  if echo "$LOGS" | grep -q "Standard mode: proxying API requests directly to http://test-argocd:80"; then
    pass "Standard mode correctly configured"
  else
    fail "Standard mode configuration incorrect"
    echo "Expected: 'Standard mode: proxying API requests directly to http://test-argocd:80'"
    echo "Got:"
    echo "$LOGS"
  fi

  # Cleanup
  docker rm -f cased-cd-test-standard > /dev/null 2>&1 || true

  echo ""
}

# Test 4: Enterprise image configuration
test_enterprise_container_config() {
  section "Test 4: Enterprise container configuration"

  # Start standard container with enterprise backend env var
  CONTAINER_ID=$(docker run -d \
    -e ARGOCD_SERVER=http://test-argocd:80 \
    -e ENTERPRISE_BACKEND_SERVICE=test-enterprise.namespace.svc.cluster.local \
    --name cased-cd-test-enterprise-mode \
    cased-cd-test:standard 2>/dev/null || true)

  if [ -z "$CONTAINER_ID" ]; then
    fail "Failed to start enterprise-mode container"
    echo ""
    return
  fi

  # Wait for container to start
  sleep 2

  # Check logs for correct routing message
  LOGS=$(docker logs cased-cd-test-enterprise-mode 2>&1)

  if echo "$LOGS" | grep -q "Enterprise mode enabled: proxying API requests through http://test-enterprise.namespace.svc.cluster.local:8081"; then
    pass "Enterprise mode correctly configured"
  else
    fail "Enterprise mode configuration incorrect"
    echo "Expected: 'Enterprise mode enabled: proxying API requests through http://test-enterprise.namespace.svc.cluster.local:8081'"
    echo "Got:"
    echo "$LOGS"
  fi

  if echo "$LOGS" | grep -q "Enterprise backend will forward requests to ArgoCD at: http://test-argocd:80"; then
    pass "Enterprise backend ArgoCD URL correctly logged"
  else
    fail "Enterprise backend ArgoCD URL not logged correctly"
  fi

  # Cleanup
  docker rm -f cased-cd-test-enterprise-mode > /dev/null 2>&1 || true

  echo ""
}

# Test 5: nginx configuration is generated correctly
test_nginx_config_generation() {
  section "Test 5: nginx configuration generation"

  # Start container and extract generated config
  CONTAINER_ID=$(docker run -d \
    -e ARGOCD_SERVER=http://test-argocd:80 \
    -e ENTERPRISE_BACKEND_SERVICE=test-enterprise.svc \
    --name cased-cd-test-config \
    cased-cd-test:standard 2>/dev/null || true)

  if [ -z "$CONTAINER_ID" ]; then
    fail "Failed to start container for config test"
    echo ""
    return
  fi

  sleep 2

  # Extract generated nginx config
  docker exec cased-cd-test-config cat /tmp/nginx.conf > /tmp/generated-nginx.conf 2>/dev/null || true

  if [ -f /tmp/generated-nginx.conf ]; then
    # Check that proxy_backend variable is set with PROXY_TARGET
    if grep -q "set \$proxy_backend \"http://test-enterprise.svc:8081\"" /tmp/generated-nginx.conf; then
      pass "nginx config correctly sets proxy_backend variable"
    else
      fail "nginx config does not contain expected proxy_backend variable"
      info "Config snippet:"
      grep -E "(set \$proxy_backend|proxy_pass)" /tmp/generated-nginx.conf | head -5
    fi

    # Check that proxy_pass uses the variable
    if grep -q "proxy_pass \$proxy_backend" /tmp/generated-nginx.conf; then
      pass "proxy_pass directives correctly use variable"
    else
      fail "proxy_pass directives not using variable"
    fi

    # Check that template variables are not left unsubstituted
    if ! grep -q '\${' /tmp/generated-nginx.conf; then
      pass "No unsubstituted variables in nginx config"
    else
      fail "Found unsubstituted variables in nginx config"
      grep '\${' /tmp/generated-nginx.conf
    fi
  else
    fail "Could not extract nginx config from container"
  fi

  # Cleanup
  docker rm -f cased-cd-test-config > /dev/null 2>&1 || true
  rm -f /tmp/generated-nginx.conf

  echo ""
}

# Test 6: Health check endpoint works
test_health_endpoint() {
  section "Test 6: Health check endpoint"

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
  sleep 3

  # Check health endpoint
  if curl -f -s http://localhost:18080/health > /dev/null 2>&1; then
    pass "Health check endpoint responds successfully"
  else
    fail "Health check endpoint not responding"
  fi

  # Cleanup
  docker rm -f cased-cd-test-health > /dev/null 2>&1 || true

  echo ""
}

# Cleanup function
cleanup() {
  info "Cleaning up test containers and images..."
  docker rm -f cased-cd-test-standard cased-cd-test-enterprise-mode cased-cd-test-config cased-cd-test-health > /dev/null 2>&1 || true
  docker rmi -f cased-cd-test:standard cased-cd-test:enterprise > /dev/null 2>&1 || true
  rm -f /tmp/docker-build-*.log /tmp/generated-nginx.conf
}

trap cleanup EXIT

# Run tests
test_build_standard
test_build_enterprise
test_standard_container_config
test_enterprise_container_config
test_nginx_config_generation
test_health_endpoint

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $TEST_FAILURES -eq 0 ]; then
  echo -e "${GREEN}✓ All Docker integration tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ $TEST_FAILURES test(s) failed${NC}"
  exit 1
fi
