# RBAC Implementation TODO

## ✅ Status: MVP COMPLETE (Phases 1-3)

The core RBAC management feature is now complete! Users can:
- ✅ Create and delete local ArgoCD accounts
- ✅ View all users and their permission counts
- ✅ Set project-level permissions (view, deploy, rollback, delete)
- ✅ Grant permissions for specific projects or all projects (wildcards)
- ✅ View detailed permission breakdowns per user
- ✅ Clear all permissions for a user

### Implementation Files
**Backend (Go):**
- `backend/main.go` - K8s API integration for ConfigMaps/Secrets, RBAC/account CRUD endpoints

**Frontend:**
- `src/pages/rbac.tsx` - Main RBAC management page with user list and permission editor
- `src/components/rbac/permission-editor.tsx` - Form to set user permissions
- `src/lib/casbin-parser.ts` - Parser and generator for Casbin policy format
- `src/services/accounts.ts` - React Query hooks for account and RBAC operations
- `src/types/api.ts` - TypeScript types for RBAC data structures

## Goals ✅ COMPLETED
Build granular RBAC management for ArgoCD that improves on the limited built-in UI:
- ✅ Per-project permissions
- ✅ Per-action permissions (view, deploy/sync, rollback, delete)
- ✅ Visual permission management
- ✅ Easy grant/revoke workflow

## Research Summary ✅

**Key Finding:** ArgoCD has NO dedicated RBAC management API. See `RBAC-RESEARCH.md` for full details.

**What we have to work with:**
1. **AccountService API** (`/api/v1/account`) - List accounts, check permissions
2. **Kubernetes ConfigMap API** - Read/write `argocd-cm` and `argocd-rbac-cm`
3. **Casbin policy format** - Manual parsing/generation required

**Implementation approach:**
- ✅ Phase 2: Build read-only permission viewer (parse ConfigMaps, display in UI)
- ✅ Phase 3: Build permission editor (generate Casbin policies, update ConfigMaps)
- Phase 4: Advanced features (templates, bulk ops, audit)

## Phase 1: Research & Design ✅ COMPLETED
- [x] Research ArgoCD RBAC API
  - [x] What endpoints exist for RBAC management? → See RBAC-RESEARCH.md
  - [x] Can we read/write argocd-rbac-cm ConfigMap via API? → YES, via K8s API
  - [x] What's the Casbin policy format? → `p, subject, resource, action, object, effect`
  - [x] Can we validate policies before applying? → No API, must do client-side
- [x] Document current ArgoCD RBAC capabilities → See RBAC-RESEARCH.md
  - [x] Built-in roles (admin, readonly)
  - [x] Project roles
  - [x] Policy syntax examples
- [x] Design permissions data model
  - [x] User/role structure
  - [x] Permission granularity (project-level)
  - [x] Action types (get, sync, rollback/action/*, delete)

### Key Research Findings
**ArgoCD has NO dedicated RBAC management API!** We must:
1. Use AccountService API (`/api/v1/account`) to list accounts
2. Use Kubernetes API to read/write ConfigMaps (`argocd-cm`, `argocd-rbac-cm`)
3. Parse/generate Casbin policy format ourselves
4. Use `/api/v1/account/can-i/{resource}/{action}/{subresource}` to check permissions

## Phase 2: Read-Only View (MVP) ✅ COMPLETED
- [x] Backend: Kubernetes ConfigMap Integration
  - [x] Add endpoint to fetch `argocd-cm` ConfigMap (accounts list)
  - [x] Add endpoint to fetch `argocd-rbac-cm` ConfigMap (policies)
  - [x] Direct K8s API via client-go in Go backend (`backend/main.go`)
- [x] Backend: AccountService Integration
  - [x] Proxy to ArgoCD `/api/v1/account` to list all accounts
  - [x] Implemented via mock API and services
- [x] Frontend: Casbin Parser
  - [x] Parse `policy.csv` format into structured data (`lib/casbin-parser.ts`)
  - [x] Handle both `p` (policy) and `g` (group) lines
  - [x] Extract subject, resource, action, object, effect
- [x] Frontend: Data Model
  - [x] Add RBAC types to api.ts (Account, RBACConfig, CasbinPolicy)
  - [x] Create hooks: `useAccounts()`, `useRBACConfig()`, `useCanI()`
- [x] Frontend: UI Components
  - [x] User list with permission counts (`src/pages/rbac.tsx`)
  - [x] User detail panel showing all permissions
  - [x] Permission display by project with capabilities badges

## Phase 3: Permission Assignment ✅ COMPLETED
- [x] Frontend: Casbin Policy Generator
  - [x] Generate `p, subject, resource, action, object, effect` strings (`lib/casbin-parser.ts`)
  - [x] Replace policies for user/project combinations
  - [x] Automatic view permission when other permissions granted
- [x] Frontend: Permission Editor UI
  - [x] Select user dropdown (filters out admin)
  - [x] Select project (specific or "*" for all projects)
  - [x] Toggle actions (view, deploy, rollback, delete) with checkboxes
  - [x] Wildcard permission detection and UI indicators
  - [x] Create user dialog with username validation
  - [x] Delete user with confirmation dialog
- [x] Backend: ConfigMap Update
  - [x] Update `argocd-rbac-cm` via K8s API (`backend/main.go`)
  - [x] Create account endpoint (updates `argocd-cm` and `argocd-secret`)
  - [x] Delete account endpoint (removes from ConfigMaps and Secret)
  - [x] Error handling with HTTP status codes

## Phase 4: Advanced Features
- [ ] Role templates (e.g., "Rollback Only", "Read Only", "Developer")
- [ ] Bulk operations (grant access to multiple apps)
- [ ] Permission inheritance visualization
- [ ] Policy conflict detection
- [ ] Audit log (who granted what to whom)

## Questions to Answer
- How do we handle SSO/OIDC groups vs local users?
- Should we support project-level defaults?
- Do we want "permission requests" workflow?
- How to handle admin override scenarios?

## Nice-to-Haves
- Policy testing ("can user X do Y on app Z?")
- Export/import permission sets
- Compliance reporting (who has admin access?)
- Time-limited permissions
