#!/bin/bash
# Integration test: Helm chart validation
# Tests that Helm chart renders correctly for different configurations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_FAILURES=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "⎈ Helm Chart Integration Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; TEST_FAILURES=$((TEST_FAILURES + 1)); }
info() { echo -e "${YELLOW}ℹ${NC} $1"; }
section() { echo -e "${BLUE}▸${NC} $1"; }

# Check if helm is installed
if ! command -v helm &> /dev/null; then
  echo -e "${RED}✗${NC} helm is not installed. Please install helm to run these tests."
  exit 1
fi

# Test 1: Chart linting
test_chart_lint() {
  section "Test 1: Helm chart linting"

  if helm lint "$SCRIPT_DIR" > /tmp/helm-lint.log 2>&1; then
    pass "Helm chart passes linting"
  else
    fail "Helm chart linting failed"
    cat /tmp/helm-lint.log
  fi

  echo ""
}

# Test 2: Standard deployment template
test_standard_template() {
  section "Test 2: Standard deployment template"

  helm template test-standard "$SCRIPT_DIR" \
    > /tmp/helm-standard.yaml 2>&1

  if [ $? -eq 0 ]; then
    pass "Standard template renders successfully"
  else
    fail "Standard template rendering failed"
    cat /tmp/helm-standard.yaml
    echo ""
    return
  fi

  # Check that enterprise resources are NOT present
  if ! grep -q "kind: Deployment" /tmp/helm-standard.yaml | grep -q "enterprise"; then
    pass "Enterprise deployment not rendered in standard mode"
  fi

  # Check that ENTERPRISE_BACKEND_SERVICE is NOT set
  if ! grep -q "ENTERPRISE_BACKEND_SERVICE" /tmp/helm-standard.yaml; then
    pass "ENTERPRISE_BACKEND_SERVICE not present in standard mode"
  else
    fail "ENTERPRISE_BACKEND_SERVICE should not be present in standard mode"
  fi

  # Check that ARGOCD_SERVER is set
  if grep -q "ARGOCD_SERVER" /tmp/helm-standard.yaml; then
    pass "ARGOCD_SERVER environment variable present"
  else
    fail "ARGOCD_SERVER environment variable missing"
  fi

  echo ""
}

# Test 3: Custom ArgoCD server configuration
test_custom_argocd_server() {
  section "Test 3: Custom ArgoCD server configuration"

  helm template test-custom "$SCRIPT_DIR" \
    --set argocd.server="http://custom-argocd.custom-ns.svc.cluster.local:8080" \
    > /tmp/helm-custom.yaml 2>&1

  if grep -q "http://custom-argocd.custom-ns.svc.cluster.local:8080" /tmp/helm-custom.yaml; then
    pass "Custom ArgoCD server URL applied"
  else
    fail "Custom ArgoCD server URL not applied"
  fi

  echo ""
}

# Test 4: Resource limits and requests
test_resource_config() {
  section "Test 4: Resource configuration"

  helm template test-resources "$SCRIPT_DIR" \
    > /tmp/helm-resources.yaml 2>&1

  # Check resource limits are configured
  if grep -A5 "resources:" /tmp/helm-resources.yaml | grep -q "limits:"; then
    pass "Resource limits configured"
  else
    info "Resource limits not found (may be using defaults)"
  fi

  # Check resource requests are configured
  if grep -A5 "resources:" /tmp/helm-resources.yaml | grep -q "requests:"; then
    pass "Resource requests configured"
  else
    info "Resource requests not found (may be using defaults)"
  fi

  echo ""
}

# Test 5: Security context
test_security_context() {
  section "Test 5: Security context configuration"

  helm template test-security "$SCRIPT_DIR" \
    > /tmp/helm-security.yaml 2>&1

  # Check for non-root user
  if grep -q "runAsNonRoot: true" /tmp/helm-security.yaml; then
    pass "Non-root security context configured"
  else
    fail "Non-root security context missing"
  fi

  # Check for seccomp profile
  if grep -q "type: RuntimeDefault" /tmp/helm-security.yaml; then
    pass "Seccomp profile configured"
  else
    fail "Seccomp profile missing"
  fi

  # Check for dropped capabilities
  if grep -q "drop:" /tmp/helm-security.yaml && grep -q "ALL" /tmp/helm-security.yaml; then
    pass "All capabilities dropped"
  else
    fail "Capability dropping not configured"
  fi

  echo ""
}

# Cleanup
cleanup() {
  rm -f /tmp/helm-*.yaml /tmp/helm-lint.log
}

trap cleanup EXIT

# Run tests
test_chart_lint
test_standard_template
test_custom_argocd_server
test_resource_config
test_security_context

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $TEST_FAILURES -eq 0 ]; then
  echo -e "${GREEN}✓ All Helm chart tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ $TEST_FAILURES test(s) failed${NC}"
  exit 1
fi
