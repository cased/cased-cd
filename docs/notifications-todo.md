# Notifications System - Implementation Plan & TODOs

## Overview

Cased CD provides a comprehensive notification management system that improves upon ArgoCD's native notification handling with better UX, inheritance visualization, and centralized management.

## Current Implementation Status

### ✅ Phase 1: Per-Application Notifications (Completed)

- [x] Type definitions for notifications API
- [x] Service layer with React Query hooks
- [x] Notification subscriptions component
- [x] Integration in application detail page
- [x] Mock server endpoints for testing
- [x] Annotation parsing utilities
- [x] Add/remove subscription functionality
- [x] Basic validation and error handling

**Location**:
- Component: `src/components/notification-subscriptions.tsx`
- Service: `src/services/notifications.ts`
- Types: `src/types/api.ts`
- Mock endpoints: `mock-server.js`

### 🚧 Phase 2: Global Notifications & Inheritance (In Progress)

#### Architecture

```
Global Defaults (ConfigMap: argocd-notifications-cm)
    ↓ inherits
Project-Level (AppProject annotations)
    ↓ inherits
Application-Level (Application annotations)
```

#### Implementation Tasks

- [ ] **Global Subscriptions Endpoint**
  - [ ] Add mock endpoint for global subscriptions
  - [ ] Document that production requires K8s API access or backend service
  - [ ] Type definitions for global subscriptions response

- [ ] **Global Notifications Page** (`/notifications`)
  - [ ] Create page component `src/pages/notifications.tsx`
  - [ ] Show summary statistics (apps with notifications, most used triggers)
  - [ ] Table of all applications with their subscriptions
  - [ ] Inheritance visualization:
    - Global subscriptions (from ConfigMap) - marked as "Global"
    - Project subscriptions (from AppProject) - marked as "Project"
    - Application subscriptions (custom) - marked as "Custom"
  - [ ] Filtering by trigger, service, application, or source
  - [ ] Quick actions to view/edit per-app notifications

- [ ] **Sidebar Navigation**
  - [ ] Add "Notifications" link to sidebar
  - [ ] Icon: `IconNotification`
  - [ ] Position: After Applications, before Settings

- [ ] **Applications List Integration**
  - [ ] Add notification indicator column
  - [ ] Tooltip showing subscription count
  - [ ] Click to navigate to app's notification tab

## Notification Inheritance Model

### How It Works

1. **Global Defaults** (ConfigMap)
   ```yaml
   # In argocd-notifications-cm
   subscriptions: |
     - recipients: [slack:devops-alerts]
       triggers: [on-sync-failed, on-health-degraded]
   ```
   → Applied to ALL applications by default

2. **Project-Level** (AppProject annotations)
   ```yaml
   # On AppProject resource
   annotations:
     notifications.argoproj.io/subscribe.on-deployed.slack: prod-team
   ```
   → Applied to all apps in this project (ADDS to global)

3. **Application-Level** (Application annotations)
   ```yaml
   # On Application resource
   annotations:
     notifications.argoproj.io/subscribe.on-sync-succeeded.slack: app-team
   ```
   → Applied to this specific app (ADDS to project + global)

### Inheritance Rules

- **Additive**: Each level ADDS subscriptions, doesn't override
- **Deduplication**: Same trigger+service+recipient only notifies once
- **Visibility**: UI clearly shows which level each subscription comes from
- **Management**:
  - Global: Must edit ConfigMap via kubectl
  - Project: Edit via kubectl or future project settings page
  - App: Can edit in Cased CD UI

## API Requirements

### Current (Implemented)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/notifications/services` | GET | List available notification services |
| `/api/v1/notifications/triggers` | GET | List available triggers |
| `/api/v1/notifications/templates` | GET | List available templates |
| `/api/v1/applications` | GET | List applications (includes annotations) |
| `/api/v1/applications/{name}` | GET | Get application detail |
| `/api/v1/applications/{name}` | PUT | Update application (for subscriptions) |

### Future Requirements

| Endpoint | Method | Purpose | Notes |
|----------|--------|---------|-------|
| `/api/v1/notifications/subscriptions/global` | GET | Get global default subscriptions | Requires K8s API to read ConfigMap |
| `/api/v1/projects` | GET | List projects with annotations | For project-level subscriptions |
| `/api/v1/projects/{name}` | GET | Get project detail | For project-level subscriptions |

## Phase 3: Advanced Features (Future)

### 3.1 Notification History & Logs
- [ ] View notification delivery history
- [ ] Filter by application, trigger, service, status
- [ ] Retry failed notifications
- [ ] Delivery status indicators

**API Requirements**:
- ArgoCD doesn't expose this natively
- Would require custom backend service or direct access to notification controller logs

### 3.2 Test Notifications
- [ ] "Test" button to send test notification
- [ ] Preview notification before sending
- [ ] Verify service credentials are working

**API Requirements**:
- Custom endpoint or direct access to notification controller

### 3.3 Template Management
- [ ] View full template content (not just names)
- [ ] Preview rendered templates with sample data
- [ ] Document template variables

**API Requirements**:
- Read ConfigMap directly via K8s API

### 3.4 Service Configuration
- [ ] View configured services (not just names)
- [ ] Validate service credentials
- [ ] Add/edit services (requires K8s API write)

**API Requirements**:
- Read/write ConfigMap via K8s API
- Manage secrets securely

### 3.5 Bulk Operations
- [ ] Apply notification subscriptions to multiple apps at once
- [ ] Copy subscriptions from one app to another
- [ ] Export/import subscription templates

### 3.6 Analytics
- [ ] Most common notification patterns
- [ ] Apps without notifications (compliance check)
- [ ] Notification volume by trigger/service
- [ ] Charts and visualizations

## Technical Challenges & Solutions

### Challenge 1: Reading ConfigMap Data

**Problem**: ArgoCD REST API only returns names of services/triggers/templates, not full configuration.

**Solution Options**:
1. **Direct K8s API** - Requires additional permissions, adds complexity
2. **Backend Service** - Create microservice that reads ConfigMaps and exposes via REST
3. **Mock for UI** - Show what's possible, document K8s API requirement for production

**Current Approach**: Option 3 (Mock for development, document requirements)

### Challenge 2: Notification Delivery Logs

**Problem**: ArgoCD doesn't expose notification delivery history via API.

**Solution Options**:
1. **Custom Backend** - Read notification controller logs, parse, store in DB
2. **External Observability** - Use Grafana/Loki to query logs
3. **Defer to Phase 3** - Focus on configuration management first

**Current Approach**: Option 3 (Phase 3 feature)

### Challenge 3: Application Updates for Subscriptions

**Problem**: Current `updateApplicationSpec` only updates spec, not metadata.annotations.

**Solution**:
- [ ] Add `updateApplication` mutation that updates full application resource
- [ ] Use PATCH instead of PUT to avoid conflicts
- [ ] Handle optimistic locking with resourceVersion

### Challenge 4: Project-Level Subscriptions

**Problem**: Need to fetch and update AppProject resources.

**Solution**:
- [ ] Add projects service layer (`src/services/projects.ts`)
- [ ] Add project detail endpoints to mock server
- [ ] Implement project update mutations

## Documentation TODOs

- [ ] User guide for managing notifications
- [ ] Developer guide for notification system architecture
- [ ] API documentation for notification endpoints
- [ ] Deployment guide (K8s permissions required)
- [ ] Migration guide from ArgoCD native UI

## Testing TODOs

- [ ] Unit tests for notification parsing utilities
- [ ] Component tests for NotificationSubscriptions
- [ ] Integration tests for notification API calls
- [ ] E2E tests for subscription management workflow
- [ ] Test inheritance resolution logic
- [ ] Test deduplication logic

## Known Limitations

1. **Read-Only Configuration**: Cannot edit global subscriptions, services, triggers, or templates via UI (requires kubectl)
2. **No Delivery Logs**: Cannot view notification delivery history
3. **No Test Notifications**: Cannot send test notifications from UI
4. **Project Subscriptions**: Not yet implemented
5. **Bulk Operations**: Not yet implemented

## Future Enhancements

1. **Smart Defaults**: Suggest subscriptions based on app type, environment, team
2. **Notification Rules Builder**: Visual builder for complex trigger conditions
3. **Multi-Service Routing**: Route different triggers to different services automatically
4. **Notification Templates**: Pre-built subscription templates for common patterns
5. **Compliance Checks**: Ensure critical apps have required notifications
6. **Integration with RBAC**: Permission-based notification management

## References

- [ArgoCD Notifications Documentation](https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/)
- [Notification Triggers](https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/)
- [Notification Templates](https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/)
- [Notification Services](https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/)

## Contributing

When working on notification features:

1. **Test with mock server first** - Ensure UI works before testing with real ArgoCD
2. **Document API requirements** - Note any K8s API calls needed for production
3. **Follow inheritance model** - Respect the global → project → app hierarchy
4. **Validate subscriptions** - Prevent duplicate or invalid subscriptions
5. **Handle errors gracefully** - Network issues, permission errors, etc.

## Questions & Decisions Needed

- [ ] Should we build a backend service for ConfigMap access, or document K8s API requirement?
- [ ] Should project-level subscriptions be phase 2 or phase 3?
- [ ] What's the priority for notification delivery logs?
- [ ] Should we support custom triggers/templates via UI, or keep it kubectl-only?
