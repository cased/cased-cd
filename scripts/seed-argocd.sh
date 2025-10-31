#!/bin/bash

set -e

echo "🌱 Seeding ArgoCD with test data..."

# Create namespace for test apps if it doesn't exist
kubectl create namespace argocd-demo --dry-run=client -o yaml | kubectl apply -f - > /dev/null 2>&1

# Add test repositories using kubectl
echo ""
echo "📦 Adding test repositories..."

# ArgoCD example apps repo
cat <<EOF | kubectl apply -f - > /dev/null
apiVersion: v1
kind: Secret
metadata:
  name: repo-argocd-examples
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  url: https://github.com/argoproj/argocd-example-apps.git
  type: git
  name: argocd-examples
EOF
echo "  ✓ Added argocd-example-apps"

# Kubernetes examples repo
cat <<EOF | kubectl apply -f - > /dev/null
apiVersion: v1
kind: Secret
metadata:
  name: repo-kubernetes-examples
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  url: https://github.com/kubernetes/examples.git
  type: git
  name: kubernetes-examples
EOF
echo "  ✓ Added kubernetes-examples"

# Bitnami Helm repo
cat <<EOF | kubectl apply -f - > /dev/null
apiVersion: v1
kind: Secret
metadata:
  name: repo-bitnami
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  url: https://charts.bitnami.com/bitnami
  type: helm
  name: bitnami
EOF
echo "  ✓ Added Bitnami Helm repo"

# Add test clusters
echo ""
echo "🖥️  Adding test clusters..."

cat <<EOF | kubectl apply -f - > /dev/null
apiVersion: v1
kind: Secret
metadata:
  name: cluster-staging
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
stringData:
  name: staging-cluster
  server: https://staging.example.com:6443
  config: |
    {
      "tlsClientConfig": {
        "insecure": true
      }
    }
EOF
echo "  ✓ Added staging-cluster"

cat <<EOF | kubectl apply -f - > /dev/null
apiVersion: v1
kind: Secret
metadata:
  name: cluster-production
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
stringData:
  name: production-cluster
  server: https://production.example.com:6443
  config: |
    {
      "tlsClientConfig": {
        "insecure": true
      }
    }
EOF
echo "  ✓ Added production-cluster"

# Add test applications
echo ""
echo "🚀 Creating test applications..."

# Guestbook app
cat <<EOF | kubectl apply -f - > /dev/null
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
EOF
echo "  ✓ Created guestbook application"

# Helm guestbook app
cat <<EOF | kubectl apply -f - > /dev/null
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: helm-guestbook
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: helm-guestbook
    helm:
      valueFiles:
        - values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: default
EOF
echo "  ✓ Created helm-guestbook application"

# Kustomize app
cat <<EOF | kubectl apply -f - > /dev/null
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kustomize-guestbook
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: kustomize-guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: default
EOF
echo "  ✓ Created kustomize-guestbook application"

echo ""
echo "✨ Seeding complete!"
echo ""
echo "📊 Summary:"
echo "  - 3 repositories added"
echo "  - 2 test clusters added"
echo "  - 3 applications created"
echo ""
echo "🌐 View at http://localhost:5174"
