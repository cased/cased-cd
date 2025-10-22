# RBAC Implementation TODO

## Goals
Build granular RBAC management for ArgoCD that improves on the limited built-in UI:
- Per-application permissions (not just project-wide)
- Per-action permissions (sync, rollback, delete, etc.)
- Visual permission management
- Easy grant/revoke workflow

## Research Summary ✅

**Key Finding:** ArgoCD has NO dedicated RBAC management API. See `RBAC-RESEARCH.md` for full details.

**What we have to work with:**
1. **AccountService API** (`/api/v1/account`) - List accounts, check permissions
2. **Kubernetes ConfigMap API** - Read/write `argocd-cm` and `argocd-rbac-cm`
3. **Casbin policy format** - Manual parsing/generation required

**Implementation approach:**
- Phase 2: Build read-only permission viewer (parse ConfigMaps, display in UI)
- Phase 3: Build permission editor (generate Casbin policies, update ConfigMaps)
- Phase 4: Advanced features (templates, bulk ops, audit)

## Phase 1: Research & Design
- [x] Research ArgoCD RBAC API
  - [x] What endpoints exist for RBAC management? → See RBAC-RESEARCH.md
  - [x] Can we read/write argocd-rbac-cm ConfigMap via API? → YES, via K8s API
  - [x] What's the Casbin policy format? → `p, subject, resource, action, object, effect`
  - [x] Can we validate policies before applying? → No API, must do client-side
- [x] Document current ArgoCD RBAC capabilities → See RBAC-RESEARCH.md
  - [x] Built-in roles (admin, readonly)
  - [x] Project roles
  - [x] Policy syntax examples
- [ ] Design permissions data model
  - [ ] User/role structure
  - [ ] Permission granularity (global vs per-app)
  - [ ] Action types (get, sync, rollback, delete, override, etc.)

### Key Research Findings
**ArgoCD has NO dedicated RBAC management API!** We must:
1. Use AccountService API (`/api/v1/account`) to list accounts
2. Use Kubernetes API to read/write ConfigMaps (`argocd-cm`, `argocd-rbac-cm`)
3. Parse/generate Casbin policy format ourselves
4. Use `/api/v1/account/can-i/{resource}/{action}/{subresource}` to check permissions

## Phase 2: Read-Only View (MVP)
- [ ] Backend: Kubernetes ConfigMap Integration
  - [ ] Add endpoint to fetch `argocd-cm` ConfigMap (accounts list)
  - [ ] Add endpoint to fetch `argocd-rbac-cm` ConfigMap (policies)
  - [ ] Need to determine: proxy through ArgoCD API server or direct K8s API?
- [ ] Backend: AccountService Integration
  - [ ] Add `GET /api/v1/account` to list all accounts
  - [ ] Add `GET /api/v1/account/can-i/{resource}/{action}/{subresource}` for permission checks
- [ ] Frontend: Casbin Parser
  - [ ] Parse `policy.csv` format into structured data
  - [ ] Handle both `p` (policy) and `g` (group) lines
  - [ ] Extract subject, resource, action, object, effect
- [ ] Frontend: Data Model
  - [ ] Add RBAC types to api.ts (Account, Policy, Permission)
  - [ ] Create hooks: `useAccounts()`, `usePolicies()`, `useCanI()`
- [ ] Frontend: UI Components
  - [ ] Permission matrix view (users × apps × actions)
  - [ ] User detail view (what can this user do?)
  - [ ] App detail view (who has access to this app?)
  - [ ] Permission badge/indicator component

## Phase 3: Permission Assignment
- [ ] Frontend: Casbin Policy Generator
  - [ ] Generate `p, subject, resource, action, object, effect` strings
  - [ ] Client-side validation (syntax, duplicate detection)
  - [ ] Preview generated policy before applying
- [ ] Frontend: Permission Editor UI
  - [ ] Select user/role dropdown
  - [ ] Select app (specific or wildcard for global)
  - [ ] Toggle actions (get, sync, rollback, delete, override)
  - [ ] Allow/Deny effect toggle
  - [ ] Add/Remove policy rows
- [ ] Backend: ConfigMap Update
  - [ ] Merge new policies into existing `policy.csv`
  - [ ] Use K8s PATCH API to update `argocd-rbac-cm`
  - [ ] Handle concurrent updates (optimistic locking)
  - [ ] Error handling and rollback

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
