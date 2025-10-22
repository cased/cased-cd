# Cased CD

**A modern, beautiful UI for ArgoCD**

Cased CD is a completely redesigned user interface for ArgoCD, built with modern web technologies for a superior user experience. It works seamlessly with your existing ArgoCD installation - no backend modifications required.

[![Docker](https://img.shields.io/badge/docker-ghcr.io%2Fcased%2Fcased--cd-blue)](https://github.com/cased/cased-cd/pkgs/container/cased-cd)

Built by [**Cased**](https://cased.com).

---

## Features

- **Modern UI/UX** - Clean, intuitive interface built with React and Tailwind CSS
- **Dark Mode** - Full dark mode support
- **Real-time Updates** - Live sync status and resource health monitoring
- **Application Management** - Create, sync, refresh, and delete applications
- **Resource Visualization** - Tree view, network graph, and list views for resources
- **Deployment History** - Track and rollback to previous versions
- **Multi-cluster Support** - Manage applications across multiple Kubernetes clusters
- **Repository Management** - Connect Git repositories and Helm charts
- **No Backend Changes** - Works with standard ArgoCD API (v2.0+)

## Quick Start

### Install with Helm (Recommended)

```bash
# Add the Cased Helm repository
helm repo add cased https://cased.github.io/cased-cd
helm repo update

# Install Cased CD in the argocd namespace
helm install cased-cd cased/cased-cd \
  --namespace argocd \
  --create-namespace
```

That's it! Access Cased CD at `http://localhost:8080` (via port-forward) or configure an Ingress for external access.

### Install with kubectl

```bash
# Apply the manifests
kubectl apply -f https://raw.githubusercontent.com/cased/cased-cd/main/manifests/install.yaml

# Access via port-forward
kubectl port-forward -n argocd svc/cased-cd 8080:80
```

### Run with Docker

```bash
docker run -d \
  -p 8080:80 \
  -e ARGOCD_SERVER=http://argocd-server.argocd.svc.cluster.local:80 \
  ghcr.io/cased/cased-cd:latest
```

## Configuration

### Connecting to ArgoCD

Cased CD needs to know where your ArgoCD server is. Configure this via:

**Helm:**
```yaml
# values.yaml
argocd:
  server: "http://argocd-server.argocd.svc.cluster.local:80"
```

**Docker:**
```bash
docker run -e ARGOCD_SERVER=https://argocd.example.com ghcr.io/cased/cased-cd:latest
```

### Enabling External Access

**With Ingress (Helm):**
```yaml
# values.yaml
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: cased-cd.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: cased-cd-tls
      hosts:
        - cased-cd.example.com
```

**With LoadBalancer:**
```yaml
# values.yaml
service:
  type: LoadBalancer
```

## Authentication

Cased CD uses the same authentication as ArgoCD. Log in with your ArgoCD credentials:

```bash
# Get the admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

- **Username**: `admin`
- **Password**: (from command above)

## Documentation

- **[Deployment Guide](DEPLOY.md)** - Comprehensive deployment instructions
- **[Cased Docs](https://docs.cased.com)** - Learn about Cased's platform

## Architecture

Cased CD is a React single-page application that communicates directly with the ArgoCD API:

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│             │  HTTPS  │              │  HTTP   │             │
│   Browser   ├────────►│   Cased CD   ├────────►│   ArgoCD    │
│             │         │   (nginx)    │         │   Server    │
└─────────────┘         └──────────────┘         └─────────────┘
                             │
                             ├─ Serves static UI
                             └─ Proxies /api/* to ArgoCD (adds CORS)
```

**Key components:**
- **Frontend**: React 18 + TypeScript + Tailwind CSS v4
- **Proxy**: nginx with CORS headers for ArgoCD API
- **State Management**: TanStack Query for server state
- **Styling**: Tailwind CSS with dark mode support


## Requirements

- **ArgoCD**: v2.0 or later
- **Kubernetes**: 1.19+
- **Browsers**: Modern browsers (Chrome, Firefox, Safari, Edge)

## Troubleshooting

### Can't connect to ArgoCD

**Check the ArgoCD server URL:**
```bash
# Verify connectivity from Cased CD pod
kubectl exec -n argocd deployment/cased-cd -- \
  wget -O- http://argocd-server/api/version
```

### 401 Unauthorized

Your ArgoCD session token expired. Log out and log back in.

### CORS errors

The nginx proxy isn't working correctly. Check:
1. `ARGOCD_SERVER` environment variable is correct
2. ArgoCD server is accessible from Cased CD pod
3. Browser console for specific error messages

See **[DEPLOY.md](DEPLOY.md)** for more troubleshooting tips.

## Support

- **Website**: [cased.com](https://cased.com)
- **Documentation**: [docs.cased.com](https://docs.cased.com)
- **Contact**: support@cased.com

## Acknowledgments

Cased CD is built on top of ArgoCD, the declarative GitOps continuous delivery tool for Kubernetes. We're grateful to the ArgoCD community for creating such a powerful platform.

**ArgoCD**: [https://argo-cd.readthedocs.io](https://argo-cd.readthedocs.io)

---

**Built by [Cased](https://cased.com)**
