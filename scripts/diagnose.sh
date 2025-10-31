#!/bin/bash
# Cased CD Enterprise - Diagnostic Script
# Collects information to help troubleshoot installation issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

NAMESPACE="${1:-argocd}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Cased CD Enterprise - Diagnostic Report${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Namespace: $NAMESPACE"
echo "Date: $(date)"
echo ""

# Check kubectl access
echo -e "${BLUE}▸ Checking kubectl access...${NC}"
if ! kubectl get ns "$NAMESPACE" &>/dev/null; then
  echo -e "${RED}✗ Cannot access namespace '$NAMESPACE'${NC}"
  echo "  Make sure you have kubectl configured and access to the namespace."
  exit 1
fi
echo -e "${GREEN}✓ kubectl access OK${NC}"
echo ""

# Check if Cased CD is installed
echo -e "${BLUE}▸ Checking Cased CD installation...${NC}"
PODS=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=cased-cd -o name 2>/dev/null | wc -l)
if [ "$PODS" -eq 0 ]; then
  echo -e "${RED}✗ Cased CD not found in namespace '$NAMESPACE'${NC}"
  echo "  Run: helm install cased-cd cased-cd/cased-cd -n $NAMESPACE"
  exit 1
fi
echo -e "${GREEN}✓ Found $PODS Cased CD pod(s)${NC}"
echo ""

# Pod Status
echo -e "${BLUE}▸ Pod Status:${NC}"
kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=cased-cd -o wide
echo ""

# Check for common issues
echo -e "${BLUE}▸ Checking for common issues...${NC}"

# Issue 1: ImagePullBackOff
PULL_ERRORS=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=cased-cd -o jsonpath='{.items[*].status.containerStatuses[*].state.waiting.reason}' 2>/dev/null | grep -o "ImagePullBackOff\|ErrImagePull" | wc -l || echo "0")
if [ "$PULL_ERRORS" -gt 0 ]; then
  echo -e "${RED}✗ ImagePullBackOff detected${NC}"
  echo "  Possible causes:"
  echo "  1. imagePullSecret not created or incorrect"
  echo "  2. DockerHub token expired"
  echo "  3. Wrong image name/tag"
  echo ""
  echo "  Check secrets:"
  kubectl get secrets -n "$NAMESPACE" | grep docker-registry || echo "  No docker-registry secrets found!"
  echo ""
  echo "  See: TROUBLESHOOTING.md#1-pod-stuck-in-imagepullbackoff"
else
  echo -e "${GREEN}✓ No image pull issues${NC}"
fi

# Issue 2: CrashLoopBackOff
CRASH_ERRORS=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=cased-cd -o jsonpath='{.items[*].status.containerStatuses[*].state.waiting.reason}' 2>/dev/null | grep -o "CrashLoopBackOff" | wc -l || echo "0")
if [ "$CRASH_ERRORS" -gt 0 ]; then
  echo -e "${RED}✗ CrashLoopBackOff detected${NC}"
  echo "  Pod is crashing on startup. Check logs:"
  echo "  kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=cased-cd --tail=50"
  echo ""
  echo "  See: TROUBLESHOOTING.md#2-pod-stuck-in-crashloopbackoff"
else
  echo -e "${GREEN}✓ No crash loop issues${NC}"
fi

# Issue 3: PVC Pending
if kubectl get pvc -n "$NAMESPACE" -l app.kubernetes.io/name=cased-cd &>/dev/null; then
  PENDING_PVC=$(kubectl get pvc -n "$NAMESPACE" -l app.kubernetes.io/name=cased-cd -o jsonpath='{.items[?(@.status.phase=="Pending")].metadata.name}' 2>/dev/null)
  if [ -n "$PENDING_PVC" ]; then
    echo -e "${YELLOW}⚠  PVC pending: $PENDING_PVC${NC}"
    echo "  Check storage class is available:"
    echo "  kubectl get storageclass"
    echo ""
    echo "  See: TROUBLESHOOTING.md#3-persistentvolumeclaim-stuck-in-pending"
  else
    echo -e "${GREEN}✓ No PVC issues${NC}"
  fi
fi

echo ""

# Deployments
echo -e "${BLUE}▸ Deployments:${NC}"
kubectl get deployments -n "$NAMESPACE" -l app.kubernetes.io/name=cased-cd
echo ""

# Services
echo -e "${BLUE}▸ Services:${NC}"
kubectl get svc -n "$NAMESPACE" -l app.kubernetes.io/name=cased-cd
echo ""

# Check ArgoCD is running
echo -e "${BLUE}▸ Checking ArgoCD server...${NC}"
if kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=argocd-server &>/dev/null; then
  ARGOCD_READY=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=argocd-server -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)
  if [ "$ARGOCD_READY" = "True" ]; then
    echo -e "${GREEN}✓ ArgoCD server is running${NC}"
  else
    echo -e "${RED}✗ ArgoCD server not ready${NC}"
    echo "  Cased CD requires ArgoCD to be running"
  fi
else
  echo -e "${RED}✗ ArgoCD server not found${NC}"
  echo "  Install ArgoCD first: https://argo-cd.readthedocs.io/en/stable/getting_started/"
fi
echo ""

# Recent Events
echo -e "${BLUE}▸ Recent Events (last 10):${NC}"
kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' 2>/dev/null | grep cased-cd | tail -10 || echo "No recent events"
echo ""

# Recent Logs
echo -e "${BLUE}▸ Recent Logs (last 20 lines):${NC}"
kubectl logs -n "$NAMESPACE" -l app.kubernetes.io/name=cased-cd --tail=20 2>/dev/null || echo "No logs available"
echo ""

# Enterprise Check
echo -e "${BLUE}▸ Enterprise Features:${NC}"
ENTERPRISE_PODS=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/component=enterprise -o name 2>/dev/null | wc -l)
if [ "$ENTERPRISE_PODS" -gt 0 ]; then
  echo -e "${GREEN}✓ Enterprise backend found ($ENTERPRISE_PODS pod(s))${NC}"

  # Check RBAC
  if kubectl get role cased-cd-enterprise -n "$NAMESPACE" &>/dev/null; then
    echo -e "${GREEN}✓ Enterprise RBAC role exists${NC}"
  else
    echo -e "${YELLOW}⚠  Enterprise RBAC role not found${NC}"
    echo "  Enterprise features may not work properly"
  fi

  # Check PVC for audit logs
  if kubectl get pvc -n "$NAMESPACE" -l app.kubernetes.io/component=enterprise &>/dev/null; then
    PVC_STATUS=$(kubectl get pvc -n "$NAMESPACE" -l app.kubernetes.io/component=enterprise -o jsonpath='{.items[0].status.phase}' 2>/dev/null)
    if [ "$PVC_STATUS" = "Bound" ]; then
      echo -e "${GREEN}✓ Audit log PVC bound${NC}"
    else
      echo -e "${YELLOW}⚠  Audit log PVC status: $PVC_STATUS${NC}"
    fi
  fi
else
  echo -e "${YELLOW}ℹ  Enterprise features not enabled${NC}"
  echo "  To enable: helm upgrade cased-cd cased-cd/cased-cd --set enterprise.enabled=true"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Diagnostic Complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Summary
READY_PODS=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=cased-cd -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null | grep -o "True" | wc -l || echo "0")
TOTAL_PODS=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=cased-cd -o name 2>/dev/null | wc -l)

if [ "$READY_PODS" -eq "$TOTAL_PODS" ] && [ "$TOTAL_PODS" -gt 0 ]; then
  echo -e "${GREEN}✓ All pods are ready! Cased CD should be working.${NC}"
  echo ""
  echo "Access the UI:"
  echo "  kubectl port-forward svc/cased-cd 8080:80 -n $NAMESPACE"
  echo "  Open: http://localhost:8080"
else
  echo -e "${YELLOW}⚠  Some pods are not ready ($READY_PODS/$TOTAL_PODS)${NC}"
  echo ""
  echo "Troubleshooting steps:"
  echo "  1. Check pod details: kubectl describe pod -n $NAMESPACE -l app.kubernetes.io/name=cased-cd"
  echo "  2. Check logs: kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=cased-cd --tail=50"
  echo "  3. See TROUBLESHOOTING.md for detailed help"
  echo "  4. Contact support: support@cased.com"
fi

echo ""
