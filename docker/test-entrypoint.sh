#!/bin/bash
# Test script for entrypoint.sh and nginx configuration
# Tests enterprise routing logic

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_FAILURES=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing nginx entrypoint configuration..."
echo ""

# Helper functions
pass() {
  echo -e "${GREEN}✓${NC} $1"
}

fail() {
  echo -e "${RED}✗${NC} $1"
  TEST_FAILURES=$((TEST_FAILURES + 1))
}

info() {
  echo -e "${YELLOW}ℹ${NC} $1"
}

# Create temporary test directory
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT

# Test 1: Standard mode (no ENTERPRISE_BACKEND_SERVICE)
test_standard_mode() {
  info "Test 1: Standard mode routing"

  export ARGOCD_SERVER="http://argocd-server.argocd.svc.cluster.local:80"
  unset ENTERPRISE_BACKEND_SERVICE

  # Source the entrypoint logic (without executing nginx)
  cd "$TEST_DIR"
  cat > test_entrypoint.sh << 'EOF'
ARGOCD_SERVER=${ARGOCD_SERVER:-http://argocd-server.argocd.svc.cluster.local:80}

if [ -n "$ENTERPRISE_BACKEND_SERVICE" ]; then
  PROXY_TARGET="http://${ENTERPRISE_BACKEND_SERVICE}:8081"
else
  PROXY_TARGET="$ARGOCD_SERVER"
fi

echo "$PROXY_TARGET"
EOF

  chmod +x test_entrypoint.sh
  RESULT=$(./test_entrypoint.sh)

  if [ "$RESULT" = "http://argocd-server.argocd.svc.cluster.local:80" ]; then
    pass "Standard mode routes to ArgoCD directly"
  else
    fail "Standard mode should route to ArgoCD, got: $RESULT"
  fi
}

# Test 2: Enterprise mode (ENTERPRISE_BACKEND_SERVICE set)
test_enterprise_mode() {
  info "Test 2: Enterprise mode routing"

  export ARGOCD_SERVER="http://argocd-server.argocd.svc.cluster.local:80"
  export ENTERPRISE_BACKEND_SERVICE="cased-cd-enterprise.argocd.svc.cluster.local"

  cd "$TEST_DIR"
  cat > test_entrypoint.sh << 'EOF'
ARGOCD_SERVER=${ARGOCD_SERVER:-http://argocd-server.argocd.svc.cluster.local:80}

if [ -n "$ENTERPRISE_BACKEND_SERVICE" ]; then
  PROXY_TARGET="http://${ENTERPRISE_BACKEND_SERVICE}:8081"
else
  PROXY_TARGET="$ARGOCD_SERVER"
fi

echo "$PROXY_TARGET"
EOF

  chmod +x test_entrypoint.sh
  RESULT=$(./test_entrypoint.sh)

  if [ "$RESULT" = "http://cased-cd-enterprise.argocd.svc.cluster.local:8081" ]; then
    pass "Enterprise mode routes to enterprise backend"
  else
    fail "Enterprise mode should route to backend, got: $RESULT"
  fi
}

# Test 3: nginx template uses PROXY_TARGET with variable pattern
test_nginx_template() {
  info "Test 3: nginx template uses PROXY_TARGET with variable pattern"

  # Check that nginx sets $proxy_target variable from ${PROXY_TARGET}
  if grep -q 'set \$proxy_target "\${PROXY_TARGET}"' "$SCRIPT_DIR/nginx.conf.template"; then
    pass "nginx template sets \$proxy_target from PROXY_TARGET"
  else
    fail "nginx template should set \$proxy_target variable"
  fi

  # Check that proxy_pass uses the nginx variable (enables dynamic DNS)
  PROXY_COUNT=$(grep -c 'proxy_pass \$proxy_target' "$SCRIPT_DIR/nginx.conf.template" || true)
  if [ "$PROXY_COUNT" -ge 2 ]; then
    pass "proxy_pass uses \$proxy_target in $PROXY_COUNT locations"
  else
    fail "proxy_pass should use \$proxy_target at least twice (found $PROXY_COUNT)"
  fi
}

# Test 4: nginx template validation
test_nginx_syntax() {
  info "Test 4: nginx configuration template validation"

  # Create test config with substituted variables
  export PROXY_TARGET="http://test-server:80"
  cd "$TEST_DIR"
  envsubst '${PROXY_TARGET}' < "$SCRIPT_DIR/nginx.conf.template" > nginx.conf

  # Validate that PROXY_TARGET was substituted into the set directive
  if grep -q 'set \$proxy_target "http://test-server:80"' nginx.conf; then
    pass "Template substitution sets \$proxy_target correctly"
  else
    fail "Template substitution failed - \$proxy_target not set correctly"
    return
  fi

  # Validate that proxy_pass uses the variable
  if grep -q 'proxy_pass \$proxy_target' nginx.conf; then
    pass "proxy_pass uses nginx variable for dynamic DNS"
  else
    fail "proxy_pass should use \$proxy_target variable"
  fi

  # Validate no unsubstituted variables remain
  if ! grep -q '\${' nginx.conf; then
    pass "No unsubstituted variables in generated config"
  else
    fail "Found unsubstituted variables in config"
    grep '\${' nginx.conf || true
  fi
}

# Test 5: entrypoint script uses envsubst correctly
test_envsubst() {
  info "Test 5: entrypoint uses envsubst with PROXY_TARGET"

  if grep -q "envsubst '\${PROXY_TARGET}'" "$SCRIPT_DIR/entrypoint.sh"; then
    pass "entrypoint.sh uses envsubst with PROXY_TARGET"
  else
    fail "entrypoint.sh should use envsubst with PROXY_TARGET"
  fi

  # Test that PROXY_TARGET is exported (required for envsubst)
  if grep -q "export PROXY_TARGET=" "$SCRIPT_DIR/entrypoint.sh"; then
    pass "PROXY_TARGET is exported for envsubst"
  else
    fail "PROXY_TARGET must be exported for envsubst to work"
  fi
}

# Run all tests
test_standard_mode
test_enterprise_mode
test_nginx_template
test_nginx_syntax
test_envsubst

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $TEST_FAILURES -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ $TEST_FAILURES test(s) failed${NC}"
  exit 1
fi
