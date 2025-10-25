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

Upgrade to Cased CD Enterprise for advanced team management and compliance capabilities:

- **🔐 RBAC Management** - Fine-grained role-based access control per application
- **👥 User Management** - Create and delete users directly from the UI
- **📊 Advanced Permissions** - Granular control over deploy, rollback, and delete actions
- **🔔 Notification Services** - Configure Slack, Webhook, and Email notifications for deployment events
- **📋 Comprehensive Audit Trail** - Track all user actions with detailed before/after change logs stored in Kubernetes ConfigMaps

[Contact us](https://cased.com) to learn about Cased CD Enterprise.

#### Audit Trail Deep Dive

The enterprise audit trail provides comprehensive tracking of all user actions for compliance and security:

**What's Tracked:**
- **Login Activity**: All login attempts (success and failure) with username, timestamp, and IP address
- **RBAC Changes**: Before/after snapshots of policy modifications
- **User Management**: Account creation and deletion with full details
- **Notification Services**: Creation, updates, and deletion of notification configurations
- **Resource Deletions**: Application and project deletions (high-risk operations)

**How It Works:**
The audit backend intercepts specific API requests, logs the action details, then forwards to ArgoCD. This allows capturing:
- **Before state**: What the resource looked like before the change
- **After state**: What it looks like after the change
- **Metadata**: Who made the change, when, from what IP address
- **Success/Failure**: Whether the operation succeeded or failed

**Storage & Compliance:**
- Audit events are stored in a Kubernetes ConfigMap (`cased-audit`)
- Limited to 1000 most recent events (configurable)
- Stored as JSON for easy parsing and analysis
- Can be backed up using standard Kubernetes backup tools
- Accessible via `kubectl get configmap cased-audit -n argocd -o yaml`

**Why a Backend?**
ArgoCD itself doesn't provide detailed audit logging for most operations. To capture this information, we need to:
1. Intercept requests (especially login and deletes)
2. Record the before state
3. Forward to ArgoCD
4. Record the after state and result
5. Store in persistent storage

This is only possible with a backend component that sits between the UI and ArgoCD.

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
| **Notification Services (Slack/Webhook/Email)** | ❌ | ✅ |
| **Audit Trail** | ❌ | ✅ |
| **Login Tracking** | ❌ | ✅ |
| **Change History (Before/After)** | ❌ | ✅ |

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

### Enterprise Deployment (with Audit Backend)

Enterprise customers receive an additional backend component for advanced features:

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│             │  HTTPS  │              │  HTTP   │             │
│   Browser   ├────────►│   Cased CD   ├────────►│   ArgoCD    │
│             │         │   (nginx)    │    │    │   Server    │
└─────────────┘         └──────────────┘    │    └─────────────┘
                             │               │
                             │               └───► ┌──────────────────┐
                             │                     │  Audit Backend   │
                             │                     │  (Go service)    │
                             │                     └──────────────────┘
                             │                            │
                             ├─ Serves static UI         │
                             ├─ /api/v1/* → ArgoCD      │
                             └─ Enterprise endpoints ────┘
                                  - /api/v1/settings/rbac
                                  - /api/v1/settings/audit
                                  - /api/v1/session (login auditing)
                                  - /api/v1/account
                                  - /api/v1/notifications
                                  - /api/v1/license
                                     │
                                     └─ Kubernetes API access
                                        - Reads/writes ConfigMaps (RBAC, audit, notifications)
                                        - Manages Secrets (passwords, tokens)
                                        - Stores audit events (cased-audit ConfigMap)
```

**Why the backend?**

The backend is necessary for enterprise features because:
1. **Audit Trail**: Intercepts requests (login, deletes) to log before/after state
2. **Compliance**: Stores immutable audit logs in Kubernetes ConfigMaps
3. **RBAC Management**: Direct ConfigMap manipulation for ArgoCD RBAC policies
4. **User Management**: Creates users with bcrypt password hashing
5. **License Validation**: Enforces enterprise feature access

**Standard Components:**
- **Frontend**: React 18 + TypeScript + Tailwind CSS v4
- **Proxy**: nginx with CORS headers for ArgoCD API
- **State Management**: TanStack Query for server state

**Enterprise Components:**
- **Audit Backend**: Go service for user/permission management and audit logging
- **Kubernetes Access**: Direct ConfigMap/Secret manipulation
- **License Validation**: Enterprise feature gating
- **Audit Storage**: Kubernetes ConfigMaps (`cased-audit`) for compliance


## Requirements

- **ArgoCD**: v2.0 or later
- **Kubernetes**: 1.19+
- **Browsers**: Modern browsers (Chrome, Firefox, Safari, Edge)

## Troubleshooting

### Local Development: 404 Errors or RBAC Failures

If you're getting 404 errors or RBAC configuration failures in local development, your kubectl context may be pointing to the wrong cluster.

**Fix:**
```bash
# 1. Check current context
kubectl config current-context

# 2. Switch to k3d cluster
kubectl config use-context k3d-cased-cd

# 3. Restart port-forward (ArgoCD server on port 8090)
kubectl port-forward svc/argocd-server -n argocd 8090:443 &

# 4. Restart audit backend (if using enterprise features)
cd backend
lsof -ti:8081 | xargs kill
./cased-backend &
```

**Common cause**: Switching between production and local k3d clusters without restarting dependent services.

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

**Getting the admin password:**

The script displays the password when it runs and saves it to `.argocd-credentials`. If you need to retrieve it later:

```bash
# Option 1: Read from saved credentials file
cat .argocd-credentials

# Option 2: Get directly from Kubernetes secret
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d && echo
```

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
npm run dev              # Start dev server (uses mock API)
npm run dev:mock         # Start mock API server only
npm run dev:real         # Start dev server (uses real ArgoCD, no backend)
npm run dev:enterprise   # Start dev server (real ArgoCD + enterprise backend)
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript compiler check
```

### Development Modes

Cased CD supports three development modes:

#### 1. Mock Mode (Default)
```bash
npm run dev:mock    # Terminal 1: Start mock API
npm run dev         # Terminal 2: Start Vite
```
- **Use case**: Quick UI development without ArgoCD
- **Requirements**: None
- **Features**: Mock data, no real ArgoCD
- **Login**: Any username/password

#### 2. Real ArgoCD (Community Features)
```bash
./scripts/setup-argocd.sh   # One-time: Setup k3d cluster
npm run dev:real            # Start Vite with real ArgoCD
```
- **Use case**: Testing with real ArgoCD, community features only
- **Requirements**: Docker Desktop, k3d cluster running
- **Features**: Full ArgoCD integration, no audit trail
- **Login**: ArgoCD credentials (admin/password from setup)
- **Backend**: Not required (requests go directly to ArgoCD)

#### 3. Enterprise Mode (Full Features + Audit Trail)
```bash
./scripts/setup-argocd.sh        # One-time: Setup k3d cluster
cd backend && go build .         # Build backend
./backend/cased-backend &        # Terminal 1: Start backend (port 8081)
npm run dev:enterprise           # Terminal 2: Start Vite with enterprise mode
```
- **Use case**: Testing enterprise features and audit trail
- **Requirements**: Docker Desktop, k3d cluster, Go 1.21+
- **Features**: Everything + RBAC management, user management, audit trail
- **Login**: ArgoCD credentials (admin/password from setup)
- **Backend**: **Required** on port 8081

**Key Difference**: `dev:real` vs `dev:enterprise`
- `dev:real`: Direct ArgoCD connection, no backend, free tier features
- `dev:enterprise`: Routes enterprise endpoints through backend for audit logging

**Environment Variables:**
- `VITE_USE_REAL_API=true` - Connect to real ArgoCD instead of mock
- `VITE_ENTERPRISE_BACKEND=true` - Enable enterprise backend proxying

The `dev:enterprise` script sets both variables automatically.

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
