# Cased CD - Setup & Integration Guide

## 🚀 Quick Start

The API integration layer is ready! Here's how to connect to your ArgoCD instance.

---

## 📋 Prerequisites

- **ArgoCD server** running (v2.0+)
- **Node.js** 18+ installed
- **Access** to ArgoCD API (port forwarding or direct URL)

---

## 🔧 Configuration

### 1. Set up environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set your ArgoCD API URL:

```bash
# For local development with port forwarding
VITE_API_BASE_URL=http://localhost:8080/api/v1

# Or for a remote ArgoCD server
VITE_API_BASE_URL=https://argocd.example.com/api/v1
```

### 2. Start ArgoCD with port forwarding (if local)

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

### 3. Get your ArgoCD token

#### Option A: Using CLI
```bash
argocd login localhost:8080
argocd account generate-token
```

#### Option B: Using UI
1. Login to ArgoCD UI
2. Go to Settings → Accounts
3. Generate a new token

#### Option C: Using API
```bash
# Login first
curl http://localhost:8080/api/v1/session -d $'{"username":"admin","password":"your-password"}'

# Response will contain the token
```

### 4. Store the token (temporary - will be replaced with login flow)

For now, you can manually set the token in localStorage:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Run:
```javascript
localStorage.setItem('argocd_token', 'your-token-here')
```

4. Refresh the page

---

## 🎯 What's Implemented

### ✅ Core Infrastructure

- **API Client** (`src/lib/api-client.ts`)
  - Axios-based HTTP client
  - Automatic token injection
  - Request/response interceptors
  - Error handling with 401 redirect

- **Query Client** (`src/lib/query-client.tsx`)
  - TanStack Query configuration
  - Smart caching (30s stale time)
  - Auto retry with exponential backoff
  - Optimistic updates support

- **TypeScript Types** (`src/types/api.ts`)
  - Full ArgoCD API type definitions
  - Application, Repository, Cluster, Project
  - Health & Sync statuses
  - All request/response types

### ✅ Applications Service

**Location**: `src/services/applications.ts`

**API Methods**:
- `getApplications(filters?)` - List all applications
- `getApplication(name)` - Get single application
- `createApplication(app)` - Create new application
- `updateApplication(name, app)` - Update application
- `deleteApplication(name, cascade?)` - Delete application
- `syncApplication(name, prune?, dryRun?)` - Trigger sync
- `refreshApplication(name)` - Refresh app state

**React Hooks**:
- `useApplications(filters)` - Query all apps with filters
- `useApplication(name)` - Query single app
- `useCreateApplication()` - Create mutation
- `useUpdateApplication()` - Update mutation
- `useDeleteApplication()` - Delete mutation
- `useSyncApplication()` - Sync mutation
- `useRefreshApplication()` - Refresh mutation

### ✅ Applications Page

**Features**:
- ✅ Real-time data from ArgoCD API
- ✅ Loading state with spinner
- ✅ Error state with retry button
- ✅ Empty state for no applications
- ✅ Search functionality
- ✅ Refresh button (individual & global)
- ✅ Health status indicators
- ✅ Sync status badges
- ✅ Repository information
- ✅ Last sync timestamp

---

## 🧪 Testing the Integration

### 1. Without ArgoCD (Error State)

Just run the app - you'll see the error state since there's no API:

```bash
npm run dev
```

Visit http://localhost:5174/applications

You should see:
- "Failed to load applications" error message
- Red error box with retry button

### 2. With ArgoCD (Live Data)

1. Start ArgoCD with port forwarding
2. Set up the token (see above)
3. Run the app
4. Visit http://localhost:5174/applications

You should see:
- Loading spinner initially
- Your actual applications from ArgoCD
- Real health and sync statuses
- Ability to refresh individual apps

---

## 🔨 What to Build Next

### Priority 1: Authentication Flow

The token is currently manual. Next steps:

1. **Create Login Page** (`src/pages/login.tsx`)
   ```tsx
   - Username/password form
   - Call /api/v1/session endpoint
   - Store token in localStorage
   - Redirect to /applications
   ```

2. **Auth Context** (`src/lib/auth.tsx`)
   ```tsx
   - useAuth() hook
   - isAuthenticated state
   - login/logout functions
   - Protected routes
   ```

3. **Update API Client**
   - Better token management
   - Refresh token support
   - SSO integration

### Priority 2: Application Detail View

Create `/applications/:name` route:

1. **Resource Tree Visualization**
   - D3.js or React Flow
   - Show all K8s resources
   - Health status per resource
   - Click to see details

2. **Manifest Viewer**
   - Monaco editor
   - YAML/JSON toggle
   - Live vs Desired state diff
   - Edit mode with validation

3. **Operations**
   - Sync button with options
   - Delete with cascade checkbox
   - Rollback functionality
   - Manual sync per resource

### Priority 3: More Services

Create similar services for:

```bash
src/services/
├── applications.ts ✅
├── repositories.ts
├── clusters.ts
├── projects.ts
├── accounts.ts
├── settings.ts
└── metrics.ts
```

---

## 📊 API Endpoints Used

Currently calling:

- `GET /api/v1/applications` - List apps
- `GET /api/v1/applications/:name` - Get app details
- `POST /api/v1/applications` - Create app
- `PUT /api/v1/applications/:name` - Update app
- `DELETE /api/v1/applications/:name` - Delete app
- `POST /api/v1/applications/:name/sync` - Sync app
- `GET /api/v1/applications/:name?refresh=normal` - Refresh app

---

## 🐛 Troubleshooting

### "Network Error" or CORS issues

**Solution**: Add CORS headers to ArgoCD server or use a proxy.

In `vite.config.ts`:
```typescript
export default defineConfig({
  // ... existing config
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
```

Then update `.env`:
```bash
VITE_API_BASE_URL=/api/v1
```

### "401 Unauthorized"

- Check your token is valid
- Token might have expired - generate a new one
- Make sure token is properly set in localStorage

### "Loading forever"

- Check ArgoCD server is running
- Verify port forwarding is active
- Check browser console for errors
- Verify VITE_API_BASE_URL is correct

---

## 📝 Environment Variables

All available environment variables:

```bash
# API Configuration (required)
VITE_API_BASE_URL=http://localhost:8080/api/v1

# Future: Enable debug logging
VITE_DEBUG=true

# Future: API timeout (ms)
VITE_API_TIMEOUT=30000
```

---

## 🎓 Code Examples

### Fetching Applications

```tsx
import { useApplications } from '@/services/applications'

function MyComponent() {
  const { data, isLoading, error } = useApplications()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {data?.items.map(app => (
        <li key={app.metadata.name}>{app.metadata.name}</li>
      ))}
    </ul>
  )
}
```

### Syncing an Application

```tsx
import { useSyncApplication } from '@/services/applications'

function SyncButton({ appName }: { appName: string }) {
  const sync = useSyncApplication()

  const handleSync = async () => {
    await sync.mutateAsync({
      name: appName,
      prune: false,
      dryRun: false
    })
  }

  return (
    <button onClick={handleSync} disabled={sync.isPending}>
      {sync.isPending ? 'Syncing...' : 'Sync'}
    </button>
  )
}
```

### Filtering Applications

```tsx
import { useApplications } from '@/services/applications'

function FilteredApps() {
  const { data } = useApplications({
    project: 'default',
    cluster: 'https://kubernetes.default.svc',
    namespace: 'production'
  })

  return <div>{data?.items.length} apps</div>
}
```

---

## 🚀 Next Session

When you're ready to continue, start with:

1. **Build the login page** (Priority 1)
2. **Create auth context** and protected routes
3. **Add application detail view** (Priority 2)
4. **Implement resource tree visualization**

See `TODO.md` for the complete roadmap!

---

**Status**: Phase 1 Complete ✅ | Ready for Authentication Implementation 🔐
