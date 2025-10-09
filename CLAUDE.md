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

Install shadcn components with bun, for example a checkbox:

```
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
npm run dev:real            # Start Vite with real ArgoCD API
./scripts/teardown-argocd.sh # Cleanup when done
```

### Build & Quality

```bash
npm run build               # TypeScript compilation + Vite build
npm run lint                # ESLint
npm run preview             # Preview production build
```

## Architecture

### API Layer (`src/lib/api-client.ts`)

- Centralized Axios client with automatic JWT token injection
- Request/response interceptors
- Automatic 401 redirect to login
- Switches between mock API (port 8080) and real ArgoCD (port 9000) via `VITE_USE_REAL_API` env var

### Authentication (`src/lib/auth.tsx`)

- JWT tokens stored in localStorage as `argocd_token`
- `AuthProvider` context for auth state
- `ProtectedRoute` wrapper component for route protection
- `useAuth()` hook for accessing auth state

### State Management

- **Server State**: TanStack Query (React Query) for all API calls
- **Theme/Appearance**: React Context (`src/lib/theme.tsx`)
- **Auth**: React Context (`src/lib/auth.tsx`)
- **Local Storage**: Auth tokens and theme preferences

### Service Layer Pattern (`src/services/`)

Each service module (applications, clusters, repositories, projects) follows this pattern:

1. **Query Keys**: Hierarchical keys for cache management (e.g., `applicationKeys.detail(name)`)
2. **API Functions**: Raw API calls (e.g., `applicationsApi.getApplication()`)
3. **React Query Hooks**: Hooks that wrap API functions (e.g., `useApplication()`, `useCreateApplication()`)
4. **Mutations**: Always invalidate relevant query keys on success

Example:

```typescript
// Query hook
export function useApplication(name: string) {
  return useQuery({
    queryKey: applicationKeys.detail(name),
    queryFn: () => applicationsApi.getApplication(name),
    staleTime: 5 * 1000,
  });
}

// Mutation hook
export function useUpdateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, app }) => applicationsApi.updateApplication(name, app),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: applicationKeys.detail(variables.name),
      });
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
    },
  });
}
```

### Type Definitions (`src/types/api.ts`)

- Complete TypeScript interfaces for ArgoCD API
- Matches ArgoCD API spec (Application, Repository, Cluster, Project, etc.)
- All API responses are strongly typed

### Styling

- Tailwind CSS v4 with CSS-based configuration
- Dark mode via `.dark` class on `<body>` element
- Flat design aesthetic with borders instead of shadows
- shadcn/ui components for accessible, pre-styled UI primitives
- Obra Icons for all iconography

### Mock Server (`mock-server.js`)

- Express server on port 8080 with CORS enabled
- In-memory data store for development
- Accepts any credentials for login
- Returns realistic ArgoCD-shaped responses

## Key Patterns

### Adding a New API Endpoint

1. Add TypeScript types to `src/types/api.ts`
2. Create service module in `src/services/` with:
   - Query keys factory
   - API functions
   - React Query hooks
3. Use hooks in components

### Path Aliases

- `@/*` maps to `src/*` (configured in `vite.config.ts`)
- Use `import api from '@/lib/api-client'` instead of relative paths

### Real ArgoCD Setup Details

The setup script (`scripts/setup-argocd.sh`) configures:

- k3d cluster named 'cased-cd'
- ArgoCD in insecure mode (`server.insecure=true`)
- CORS enabled for localhost:5173-5178
- nginx reverse proxy on port 9000 (adds CORS headers)
- kubectl port-forward on port 9001 (ArgoCD server)
- Frontend connects to nginx proxy at `http://localhost:9000/api/v1`

### Production Deployment Notes

For production, this app can be deployed as a static site. You'll need to:

1. Configure your ArgoCD server to allow CORS from your domain, OR
2. Deploy a CORS proxy similar to the nginx setup in `scripts/setup-argocd.sh`
