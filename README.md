# Cased CD

**A modern, beautiful UI for ArgoCD**

Cased CD is a completely redesigned user interface for ArgoCD, built with modern web technologies for a superior user experience. It works seamlessly with your existing ArgoCD installation - no backend modifications required.

[![Docker](https://img.shields.io/badge/docker-ghcr.io%2Fcased%2Fcased--cd-blue)](https://github.com/cased/cased-cd/pkgs/container/cased-cd)

Built by [**Cased**](https://cased.com).

---

## Features

### Core Features (All Users)

- **Modern UI/UX** - Clean, intuitive interface built with React and Tailwind CSS
- **Dark Mode** - Full dark mode support
- **Real-time Updates** - Live sync status and resource health monitoring
- **Application Management** - Create, sync, refresh, and delete applications
- **Resource Visualization** - Tree view, network graph, and list views for resources
- **Deployment History** - Track and rollback to previous versions
- **Multi-cluster Support** - Manage applications across multiple Kubernetes clusters
- **Repository Management** - Connect Git repositories and Helm charts
- **Account Management** - View users, update passwords, manage API tokens
- **No Backend Changes** - Works with standard ArgoCD API (v2.0+)

### Enterprise Features

Upgrade to Cased CD Enterprise for advanced team management capabilities:

- **🔐 RBAC Management** - Fine-grained role-based access control per application
- **👥 User Management** - Create and delete users directly from the UI
- **📊 Advanced Permissions** - Granular control over deploy, rollback, and delete actions

[Contact us](https://cased.com) to learn about Cased CD Enterprise.

### Feature Comparison

| Feature | Standard | Enterprise |
|---------|----------|------------|
| Application Management | ✅ | ✅ |
| Multi-cluster Support | ✅ | ✅ |
| Repository Management | ✅ | ✅ |
| Deployment History & Rollback | ✅ | ✅ |
| Resource Visualization | ✅ | ✅ |
| View Accounts | ✅ | ✅ |
| Update Passwords | ✅ | ✅ |
| Manage API Tokens | ✅ | ✅ |
| **Create/Delete Users** | ❌ | ✅ |
| **RBAC Permission Management** | ❌ | ✅ |
| **Per-App Access Control** | ❌ | ✅ |

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

### Enterprise Installation

Enterprise customers should contact support@cased.com for access to the RBAC backend component and installation instructions.

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

### Standard Deployment

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

### Enterprise Deployment (with RBAC Backend)

Enterprise customers receive an additional backend component for advanced features:

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│             │  HTTPS  │              │  HTTP   │             │
│   Browser   ├────────►│   Cased CD   ├────────►│   ArgoCD    │
│             │         │   (nginx)    │    │    │   Server    │
└─────────────┘         └──────────────┘    │    └─────────────┘
                             │               │
                             │               └───► ┌─────────────────┐
                             │                     │  RBAC Backend   │
                             │                     │  (Go service)   │
                             │                     └─────────────────┘
                             │                            │
                             ├─ Serves static UI         │
                             ├─ /api/v1/* → ArgoCD      │
                             └─ /api/v1/settings/* ─────┘
                                /api/v1/license ─────────┘
                                     │
                                     └─ Direct Kubernetes API access
                                        for RBAC ConfigMap management
```

**Standard Components:**
- **Frontend**: React 18 + TypeScript + Tailwind CSS v4
- **Proxy**: nginx with CORS headers for ArgoCD API
- **State Management**: TanStack Query for server state

**Enterprise Components:**
- **RBAC Backend**: Go service for user/permission management
- **Kubernetes Access**: Direct ConfigMap/Secret manipulation
- **License Validation**: Enterprise feature gating


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

## Building from Source

Cased CD uses a unified multi-stage Dockerfile that produces both standard and enterprise images from a single build process.

### Build Standard Image (Free Tier)

```bash
./scripts/build-standard.sh [version]
```

This builds the standard image containing:
- React frontend
- nginx web server
- ArgoCD API proxy

**Output**: `ghcr.io/cased/cased-cd:latest`

### Build Enterprise Image

```bash
./scripts/build-enterprise.sh [version]
```

This builds the enterprise image containing:
- React frontend
- Go backend (RBAC + user management)
- Static file server

**Output**: `ghcr.io/cased/cased-cd-enterprise:latest`

### Multi-stage Build Architecture

The Dockerfile uses 4 stages:

1. **frontend-builder** - Builds React app (shared by both images)
2. **standard** - nginx + React (standard tier)
3. **backend-builder** - Builds Go binary (enterprise only)
4. **enterprise** - Go + React (enterprise tier)

### Enterprise Requirements

The enterprise image requires:
- Kubernetes RBAC permissions to read/write ConfigMaps and Secrets in `argocd` namespace
- Access to private container registry (credentials serve as license validation)

Contact support@cased.com for enterprise access.

## Development

### Quick Start

Get up and running in seconds with the mock API:

```bash
./scripts/dev-start.sh
```

This will:
- ✅ Check Node.js 18+ is installed
- 📦 Install dependencies if needed
- 🎭 Start mock API server (port 8080)
- 🌐 Start Vite dev server (port 5173)
- 📖 Tail logs from both servers

Open **http://localhost:5173** and login with any credentials.

To stop the servers:
```bash
./scripts/dev-stop.sh
```

### Testing with Real ArgoCD

For a complete local ArgoCD setup with seed data:

```bash
./scripts/dev-start-real.sh
```

This will:
- ✅ Check Docker Desktop is running
- 🏗️ Create k3d cluster with ArgoCD
- 🌱 Seed with test data (3 apps, 3 repos, 2 clusters)
- 🔐 Display admin credentials
- 🌐 Start Vite dev server

**What you get:**
- Real ArgoCD running locally in k3d
- 3 sample applications (guestbook variants)
- 3 repositories (ArgoCD examples, Kubernetes examples, Bitnami Helm)
- 2 mock clusters (staging, production)
- Full GitOps workflow testing

To tear down when done:
```bash
./scripts/teardown-argocd.sh
```

**Manual Setup** (if you prefer step-by-step):
```bash
./scripts/setup-argocd.sh    # Setup k3d cluster with ArgoCD
./scripts/seed-argocd.sh     # Add test data
npm run dev:real             # Start Vite with real ArgoCD API
./scripts/teardown-argocd.sh # Cleanup when done
```

### Available Commands

```bash
npm run dev          # Start dev server (uses mock API)
npm run dev:mock     # Start mock API server only
npm run dev:real     # Start dev server (uses real ArgoCD)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

### Prerequisites

- **Node.js**: 18 or later
- **npm**: Comes with Node.js
- **Docker** (optional): Only needed for real ArgoCD testing

### Project Structure

```
cased-cd/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components (routes)
│   ├── services/       # API services (React Query)
│   ├── lib/            # Utilities (api-client, auth, theme)
│   └── types/          # TypeScript types
├── backend/            # Go backend (enterprise only)
├── scripts/            # Development & deployment scripts
├── mock-server.js      # Express mock API server
└── Dockerfile          # Multi-stage build (standard + enterprise)
```

See **[CLAUDE.md](CLAUDE.md)** for detailed architecture documentation.

## Support

- **Website**: [cased.com](https://cased.com)
- **Documentation**: [docs.cased.com](https://docs.cased.com)
- **Contact**: support@cased.com

## Acknowledgments

Cased CD is built on top of ArgoCD, the declarative GitOps continuous delivery tool for Kubernetes. We're grateful to the ArgoCD community for creating such a powerful platform.

**ArgoCD**: [https://argo-cd.readthedocs.io](https://argo-cd.readthedocs.io)

---

**Built by [Cased](https://cased.com)**
