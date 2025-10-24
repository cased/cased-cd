# Notifications Feature Implementation Plan

## Overview
Build first-class notification management UX that's better than ArgoCD's raw YAML editing.

## Design Principles
1. **Ease of use first** - Visual forms for common cases
2. **Power user friendly** - Advanced mode for raw YAML editing
3. **Type-safe** - Validate configurations before saving
4. **Secure** - Proper secret management for tokens/webhooks
5. **Testable** - Send test notifications before deploying

## Architecture

### Data Flow
```
User Form → Structured Data → YAML Generation → argocd-notifications-cm ConfigMap
                                                           ↓
                                           ArgoCD Notifications Controller
```

### Secret Management
**Problem**: Tokens/webhooks contain sensitive data
**Solutions**:
1. Store secrets in `argocd-notifications-secret` (separate from config)
2. Reference secrets in config: `$secret-name`
3. Show masked tokens in UI (••••••••)
4. Provide "Update Token" flow without showing existing value
5. Backend validates secret references exist

## Phase 1: Slack Integration (Proof of Concept)

### 1.1 Slack Service Form
**UI Components:**
- Service type selector (Slack icon + name)
- Form fields:
  - Service name (e.g., "team-slack")
  - Webhook URL (secret, masked)
  - Default channel (optional, e.g., "#deployments")
  - Username (optional, e.g., "ArgoCD")
  - Icon emoji (optional, e.g., ":rocket:")
- Test button (sends test message)
- Save/Cancel buttons

**YAML Generated:**
```yaml
service.slack:
  token: $slack-token  # References argocd-notifications-secret
  username: ArgoCD
  icon: :rocket:
```

**Secret Stored:**
```yaml
# In argocd-notifications-secret
slack-token: <webhook-url>
```

### 1.2 Backend Changes
**Go Backend (`backend/main.go`):**
- Add PUT `/api/v1/notifications/services` endpoint
- Parse service form data
- Generate YAML for ConfigMap
- Store secrets in argocd-notifications-secret
- Validate Slack webhook URL format
- Implement test notification endpoint

**Endpoints:**
```
POST   /api/v1/notifications/services        # Create service
PUT    /api/v1/notifications/services/:name  # Update service
DELETE /api/v1/notifications/services/:name  # Delete service
POST   /api/v1/notifications/services/:name/test  # Test service
```

### 1.3 Frontend Changes
**New Components:**
- `CreateServicePanel` - Slide-out panel with service type picker
- `SlackServiceForm` - Slack-specific form
- `ServiceCard` - Enhanced card with Edit/Delete/Test actions

**State Management:**
- Use React Query mutations for create/update/delete
- Optimistic updates for better UX
- Invalidate queries on success

### 1.4 Testing Flow
1. User clicks "Test" button
2. Frontend sends POST to `/api/v1/notifications/services/:name/test`
3. Backend sends test message: "Test notification from Cased CD"
4. Returns success/error
5. UI shows toast notification

## Phase 2: Additional Service Types

### 2.1 GitHub Status
**Fields:**
- GitHub token (secret)
- Owner/Repo (e.g., "cased/cased-cd")
- Status context (e.g., "continuous-delivery/argocd")

**YAML:**
```yaml
service.github:
  appID: <app-id>
  installationID: <installation-id>
  privateKey: $github-private-key
```

### 2.2 Generic Webhook
**Fields:**
- Webhook URL (can be secret)
- HTTP Method (GET/POST/PUT)
- Headers (key-value pairs)
- Auth type (None/Bearer/Basic)
- Request body template

**YAML:**
```yaml
service.webhook.mywebhook:
  url: $webhook-url
  headers:
  - name: Content-Type
    value: application/json
  - name: Authorization
    value: Bearer $webhook-token
```

### 2.3 Email (SMTP)
**Fields:**
- SMTP Host/Port
- Username/Password (secret)
- From address
- TLS enabled

## Phase 3: Templates with Visual Editor

### 3.1 Template Editor
**Features:**
- Monaco editor with syntax highlighting
- Variable autocomplete (`.app.`, `.context.`, etc.)
- Live preview pane
- Starter templates dropdown

**Starter Templates:**
- ✅ Deployment Success
- ❌ Deployment Failed
- ⚠️ Health Degraded
- 🔄 Sync Status Changed

**Variables Reference:**
```
{{.app.metadata.name}}
{{.app.spec.destination.namespace}}
{{.context.argocdUrl}}
{{.app.status.sync.status}}
{{.app.status.health.status}}
```

### 3.2 Template Validation
- Parse template on blur
- Highlight syntax errors
- Validate variable references
- Preview with sample data

## Phase 4: Triggers with Condition Builder

### 4.1 Common Triggers (Preset)
- 🚀 On Deployed Successfully
- ❌ On Sync Failed
- ⚠️ On Health Degraded
- 🔄 On Sync Status Changed
- 📊 On Out of Sync

### 4.2 Trigger Builder UI
**Visual Mode:**
```
When: [Dropdown: Deployed Successfully ▼]
Send: [Dropdown: deployment-success      ▼] (template)
Via:  [☑ Slack  ☐ GitHub  ☐ Email        ] (services)
```

**Advanced Mode:**
- Raw YAML editor for complex conditions
- Toggle between visual and advanced

### 4.3 Condition Examples
```yaml
# Simple
when: app.status.operationState.phase in ['Succeeded']

# Complex
when: app.status.health.status == 'Degraded' and
      app.spec.project == 'production'
```

## Implementation Order

### Week 1: Foundation
- [ ] Update backend types for service management
- [ ] Add POST/PUT/DELETE endpoints for services
- [ ] Implement secret management (argocd-notifications-secret)
- [ ] Create `CreateServicePanel` component
- [ ] Add service type selector UI

### Week 2: Slack Integration
- [ ] Build `SlackServiceForm` component
- [ ] Implement Slack YAML generation
- [ ] Add test notification endpoint
- [ ] Build service card actions (Edit/Delete/Test)
- [ ] Add optimistic updates

### Week 3: Additional Services
- [ ] GitHub service form
- [ ] Generic webhook form
- [ ] Email/SMTP form
- [ ] Service validation logic

### Week 4: Templates
- [ ] Template editor component (Monaco)
- [ ] Variable autocomplete
- [ ] Preview pane
- [ ] Starter templates

### Week 5: Triggers
- [ ] Trigger builder UI
- [ ] Preset condition dropdown
- [ ] Service/Template selection
- [ ] Advanced mode toggle

## Technical Considerations

### Secret Storage
**Option 1: Separate Secret (Recommended)**
- Store in `argocd-notifications-secret`
- Reference in config: `$secret-name`
- ArgoCD controller reads both ConfigMap + Secret
- Pro: Follows ArgoCD pattern, more secure
- Con: Two resources to manage

**Option 2: Inline in ConfigMap**
- Store directly in `argocd-notifications-cm`
- Simpler, one resource
- Pro: Easier implementation
- Con: Less secure, secrets visible in ConfigMap

**Decision: Use Option 1** - Follow ArgoCD best practices

### YAML Parsing
**Libraries:**
- `js-yaml` for parsing/generating YAML
- Validate before saving
- Preserve comments when possible
- Handle merge conflicts gracefully

### State Management
**React Query pattern:**
```typescript
const createService = useMutation({
  mutationFn: (service) => api.post('/notifications/services', service),
  onSuccess: () => {
    queryClient.invalidateQueries(['notifications'])
    toast.success('Service created')
  }
})
```

## UI/UX Mockup

### Services Tab
```
┌─────────────────────────────────────────────────┐
│ Services (3)                    [+ Add Service] │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ 📱 team-slack                    [⚙️ ✏️ 🗑️] │ │
│ │ Slack webhook                               │ │
│ │ Channel: #deployments                       │ │
│ │ ✅ Last tested: 2 hours ago                 │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📧 alerts-email                  [⚙️ ✏️ 🗑️] │ │
│ │ SMTP (smtp.gmail.com)                       │ │
│ │ To: ops@company.com                         │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Create Service Panel
```
┌─────────────────────────────────────┐
│ Create Notification Service    [×] │
├─────────────────────────────────────┤
│ Select Service Type:               │
│                                     │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│ │ 📱  │ │ 🐙  │ │ 🔗  │ │ 📧  │   │
│ │Slack│ │Git  │ │Hook │ │Mail │   │
│ └─────┘ └─────┘ └─────┘ └─────┘   │
│                                     │
│ Service Name:                       │
│ [team-slack________________]       │
│                                     │
│ Webhook URL:                        │
│ [https://hooks.slack.com/...]      │
│                                     │
│ Default Channel: (optional)         │
│ [#deployments______________]       │
│                                     │
│ [Test]            [Cancel] [Create]│
└─────────────────────────────────────┘
```

## Success Metrics
- ✅ User can create Slack notification in < 1 minute
- ✅ Test notification works on first try
- ✅ No YAML knowledge required for common cases
- ✅ Power users can still edit raw YAML
- ✅ Secrets properly masked in UI
- ✅ Changes persist to Kubernetes correctly
