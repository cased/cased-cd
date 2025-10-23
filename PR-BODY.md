# RBAC & User Management - Enterprise Feature Implementation

## Summary

This PR introduces comprehensive RBAC (Role-Based Access Control) and user management capabilities to Cased CD, establishing the foundation for the enterprise offering. The implementation includes a complete permission management system, user lifecycle management, and proper feature gating to differentiate between free and enterprise tiers.

## Features

### 🔐 RBAC Permission Management (Enterprise)

**Phase 1: Policy Parsing & Visualization**
- Implemented Casbin policy parser for ArgoCD's RBAC format
- Built comprehensive policy viewer showing all user permissions
- Display policies in human-readable format with project/action breakdown
- Support for wildcard permissions (`*/*`) and specific project access

**Phase 2: Permission Editor**
- Interactive permission editor for assigning user access to applications
- Granular permission controls:
  - **Can View** - Read-only access to applications
  - **Can Deploy** - Trigger sync operations
  - **Can Rollback** - Execute rollback actions
  - **Can Delete** - Remove applications
- Support for "All Projects" wildcard permissions
- Smart permission inheritance (deploy/rollback/delete automatically grant view)
- Batch permission updates to prevent race conditions

**Phase 3: Permission Details Panel**
- Slide-out panel showing detailed user permissions
- Visual capability summary per project
- "Full Access" badge for users with all permissions
- Expandable Casbin policy view for advanced users
- "Clear Permissions" action to revoke all access

**Phase 4: User Context & UX**
- Show existing permissions when editing
- Prevent checkbox resets during form interactions
- Wildcard permission detection (don't allow redundant specific permissions)
- Visual feedback for inherited permissions
- Toast notifications for all permission changes

### 👥 User Management (Enterprise)

**Account Creation**
- Create new ArgoCD local users via UI
- Username validation (3-63 chars, alphanumeric with hyphens/underscores/periods)
- Password setup during creation
- Automatic capability assignment (`apiKey, login`)
- Real-time account list updates

**Account Deletion**
- Delete non-admin users from UI
- Automatic RBAC policy cleanup on deletion
- Confirmation dialog with username typing requirement
- Protected admin account (cannot be deleted)

**Accounts Page Refactoring**
- Converted from card layout to scalable table design
- Columns: User, Status, Capabilities, Actions
- Inline action buttons: Password, Tokens, Delete
- Supports large numbers of users efficiently
- Enterprise-only Create User and Delete buttons

### 🔑 Account Management (All Users)

**Password Management**
- Update password dialog for any account
- Optional current password field
- Simple modal interface
- Works for all users (free & enterprise)

**API Token Management**
- View all tokens for an account in dedicated dialog
- Generate new tokens with one click
- Delete tokens with simple confirmation (no typing required)
- Display token expiration dates
- Copy token to clipboard after generation
- Real-time token list updates
- Works for all users (free & enterprise)

### 📊 Enterprise Feature Gating

**Endpoint-Based Detection**
- Enterprise features detected by checking if `/api/v1/settings/rbac` endpoint exists
- Standard tier: RBAC endpoint returns 404 (not available)
- Enterprise tier: RBAC endpoint accessible (backend present)
- Free users see read-only account view
- Enterprise users see full user and RBAC management
- Clear visual separation of capabilities
- Upgrade prompts with feature descriptions

**Standard Tier Includes:**
- ✅ View all accounts
- ✅ Update passwords
- ✅ Create/delete API tokens
- ✅ View account capabilities
- ✅ All core ArgoCD features

**Enterprise Tier Adds:**
- ✅ Create new users
- ✅ Delete users
- ✅ RBAC permission management
- ✅ Per-application access control
- ✅ Granular permission assignment

## Technical Implementation

### Backend Architecture (Enterprise - Port 8080)

**Go Backend Service** (`backend/main.go`)
Lightweight Kubernetes proxy providing enterprise capabilities:

1. **User Management** (`/api/v1/settings/accounts`)
   - `POST` - Create user by:
     - Adding `accounts.{username}: apiKey,login` to `argocd-cm` ConfigMap
     - Storing bcrypt-hashed password in `argocd-secret` Secret
     - Setting enabled status in ConfigMap
   - `DELETE` - Delete user by:
     - Removing account entries from `argocd-cm`
     - Removing password from `argocd-secret`
     - Query param: `?name={username}`

2. **RBAC Configuration** (`/api/v1/settings/rbac`)
   - `GET` - Read `argocd-rbac-cm` ConfigMap (policy.csv, policy.default, scopes)
   - `PUT` - Update RBAC ConfigMap with new policy CSV

3. **Static File Server** (`/`)
   - Serves React frontend build from `/app/dist`
   - Replaces nginx in enterprise deployment

**Technical Details:**
- Uses Kubernetes client-go library
- Supports both in-cluster and kubeconfig authentication
- Operates in `argocd` namespace
- CORS headers for frontend access
- Validates usernames against K8s ConfigMap key constraints

### Frontend Architecture

**Service Layer** (`src/services/accounts.ts`)
```typescript
// Query Keys
accountKeys = {
  all: ['accounts'],
  lists: () => ['accounts', 'list'],
  detail: (name) => ['accounts', 'detail', name],
  rbac: () => ['accounts', 'rbac']
}

// Mutations
useCreateAccount()    // POST /settings/accounts
useDeleteAccount()    // DELETE /settings/accounts?name={name}
useUpdatePassword()   // PUT /account/password (ArgoCD native)
useCreateToken()      // POST /account/{name}/token (ArgoCD native)
useDeleteToken()      // DELETE /account/{name}/token/{id} (ArgoCD native)
useUpdateRBACConfig() // PUT /settings/rbac
```

**RBAC Parser** (`src/lib/casbin-parser.ts`)
- Parses Casbin CSV format: `p, role:name, resource, action, object, effect`
- Extracts subject, resource, action, object, effect from policies
- Builds permission capability maps (canView, canDeploy, canRollback, canDelete)
- Handles wildcards and inheritance
- Generates CSV from policy objects for updates

**API Client** (`src/lib/api-client.ts`)
- Axios interceptor for JWT token injection
- Content-Type handling for ArgoCD 2.9.4+ requirements:
  - DELETE requests include empty JSON body `{}` to satisfy Content-Type requirement
  - Prevents 415 Unsupported Media Type errors
- Automatic 401 redirect to login
- Request/response logging

**State Management**
- TanStack Query (React Query) for server state
- Query invalidation strategy:
  - Token create/delete → invalidate both `lists()` and `detail(name)`
  - User create/delete → invalidate `lists()`
  - RBAC update → invalidate `rbac()`
- Optimistic updates disabled to ensure data consistency

### Key Components

**Accounts Page** (`src/pages/accounts.tsx`)
- Table layout with 4 columns (User, Status, Capabilities, Actions)
- Dialog-based password management
- Dialog-based token management with live updates
- Conditional rendering based on `useHasFeature('rbac')`
- Delete confirmation with username typing

**RBAC Page** (`src/pages/rbac.tsx`)
- License gate with upgrade modal
- Permission summary card (users, policies, apps count)
- Permission editor component
- User list table with policy counts
- User details slide-out panel
- Clear permissions action

**Permission Editor** (`src/components/rbac/permission-editor.tsx`)
- User and project selection dropdowns
- Permission checkboxes with smart defaults
- Wildcard permission detection
- Loads existing permissions when user/project selected
- Batch update mode (replaces all policies for user+project)
- Validation to prevent saving without selections

**Confirm Dialog** (`src/components/ui/confirm-dialog.tsx`)
- Reusable confirmation dialog
- Optional typing requirement (`requireTyping` prop)
- Used for user deletion (typing required)
- Used for token deletion (typing not required)
- Loading states and disabled states

### Request Flow

**Standard Deployment (Free Users):**
```
Browser → Cased CD (nginx) → ArgoCD API
         └─ Static UI
         └─ /api/v1/* → ArgoCD
```

**Enterprise Deployment:**
```
Browser → Cased CD Enterprise (Go + React) → ArgoCD API
         └─ Serves static UI                └─ /api/v1/applications/*
         └─ /api/v1/settings/* → Kubernetes API (ConfigMaps/Secrets)
```

**Vite Proxy Configuration (Development):**
```javascript
'/api/v1/settings/rbac': {
  target: 'http://localhost:8081',  // RBAC backend (enterprise)
  changeOrigin: true,
},
'/api/v1/settings/accounts': {
  target: 'http://localhost:8081',  // RBAC backend (enterprise)
  changeOrigin: true,
},
'/api/v1': {
  target: process.env.VITE_USE_REAL_API ? 'http://localhost:8090' : 'http://localhost:8080',
  changeOrigin: true,
}
```

**Enterprise Detection:**
- Frontend checks if `/api/v1/settings/rbac` returns 200 (enterprise) or 404 (standard)
- No license endpoint needed - private registry access IS the license

## Bug Fixes

### Critical Fixes

**415 Unsupported Media Type on DELETE**
- **Issue**: ArgoCD 2.9.4+ enforces Content-Type header on all non-GET requests
- **Root Cause**: DELETE requests without body were rejected
- **Solution**: Add empty JSON body `{}` to all DELETE requests
- **Location**: `src/lib/api-client.ts` line 78

**Token Flash Bug**
- **Issue**: Generated token showed on ALL accounts instead of just the one that created it
- **Root Cause**: Missing state to track which account created the token
- **Solution**: Added `tokenAccountName` state variable, check `tokenAccountName === account.name`
- **Location**: `src/pages/accounts.tsx` lines 79-80, 117, 263

**Query Cache Invalidation**
- **Issue**: Token list didn't update immediately after create/delete
- **Root Cause**: Only invalidating `detail(name)` query, not `lists()` query
- **Solution**: Invalidate both queries in `useCreateToken` and `useDeleteToken`
- **Location**: `src/services/accounts.ts` lines 168, 182

**TypeScript Type Conflicts**
- **Issue**: Duplicate `Account` and `AccountToken` interface declarations
- **Root Cause**: Interfaces defined twice in `api.ts`
- **Solution**: Removed duplicate declarations at lines 367-378
- **Location**: `src/types/api.ts`

**Permission Editor Type Error**
- **Issue**: `hasWildcardPerms` was type `false | object` causing property access errors
- **Root Cause**: Using `&&` operator created union type with `false`
- **Solution**: Changed to ternary operator: `isEditingSpecificProject ? wildcardPermissions : null`
- **Location**: `src/components/rbac/permission-editor.tsx` line 203

### UX Improvements

- Added "Delete" text label to delete button (was icon-only)
- Changed token confirmation to simple click (removed typing requirement)
- Added toast notifications for all user/permission operations
- Improved permission editor button text ("Set Permissions" vs "Add Permission")
- Added wildcard permission indicators in permission panel
- Better loading states throughout

## Testing

### Test Coverage
```bash
✓ src/lib/casbin-parser.test.ts (35 tests) 5ms
✓ src/test/integration/sync.test.tsx (2 tests) 2ms
✓ src/services/applications.test.tsx (8 tests) 226ms
✓ src/services/license.test.tsx (18 tests) 14465ms

Test Files  4 passed (4)
Tests       63 passed (63)
```

### Manual Testing
- ✅ User creation with validation
- ✅ User deletion with policy cleanup
- ✅ Password updates
- ✅ Token generation and deletion
- ✅ RBAC permission assignment
- ✅ Wildcard permission handling
- ✅ License gating (enterprise vs free)
- ✅ DELETE request Content-Type fix
- ✅ Real-time query invalidation

### Validation Tests
- Username format validation (alphanumeric, hyphens, underscores, periods)
- Username length validation (3-63 characters)
- Admin account protection (cannot delete)
- Permission inheritance (deploy grants view)
- Wildcard permission detection

## Files Changed

```
RBAC-TODO.md                              | 119 ++---
README.md                                 |  68 ++-
backend/main.go                           |  80 +++-
src/components/rbac/permission-editor.tsx |   2 +-
src/components/ui/confirm-dialog.tsx      |  40 +-
src/lib/api-client.ts                     |  15 +-
src/pages/accounts.tsx                    | 699 +++++++++++++++++++++---------
src/pages/rbac.tsx                        | 188 +-------
src/services/accounts.ts                  |  23 +
src/types/api.ts                          |  14 -
10 files changed, 771 insertions(+), 477 deletions(-)
```

## Documentation

### README Updates
- Added enterprise feature section with clear feature comparison
- Documented standard vs enterprise deployment architectures
- Added contact information for enterprise upgrades
- Created feature comparison table
- Explained Go backend role and purpose

### Architecture Diagrams
- Standard deployment (nginx → ArgoCD)
- Enterprise deployment (nginx + Go backend → ArgoCD + K8s API)
- Request routing flow
- Component breakdown

## Distribution Model

### Multi-Stage Dockerfile

This PR introduces a unified Dockerfile with 4 stages:

1. **frontend-builder** - Builds React app (shared by both tiers)
2. **standard** - nginx + React static files
3. **backend-builder** - Builds Go RBAC backend
4. **enterprise** - Go backend + React static files

### Build Scripts

Two build scripts provided:

**Standard (Free Tier):**
```bash
./scripts/build-standard.sh [version]
# Output: ghcr.io/cased/cased-cd:latest
```

**Enterprise:**
```bash
./scripts/build-enterprise.sh [version]
# Output: ghcr.io/cased/cased-cd-enterprise:latest
```

### Image Distribution

| Image | Registry | Access | License |
|-------|----------|--------|---------|
| `cased-cd` | Public (ghcr.io) | Anyone | Free/Open Source |
| `cased-cd-enterprise` | Private (ghcr.io) | Credentials required | Commercial |

**Enterprise Licensing:**
- No license key needed
- Private registry access IS the license validation
- Frontend detects enterprise via RBAC endpoint presence
- Simple deployment model

## Breaking Changes

**None** - This is fully backward compatible. All existing functionality remains unchanged for standard users. Enterprise features are additive only.

## Future Work

- [ ] RBAC policy templates for common use cases
- [ ] Bulk user import/export
- [ ] Audit logging for permission changes
- [ ] SSO integration for user provisioning
- [ ] Group-based permission management
- [ ] Helm chart for enterprise deployment

## Deployment Notes

### Standard Deployment
```bash
helm install cased-cd cased/cased-cd --namespace argocd
```

### Enterprise Deployment
Contact support@cased.com for access to:
- Enterprise Helm chart with RBAC backend
- License key configuration
- Deployment documentation
- Kubernetes RBAC requirements

### Requirements
- ArgoCD v2.0+
- Kubernetes 1.19+
- For Enterprise: RBAC permissions to read/write ConfigMaps and Secrets in `argocd` namespace

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
