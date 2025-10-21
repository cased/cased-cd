# Cased CD

**A modern, beautiful UI for ArgoCD**

Cased CD is a completely redesigned user interface for ArgoCD, built with modern web technologies for a superior user experience. It works seamlessly with your existing ArgoCD installation - no backend modifications required.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Docker](https://img.shields.io/badge/docker-ghcr.io%2Fcased%2Fcased--cd-blue)](https://github.com/cased/cased-cd/pkgs/container/cased-cd)

Built by [**Cased**](https://cased.com) - Modern security and compliance infrastructure.

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
helm repo add cased https://cased.github.io/charts
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
- **[Contributing](CONTRIBUTING.md)** - Development setup and guidelines
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

## Development

Want to contribute or run locally? See our **[Development Guide](DEVELOPMENT.md)**.

Quick start for developers:

```bash
# Install dependencies
npm install

# Start mock API server
npm run dev:mock

# Start dev server (in another terminal)
npm run dev
```

Visit `http://localhost:5173` and login with any credentials (mock mode).

### Development Scripts

- `npm run dev` - Start Vite dev server (uses mock API)
- `npm run dev:mock` - Start mock Express API server
- `npm run dev:real` - Connect to real ArgoCD instance
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Lint code

## Project Structure

```
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   ├── services/        # API service layer
│   ├── lib/             # Utilities and helpers
│   └── types/           # TypeScript definitions
├── chart/               # Helm chart
├── docker/              # Docker configuration
├── scripts/             # Development scripts
└── mock-server.js       # Mock API for development
```

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

## Contributing

We welcome contributions! Please see **[CONTRIBUTING.md](CONTRIBUTING.md)** for:
- Code of Conduct
- Development setup
- Pull request process
- Code style guidelines

## Support

- **Issues**: [GitHub Issues](https://github.com/cased/cased-cd/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cased/cased-cd/discussions)
- **Website**: [cased.com](https://cased.com)
- **Documentation**: [docs.cased.com](https://docs.cased.com)

## License

Cased CD is licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) for details.

## Acknowledgments

Cased CD is built on top of ArgoCD, the declarative GitOps continuous delivery tool for Kubernetes. We're grateful to the ArgoCD community for creating such a powerful platform.

**ArgoCD**: [https://argo-cd.readthedocs.io](https://argo-cd.readthedocs.io)

---

**Built with ❤️ by [Cased](https://cased.com)**

Learn more about Cased's security and compliance platform at [cased.com](https://cased.com).
