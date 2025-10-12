# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cased CD is a modern, redesigned UI for ArgoCD built with React, TypeScript, Tailwind CSS v4, and shadcn/ui. It provides a completely custom frontend that works with the standard ArgoCD API without requiring backend modifications.

## UI Component Guidelines

**IMPORTANT**: Follow these strict guidelines when working with UI components:

- **Use shadcn/ui components** - All UI components should come from `@/components/ui/*` (shadcn/ui)
- **NEVER use Radix UI directly** - While shadcn/ui is built on Radix primitives, always use the shadcn wrapper components
- **NEVER use lucide-react** - All icons MUST come from `obra-icons-react`
- **Use Obra Icons** - Import icons from `obra-icons-react` using their Obra names directly (no aliases)

Install shadcn components with npx:

```bash
npx shadcn@latest add checkbox
```

Example icon imports:

```typescript
import {
  IconSearch,
  IconAdd,
  IconCodeBranch,
  IconCircleInfo,
  IconCircleWarning,
  IconCircleCheck,
  IconClock3,
  IconArrowRightUp,
  IconRotate,
  IconGrid,
} from 'obra-icons-react'

// Then use them directly in JSX:
<IconSearch className="h-4 w-4" />
<IconAdd className="h-5 w-5" />
```

## Development Commands

### Quick Start (Mock API - Default)

```bash
npm install                 # Install dependencies
npm run dev:mock            # Start mock API server (terminal 1)
npm run dev                 # Start Vite dev server (terminal 2)
```

Visit `http://localhost:5173` and login with any credentials.

### Using Real ArgoCD

```bash
# Prerequisites: Docker Desktop must be running
./scripts/setup-argocd.sh   # Setup local k3d cluster with ArgoCD
./scripts/seed-argocd.sh    # (Optional) Populate with test data
npm run dev:real            # Start Vite with real ArgoCD API

# Cleanup
./scripts/clean-argocd.sh   # Remove test data
./scripts/teardown-argocd.sh # Remove cluster
```

**Login credentials** are saved to `.argocd-credentials` after setup.

### Build & Quality

```bash
npm run build               # TypeScript compilation + Vite build
npm run lint                # ESLint
npm run preview             # Preview production build
npm test                    # Run tests in watch mode
npm run test:run            # Run tests once (for CI)
npm run test:ui             # Run tests with Vitest UI
```

## Architecture

### API Layer (`src/lib/api-client.ts`)

Centralized Axios client with:
- Automatic JWT token injection from localStorage (`argocd_token`)
- Request/response interceptors
- Automatic 401 redirect to `/login`
- Environment-based API routing:
  - Mock API: `http://localhost:8080/api/v1` (default)
  - Real ArgoCD: `http://localhost:8090/api/v1` (when `VITE_USE_REAL_API=true`)

### Authentication (`src/lib/auth.tsx`)

- JWT tokens stored in localStorage as `argocd_token`
- `AuthProvider` context for auth state management
- `ProtectedRoute` wrapper component for route protection
- `useAuth()` hook for accessing auth state and login/logout functions

### State Management

- **Server State**: TanStack Query (React Query) for all API calls with caching and automatic refetching
- **Theme/Appearance**: React Context (`src/lib/theme.tsx`) with dark/light mode
- **Auth**: React Context (`src/lib/auth.tsx`)
- **Local Storage**: Auth tokens (`argocd_token`) and theme preferences

### Service Layer Pattern (`src/services/`)

Each service module (applications, clusters, repositories, projects) follows this pattern:

1. **Query Keys Factory**: Hierarchical keys for React Query cache management
2. **API Functions**: Raw API calls returning typed responses
3. **React Query Hooks**: Hooks wrapping API functions with caching/refetching
4. **Mutations**: Always invalidate relevant query keys on success

Example:

```typescript
// Query keys factory
export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (filters?: Filters) => [...applicationKeys.lists(), filters] as const,
  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (name: string) => [...applicationKeys.details(), name] as const,
}

// API function
export const applicationsApi = {
  getApplication: async (name: string): Promise<Application> => {
    const response = await api.get<Application>(`/applications/${name}`)
    return response.data
  },
}

// Query hook
export function useApplication(name: string) {
  return useQuery({
    queryKey: applicationKeys.detail(name),
    queryFn: () => applicationsApi.getApplication(name),
    staleTime: 5 * 1000, // 5 seconds
  })
}

// Mutation hook
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

### Type Definitions (`src/types/api.ts`)

Complete TypeScript interfaces matching the ArgoCD API specification:
- `Application`, `ApplicationList`, `ApplicationSpec`, `ApplicationStatus`
- `Repository`, `RepositoryList`
- `Cluster`, `ClusterList`
- `Project`, `ProjectList`
- `ManagedResource`, `ManagedResourcesResponse` (for diff view)
- All types strictly match ArgoCD's REST API response shapes

### Routing Structure (`src/App.tsx`)

- **Public Routes**: `/login`
- **Protected Routes** (wrapped in `<Layout>`):
  - `/applications` - List all applications
  - `/applications/:name` - Application detail with tree/list/pods/diff views
  - `/repositories` - Repository management
  - `/clusters` - Cluster management
  - `/projects` - Project management
  - `/settings`, `/accounts`, `/certificates`, `/gpgkeys`, `/user-info`, `/help`

All protected routes redirect to `/login` if not authenticated.

### Styling

- **Tailwind CSS v4** with CSS-based configuration (`@import "tailwindcss"`in CSS)
- **Dark mode** via `.dark` class on `<body>` element (toggled by ThemeProvider)
- **Design aesthetic**: Flat design with borders instead of shadows
- **shadcn/ui components**: Pre-built accessible components in `src/components/ui/`
- **Obra Icons**: All iconography from `obra-icons-react`

### Mock Server (`mock-server.js`)

Express server on port 8080:
- In-memory data store for applications, repositories, clusters, projects
- CORS enabled for local development
- Accepts any credentials for login
- Returns realistic ArgoCD-shaped JSON responses
- Endpoints mirror real ArgoCD REST API structure

## Key Patterns & Best Practices

### Adding a New API Endpoint

1. Add TypeScript types to `src/types/api.ts`
2. Create or update service module in `src/services/`:
   - Add query keys to factory
   - Add API function
   - Add React Query hook(s)
3. Use hooks in page/component
4. Update mock server endpoint in `mock-server.js` (if needed for testing)

### Adding a New Page

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx` (inside or outside `<ProtectedRoute>`)
3. Add navigation link in `src/components/layout/sidebar.tsx` (if needed)

### Path Aliases

- `@/*` maps to `src/*` (configured in `vite.config.ts`)
- Always use path aliases for imports: `import api from '@/lib/api-client'`

### Toast Notifications

Use `sonner` for user feedback:

```typescript
import { toast } from 'sonner'

toast.success('Operation successful', {
  description: 'The resource was updated successfully',
})

toast.error('Operation failed', {
  description: error instanceof Error ? error.message : 'Unknown error',
})
```

### Real ArgoCD Setup Details

The setup script (`scripts/setup-argocd.sh`) configures:

- k3d cluster named `cased-cd`
- ArgoCD installed via kubectl with insecure mode (`server.insecure=true`)
- kubectl port-forward on port 9001 (ArgoCD server pod)
- nginx reverse proxy on port 8090 (adds CORS headers, proxies to port 9001)
- Frontend connects to nginx at `http://localhost:8090/api/v1`

**Architecture Flow**: Frontend → nginx (8090) → kubectl port-forward (9001) → ArgoCD Pod

### ArgoCD API Important Notes

When implementing features that interact with ArgoCD's API:

1. **Resource Manifests**: Use `/applications/{name}/resource` endpoint with query params:
   - `resourceName` - name of the resource
   - `kind` - resource kind (Service, Deployment, etc.)
   - `namespace` - resource namespace
   - `group` - API group (optional)
   - `version` - API version (optional)

2. **Resource Tree**: Use `/applications/{name}/resource-tree` to get full resource hierarchy including child resources (Pods, ReplicaSets, etc.). The `nodes` array contains all resources.

3. **Managed Resources**: Use `/applications/{name}/managed-resources` for diff view. Returns `normalizedLiveState` and `targetState` as YAML strings.

4. **Sync Status**: Always trust `app.status.resources[].status` for actual sync state, not client-side manifest comparison.

### Production Deployment

This app deploys as a static site:

1. Build: `npm run build` (outputs to `dist/`)
2. Deploy `dist/` to any static hosting (Vercel, Netlify, S3, etc.)
3. Configure ArgoCD server to allow CORS from your domain, OR deploy a CORS proxy similar to the nginx setup in `scripts/setup-argocd.sh`
4. Set `VITE_API_BASE_URL` environment variable to point to your ArgoCD API endpoint

## Testing

- **Unit/Integration Tests**: Vitest with React Testing Library
- **Component Tests**: Located alongside components or in `__tests__` directories
- **Mock Data**: Mock server provides realistic ArgoCD responses for E2E-like testing

## argocd-research-specialist Agent

When you need to verify ArgoCD's actual API behavior, implementation details, or UI patterns, use the `argocd-research-specialist` agent. This agent is specifically designed to:

- Research ArgoCD's REST API specifications
- Investigate actual API response structures
- Verify ArgoCD UI behavior for specific features
- Clarify ambiguous API documentation
- Compare mock data against real ArgoCD responses

Example: "I need to implement the sync operation. Can you research the exact API contract for ArgoCD's application sync endpoint?"
