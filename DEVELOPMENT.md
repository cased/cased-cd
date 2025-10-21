# Development Guide

This guide covers setting up a local development environment for Cased CD.

## Prerequisites

- Node.js 18+
- npm or yarn
- Docker Desktop (for testing against real ArgoCD)

## Quick Start (Mock API)

The fastest way to start developing is using the mock API server:

```bash
# Install dependencies
npm install

# Start mock API server (in one terminal)
npm run dev:mock

# Start frontend dev server (in another terminal)
npm run dev
```

Visit `http://localhost:5173` and login with **any credentials** (the mock server accepts anything).

The mock server provides realistic ArgoCD API responses for:
- Applications
- Repositories
- Clusters
- Projects
- Sync operations

## Using Real ArgoCD

For testing against a real ArgoCD instance:

### Prerequisites

- Docker Desktop running
- k3d and kubectl (installed automatically by setup script)
- nginx (installed automatically by setup script)

### Setup Local ArgoCD Cluster

```bash
# Make sure Docker Desktop is running!

# Setup k3d cluster with ArgoCD
./scripts/setup-argocd.sh
```

This script will:
1. Install k3d, kubectl, and nginx if needed
2. Create a local Kubernetes cluster named `cased-cd`
3. Install ArgoCD
4. Configure ArgoCD for local development (insecure mode)
5. Start kubectl port-forward on port 9001
6. Setup nginx CORS proxy on port 8090
7. Display admin credentials
8. Save credentials to `.argocd-credentials` file

### Seed with Test Data (Optional)

```bash
./scripts/seed-argocd.sh
```

This adds:
- 3 test repositories (argocd-examples, kubernetes-examples, bitnami)
- 2 test clusters (staging-cluster, production-cluster)
- 3 test applications (guestbook, helm-guestbook, kustomize-guestbook)

### Run Frontend Against Real ArgoCD

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

**Network Architecture:**
```
Frontend → nginx (8090) → kubectl port-forward (9001) → ArgoCD Pod
```

Ports:
- **8090**: nginx CORS proxy (frontend connects here)
- **9001**: kubectl port-forward to ArgoCD server
- **5173-5178**: Vite dev server (picks first available)

### Clean Test Data

```bash
./scripts/clean-argocd.sh
```

Removes all seeded test data (apps, clusters, repos).

### Teardown

```bash
./scripts/teardown-argocd.sh
```

Stops nginx, kills kubectl port-forward processes, deletes the k3d cluster, and cleans up config files.

## Available Scripts

### Development

- **`npm run dev`** - Start Vite dev server (uses mock API by default)
- **`npm run dev:mock`** - Start mock Express API server
- **`npm run dev:real`** - Start Vite dev server with real ArgoCD API

### ArgoCD Setup

- **`npm run argocd:setup`** - Setup local ArgoCD cluster with CORS proxy
- **`./scripts/seed-argocd.sh`** - Populate ArgoCD with test data
- **`./scripts/clean-argocd.sh`** - Remove all seeded test data
- **`npm run argocd:teardown`** - Remove ArgoCD cluster and cleanup

### Build & Test

- **`npm run build`** - Build for production
- **`npm run preview`** - Preview production build
- **`npm run lint`** - Run ESLint
- **`npm run test`** - Run tests in watch mode
- **`npm run test:run`** - Run tests once (for CI)
- **`npm run test:ui`** - Run tests with Vitest UI
- **`npm run type-check`** - Run TypeScript type checking

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── ui/           # Base shadcn/ui components (Button, Input, etc.)
│   ├── layout/       # Layout components (Sidebar, Header, etc.)
│   └── ...           # Feature components
├── pages/            # Page components (Applications, Repositories, etc.)
├── services/         # API service layer
│   ├── applications.ts
│   ├── repositories.ts
│   ├── clusters.ts
│   └── ...
├── lib/              # Utilities and helpers
│   ├── api-client.ts # Axios configuration
│   ├── theme.tsx     # Dark/light mode provider
│   ├── auth.tsx      # Authentication context
│   └── ...
├── types/            # TypeScript type definitions
│   └── api.ts        # ArgoCD API types
└── hooks/            # Custom React hooks

scripts/
├── setup-argocd.sh    # Setup local ArgoCD
├── seed-argocd.sh     # Seed with test data
├── clean-argocd.sh    # Remove test data
└── teardown-argocd.sh # Teardown cluster

chart/                # Helm chart for deployment
docker/               # Docker configuration
mock-server.js        # Express mock API server
```

## Environment Variables

Create a `.env` file (see `.env.example`):

```bash
# API base URL (automatically set by npm scripts)
VITE_API_BASE_URL=http://localhost:8080/api/v1  # Mock API (default)
# or
VITE_API_BASE_URL=http://localhost:8090/api/v1  # Real ArgoCD (via nginx proxy)
```

The `dev:real` script automatically sets `VITE_USE_REAL_API=true` which changes the base URL to `http://localhost:8090`.

## Architecture

### API Client

The app uses a centralized Axios client (`src/lib/api-client.ts`) with:

- **Automatic JWT token injection** from localStorage (`argocd_token`)
- **Request/response interceptors** for logging and error handling
- **401 redirect** to login page
- **Environment-based routing**:
  - Mock API: `http://localhost:8080/api/v1`
  - Real ArgoCD: `http://localhost:8090/api/v1`

### State Management

- **Server State**: TanStack Query (React Query) for all API calls
  - Automatic caching
  - Background refetching
  - Optimistic updates
  - Query invalidation
- **Theme State**: React Context (`src/lib/theme.tsx`)
- **Auth State**: React Context (`src/lib/auth.tsx`)
- **Local Storage**: Auth tokens (`argocd_token`) and theme preferences

### Service Layer Pattern

Each service module follows this pattern:

```typescript
// 1. Query Keys Factory
export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (filters?: Filters) => [...applicationKeys.lists(), filters] as const,
  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (name: string) => [...applicationKeys.details(), name] as const,
}

// 2. API Functions
export const applicationsApi = {
  getApplication: async (name: string): Promise<Application> => {
    const response = await api.get<Application>(`/applications/${name}`)
    return response.data
  },
}

// 3. Query Hooks
export function useApplication(name: string) {
  return useQuery({
    queryKey: applicationKeys.detail(name),
    queryFn: () => applicationsApi.getApplication(name),
    staleTime: 5 * 1000, // 5 seconds
  })
}

// 4. Mutation Hooks
export function useUpdateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, app }) => applicationsApi.updateApplication(name, app),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.name) })
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
    },
  })
}
```

### Styling

- **Tailwind CSS v4** with CSS-based configuration
- **Dark mode** via `.dark` class on `<body>` element
- **shadcn/ui components** for consistent UI
- **Obra Icons** for all iconography
- **Flat design** aesthetic with borders instead of shadows

### Routing

Routes are defined in `src/App.tsx`:

- **Public**: `/login`
- **Protected** (requires auth):
  - `/applications` - List all applications
  - `/applications/:name` - Application detail
  - `/applications/:name/settings` - Application settings
  - `/repositories`, `/clusters`, `/projects` - Resource management
  - `/settings`, `/accounts`, `/certificates`, `/gpgkeys` - System settings

## Testing

### Unit Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui
```

Tests are located alongside the code or in `__tests__` directories. We use:
- **Vitest** for test runner
- **React Testing Library** for component testing
- **MSW** (Mock Service Worker) for API mocking

### Integration Tests

Integration tests can run against the mock server or real ArgoCD:

```typescript
// src/test/integration/sync.test.tsx
describe('Sync Integration Test', () => {
  it('should sync an application via API', async () => {
    // Test implementation
  })
})
```

## Code Style

- **TypeScript** for all code
- **ESLint** for linting (run `npm run lint`)
- **Prettier** for formatting (configured in `.prettierrc`)
- **Conventional Commits** for commit messages

### Component Guidelines

1. Use functional components with hooks
2. Extract complex logic into custom hooks
3. Use TypeScript for all props and state
4. Follow the service layer pattern for API calls
5. Use shadcn/ui components when possible
6. Use Obra Icons (never lucide-react or other icon libraries)

Example component:

```typescript
import { useApplication } from '@/services/applications'
import { IconCheck } from 'obra-icons-react'
import { Button } from '@/components/ui/button'

export function ApplicationStatus({ name }: { name: string }) {
  const { data: app, isLoading } = useApplication(name)

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <h2>{app.metadata.name}</h2>
      <Button>
        <IconCheck size={16} />
        Sync
      </Button>
    </div>
  )
}
```

## Adding New Features

### Adding a New API Endpoint

1. **Add types** to `src/types/api.ts`
2. **Create/update service** in `src/services/`:
   - Add query keys
   - Add API function
   - Add React Query hook(s)
3. **Use in component** via the hook
4. **Update mock server** in `mock-server.js` (if needed)

### Adding a New Page

1. **Create component** in `src/pages/`
2. **Add route** in `src/App.tsx`
3. **Add navigation** in `src/components/layout/sidebar.tsx` (if needed)

## Debugging

### Common Issues

**Port already in use:**
```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

**Mock server not responding:**
```bash
# Check if it's running
lsof -i:8080

# Restart it
npm run dev:mock
```

**Real ArgoCD connection issues:**
```bash
# Check port-forward is running
lsof -i:9001

# Check nginx is running
lsof -i:8090

# Restart port-forward
kubectl port-forward -n argocd svc/argocd-server 9001:80
```

### Browser DevTools

Use React DevTools and TanStack Query DevTools:

- **React DevTools**: Inspect component tree and props
- **Query DevTools**: View query cache, refetch queries, inspect state

Query DevTools are automatically enabled in development mode (bottom-left corner).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Code of Conduct
- Pull request process
- Code review guidelines
- Release process

## Resources

- **ArgoCD API Docs**: https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/
- **React Docs**: https://react.dev
- **TanStack Query**: https://tanstack.com/query
- **Tailwind CSS**: https://tailwindcss.com
- **shadcn/ui**: https://ui.shadcn.com

---

Happy coding! 🚀
