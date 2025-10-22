# ArgoCD RBAC API Research Findings

## Summary
ArgoCD **does not have a dedicated RBAC management API**. RBAC is configured entirely through Kubernetes ConfigMaps, which makes programmatic management challenging.

## API Endpoints Available

### AccountService
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/account` | List all accounts |
| GET | `/api/v1/account/{name}` | Get account details |
| PUT | `/api/v1/account/password` | Update account password |
| POST | `/api/v1/account/{name}/token` | Create authentication token |
| DELETE | `/api/v1/account/{name}/token/{id}` | Delete token |
| **GET** | **`/api/v1/account/can-i/{resource}/{action}/{subresource}`** | **Check if current account has permission** |

### Project Roles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects/{project}/roles/{role}/token` | List tokens for project role |
| POST | `/api/v1/projects/{project}/roles/{role}/token` | Create project role token |
| DELETE | `/api/v1/projects/{project}/roles/{role}/token/{iat}` | Delete project role token |

## RBAC Configuration (ConfigMap-based)

### ConfigMaps Used
1. **`argocd-cm`** (in `argocd` namespace)
   - Defines user accounts
   - Format: `accounts.<username>: apiKey,login` or `accounts.<username>: login`
   - Max username length: 32 characters

2. **`argocd-rbac-cm`** (in `argocd` namespace)
   - Defines RBAC policies using Casbin format
   - Main policy in `policy.csv` key
   - Additional policies in `policy.<anything>.csv` keys (concatenated)
   - Optional `policy.default` field for default policy

### Casbin Policy Format

**Policy Assignment:**
```
p, <role/user/group>, <resource>, <action>, <object>, <effect>
```

**Group Assignment:**
```
g, <user/group>, <role>
```

### Available Resources
- `applications` - Application resources
- `clusters` - Cluster credentials
- `repositories` - Repository credentials
- `projects` - ArgoCD projects
- `accounts` - User accounts
- `certificates` - Repository certificates
- `gpgkeys` - GPG keys
- `logs` - Application logs
- `exec` - Application exec
- `applicationsets` - ApplicationSets
- `extensions` - Extensions

### Available Actions
- `get` - Read access
- `create` - Create new resources
- `update` - Modify existing resources
- `delete` - Delete resources
- `sync` - Sync applications (applications only)
- `override` - Override application parameters (applications only)
- `action/<group>/<Kind>/<action-name>` - Custom resource actions

### Permission Examples

**Per-app read-only:**
```
p, dev-user, applications, get, my-project/my-app, allow
```

**Project-wide sync:**
```
p, dev-team, applications, sync, my-project/*, allow
```

**Rollback-only (via action):**
```
p, ops-user, applications, action/*, my-project/prod-app, allow
```

**Global read:**
```
p, viewer, applications, get, */*, allow
```

**Deny specific app:**
```
p, user, applications, delete, my-project/critical-app, deny
```

## How to Update RBAC Programmatically

Since ArgoCD provides NO native RBAC API, you must use the **Kubernetes API** directly:

### 1. Read ConfigMap
```bash
kubectl get configmap argocd-rbac-cm -n argocd -o json
```

### 2. Update ConfigMap
```bash
kubectl patch configmap argocd-rbac-cm -n argocd --type merge -p '{"data":{"policy.csv":"..."}}'
```

### 3. ArgoCD Auto-Reloads
ArgoCD automatically detects ConfigMap changes and reloads policies (no restart needed).

## Open GitHub Issues

ArgoCD community has requested an RBAC API:
- **#16638** - REST API for RBAC management
- **#18058** - CRD-based API for RBAC
- **#16050** - API to update policy.csv

**Status:** No timeline for implementation as of 2024

## Implications for Cased CD

To build RBAC management in Cased CD, we will need to:

1. ✅ **Use AccountService API** to:
   - List accounts
   - Check permissions (`/can-i/` endpoint)

2. ✅ **Use Kubernetes API** to:
   - Read `argocd-cm` ConfigMap (get user accounts)
   - Read `argocd-rbac-cm` ConfigMap (get policies)
   - Update `argocd-rbac-cm` ConfigMap (write policies)

3. ✅ **Parse/Generate Casbin Format**:
   - Parse existing `policy.csv` into structured data
   - Generate Casbin policy strings from UI actions
   - Validate policies before applying

4. ✅ **Build UI Layer**:
   - Abstract ConfigMap complexity
   - Visual permission matrix
   - Per-app, per-action toggles
   - Live permission checking using `/can-i/`

## Technical Challenges

1. **No Policy Validation API** - We'll need to validate Casbin syntax client-side
2. **ConfigMap Conflicts** - Multiple users editing could cause conflicts
3. **Permission Discovery** - Hard to know "what can user X do?" without parsing all policies
4. **Account Creation** - Requires editing both `argocd-cm` AND `argocd-rbac-cm`
5. **Project Roles** - Separate API but similar concept, need to integrate

## Recommended Approach

### Phase 1: Read-Only View
- Fetch both ConfigMaps via K8s API
- Parse Casbin policies
- Display in permission matrix
- Use `/can-i/` to show current user's permissions

### Phase 2: Permission Editor
- Build Casbin policy generator
- Update `argocd-rbac-cm` via K8s API
- Client-side validation
- Optimistic UI updates

### Phase 3: Account Management
- Create/edit users in `argocd-cm`
- Auto-generate policies in `argocd-rbac-cm`
- Token management via AccountService

## References
- ArgoCD RBAC Docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Casbin Docs: https://casbin.org/
- ArgoCD API Docs: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Swagger JSON: https://github.com/argoproj/argo-cd/blob/master/assets/swagger.json
