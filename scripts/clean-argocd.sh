#!/bin/bash

set -e

echo "🧹 Cleaning ArgoCD test data..."

# Delete test applications
echo ""
echo "🗑️  Deleting test applications..."
kubectl delete application -n argocd guestbook --ignore-not-found=true > /dev/null && echo "  ✓ Deleted guestbook" || echo "  - guestbook not found"
kubectl delete application -n argocd helm-guestbook --ignore-not-found=true > /dev/null && echo "  ✓ Deleted helm-guestbook" || echo "  - helm-guestbook not found"
kubectl delete application -n argocd kustomize-guestbook --ignore-not-found=true > /dev/null && echo "  ✓ Deleted kustomize-guestbook" || echo "  - kustomize-guestbook not found"

# Delete test clusters
echo ""
echo "🗑️  Deleting test clusters..."
kubectl delete secret -n argocd cluster-staging --ignore-not-found=true > /dev/null && echo "  ✓ Deleted staging-cluster" || echo "  - staging-cluster not found"
kubectl delete secret -n argocd cluster-production --ignore-not-found=true > /dev/null && echo "  ✓ Deleted production-cluster" || echo "  - production-cluster not found"

# Delete test repositories
echo ""
echo "🗑️  Deleting test repositories..."
kubectl delete secret -n argocd repo-argocd-examples --ignore-not-found=true > /dev/null && echo "  ✓ Deleted argocd-examples" || echo "  - argocd-examples not found"
kubectl delete secret -n argocd repo-kubernetes-examples --ignore-not-found=true > /dev/null && echo "  ✓ Deleted kubernetes-examples" || echo "  - kubernetes-examples not found"
kubectl delete secret -n argocd repo-bitnami --ignore-not-found=true > /dev/null && echo "  ✓ Deleted bitnami" || echo "  - bitnami not found"

# Delete test namespace
echo ""
echo "🗑️  Deleting test namespace..."
kubectl delete namespace argocd-demo --ignore-not-found=true > /dev/null 2>&1 && echo "  ✓ Deleted argocd-demo namespace" || echo "  - argocd-demo namespace not found"

echo ""
echo "✨ Cleanup complete!"
echo ""
echo "🌐 ArgoCD is now clean. Run ./scripts/seed-argocd.sh to add test data again."
