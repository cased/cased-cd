# Cased CD

A modern, redesigned UI for ArgoCD built with React, TypeScript, Tailwind CSS v4, and Radix UI.

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Quick Start (Mock API)

```bash
# Install dependencies
npm install

# Start mock API server (in one terminal)
npm run dev:mock

# Start frontend dev server (in another terminal)
npm run dev
```

Visit `http://localhost:5173` and login with any credentials.

### Using Real ArgoCD

#### Prerequisites

- Docker Desktop running
- k3d and kubectl (will be installed automatically by setup script)
- nginx (will be installed automatically by setup script)

#### Setup Local ArgoCD Cluster

```bash
# Make sure Docker Desktop is running first!

# Setup k3d cluster with ArgoCD
./scripts/setup-argocd.sh

# This will:
# - Install k3d, kubectl, and nginx if needed
# - Create a local Kubernetes cluster 'cased-cd' with LoadBalancer on port 9000
# - Install ArgoCD
# - Configure ArgoCD for local development (insecure mode)
# - Expose ArgoCD via LoadBalancer service (eliminates port-forward crashes)
# - Setup nginx CORS proxy on port 8090 (proxies to LoadBalancer)
# - Display admin credentials
# - Save credentials to .argocd-credentials file

# (Optional) Seed with test data
./scripts/seed-argocd.sh

# This will add:
# - 3 test repositories (argocd-examples, kubernetes-examples, bitnami)
# - 2 test clusters (staging-cluster, production-cluster)
# - 3 test applications (guestbook, helm-guestbook, kustomize-guestbook)

# (Optional) Clean test data
./scripts/clean-argocd.sh

# This will remove all seeded test data (apps, clusters, repos)
```

#### Run Frontend Against Real ArgoCD

```bash
# Start frontend with real API mode
npm run dev:real
```

The setup script will display credentials like:
```
Username: admin
Password: <generated-password>
```

Visit the URL shown by Vite (usually `http://localhost:5173-5178`) and login with these credentials.

**Note:** The setup uses:
- Port 8090: nginx CORS proxy (frontend connects here)
- Port 9000: k3d loadbalancer exposing ArgoCD LoadBalancer service
- Vite will pick an available port between 5173-5178

**Architecture:** Frontend → nginx (8090) → k3d LoadBalancer (9000) → ArgoCD Service (LoadBalancer) → ArgoCD Pod

**Why LoadBalancer?** This approach is robust and production-ready. Unlike port-forward which crashes when pods restart, LoadBalancer provides stable, persistent access to ArgoCD.

#### Teardown

```bash
# Remove the ArgoCD cluster and all resources
./scripts/teardown-argocd.sh
```

This will stop nginx, kill port-forward, delete the k3d cluster, and clean up config files.

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── ui/           # Base UI components (Button, Input, etc.)
│   └── ...           # Feature components
├── pages/            # Page components
├── services/         # API service layer
├── lib/              # Utilities and helpers
│   ├── api-client.ts # Axios configuration
│   └── theme.tsx     # Dark/light mode provider
└── types/            # TypeScript type definitions

scripts/
├── setup-argocd.sh    # Setup local ArgoCD
├── seed-argocd.sh     # Seed with test data
├── clean-argocd.sh    # Remove test data
└── teardown-argocd.sh # Teardown cluster

mock-server.js        # Express mock API server
```

## Scripts

### Development
- `npm run dev` - Start Vite dev server (uses mock API by default)
- `npm run dev:mock` - Start mock Express API server
- `npm run dev:real` - Start Vite dev server with real ArgoCD API

### ArgoCD Setup
- `npm run argocd:setup` - Setup local ArgoCD cluster with CORS proxy
- `./scripts/seed-argocd.sh` - Populate ArgoCD with test data (repositories, clusters, apps)
- `./scripts/clean-argocd.sh` - Remove all seeded test data
- `npm run argocd:teardown` - Remove ArgoCD cluster and cleanup

### Build & Test
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once (for CI)
- `npm run test:ui` - Run tests with Vitest UI

## Environment Variables

Create a `.env` file (see `.env.example`):

```bash
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

## Architecture

### API Client

The app uses a centralized Axios client (`src/lib/api-client.ts`) with:
- Automatic JWT token injection
- Request/response interceptors
- 401 redirect to login

### State Management

- TanStack Query for server state
- React Context for theme/appearance
- localStorage for auth tokens

### Styling

- Tailwind CSS v4 with CSS-based configuration
- Dark mode via `.dark` class on `<body>`
- Flat design with borders instead of shadows

## Backend Requirements

**You don't need to modify the ArgoCD backend!** The app works with the standard ArgoCD API.

The setup script configures:
- k3d cluster with built-in Traefik LoadBalancer on port 9000
- ArgoCD exposed via LoadBalancer service (stable, doesn't crash on pod restarts)
- nginx reverse proxy on port 8090 that adds CORS headers
- ArgoCD in insecure mode for local development (`server.insecure=true`)

The frontend connects to nginx (port 8090), which proxies to k3d LoadBalancer (port 9000) and adds proper CORS headers.

**Production Deployment:**
The same architecture works for production:
1. Deploy frontend as static site
2. Deploy ArgoCD with LoadBalancer or Ingress
3. Deploy nginx (or any reverse proxy) to add CORS headers
4. Point frontend to nginx URL

This setup is production-ready - the only difference is using real load balancers instead of k3d's local one.

## Contributing

This is a custom UI replacement for ArgoCD. It implements the ArgoCD API client-side and can be deployed as a static site.

## License

Built by Cased
