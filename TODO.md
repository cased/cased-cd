# TODO

## High Priority

### Code Organization & Refactoring
- [ ] Extract shared form components
  - [ ] FormField wrapper component
  - [ ] FormSection component
  - [ ] YamlEditor component (reused in all create panels)
- [ ] Break down application-detail.tsx (602 lines)
  - [ ] Extract FilterBar to separate file
  - [ ] Extract TreeView, ListView, PodsView into components/application-detail/
  - [ ] Move K8sResource type to shared types
- [ ] Create shared hooks
  - [ ] useFormValidation for create panels
  - [ ] useResourceFilters for filtering logic
  - [ ] useConfirmDialog wrapper around ConfirmDialog

### Missing Core Features
- [ ] Projects page - UI for existing service layer
- [ ] Application logs/events viewer
- [ ] Application sync options (prune, dry-run params)
- [ ] Resource action buttons (restart pod, delete resource, etc.)
- [ ] Application history/rollback
- [ ] Diff view (compare desired vs live state)
- [ ] SSO/RBAC settings UI

## Medium Priority

### UX Improvements
- [ ] Search/filter across all pages (applications, repos, clusters)
- [ ] Bulk operations (delete multiple apps, sync multiple apps)
- [ ] Real-time updates (WebSocket support for live status)
- [x] Notifications/toast system for success/error messages (replace alert()) ✅
- [ ] Loading skeletons (Skeleton component exists but not used everywhere)
- [ ] Empty states for all lists
- [ ] Keyboard shortcuts (ESC to close dialogs, etc.)

### Testing Coverage
- [ ] Add component tests
  - [ ] ConfirmDialog
  - [ ] Create panels (form + YAML modes)
  - [ ] Filter/search logic
- [ ] Add service layer tests
  - [ ] All mutation hooks
  - [ ] Error handling
- [ ] Add E2E tests
  - [ ] Login flow
  - [ ] Create application flow
  - [ ] Sync/delete operations

## Low Priority

### Type Safety Improvements
- [ ] Create shared K8sResource type (currently duplicated in 2 files)
- [ ] Stricter form types (currently using loose object states)
- [ ] Zod schema validation for forms
- [ ] Generate types from OpenAPI spec if available

### Performance Optimizations
- [ ] Virtualization for long lists (applications, resources)
- [ ] Lazy load application detail page components
- [ ] Debounce search/filter inputs
- [ ] Optimize React Flow in resource tree
- [ ] Add pagination for large lists

## Quick Wins (< 1 hour each)
- [ ] Add loading skeletons to all list views
- [ ] Add empty states with helpful CTAs
- [ ] Add keyboard shortcut to close dialogs (ESC)
- [ ] Add "Copy to clipboard" for application names/URLs
- [ ] Add breadcrumbs to application detail page
- [ ] Add last sync time to application cards
- [ ] Show connection status indicators for clusters/repos

## Long-term Architecture Ideas

### State Management Evolution
- Consider Zustand for complex UI state (filters, selections, view preferences)

### Form Management
- React Hook Form + Zod for complex forms

### Real-time Updates
- WebSocket connection for live updates (instead of polling)

### Modular Architecture
- Group by feature instead of type:
  ```
  src/features/
    applications/
      components/
      hooks/
      services/
    clusters/
    repositories/
  ```

### Plugin System
- Allow custom resource renderers
- Custom actions per resource type
- Theme customization

---

# Cased CD - Production Roadmap (Original)

Making this **real** - AI-assisted rapid development 🚀

**Timelines**: With AI assistance, we're moving way faster than traditional dev cycles.

---

## 🏗️ Phase 1: Foundation & API Integration ✅ COMPLETE

### 1.1 API Client Setup ✅
- [x] Install TanStack Query (`@tanstack/react-query`)
- [x] Create API client with proper base URL configuration
- [x] Implement request/response interceptors
- [x] Add error handling middleware
- [x] Set up API types/interfaces from ArgoCD OpenAPI spec
- [x] Configure query client with sensible defaults (retry, cache, etc.)

### 1.2 Authentication & Authorization ✅ COMPLETE
- [x] Implement JWT token storage (localStorage/sessionStorage) ✅
- [x] Create auth context/provider ✅
- [x] Build login page with ArgoCD auth ✅
- [ ] Add SSO support (OIDC/SAML) - later
- [ ] Implement token refresh logic
- [x] Add logout functionality ✅
- [x] Protected route wrapper component ✅
- [x] Handle 401/403 errors globally ✅
- [ ] Add "remember me" functionality

### 1.3 API Service Layer
- [x] `ApplicationsService` - CRUD operations ✅
- [ ] `RepositoriesService` - repo operations **← HIGH PRIORITY**
- [ ] `ClustersService` - cluster management **← HIGH PRIORITY**
- [ ] `ProjectsService` - project management
- [ ] `AccountsService` - user/RBAC management
- [ ] `CertificatesService` - TLS cert management
- [ ] `GPGKeysService` - GPG key operations
- [ ] `SettingsService` - system configuration
- [ ] `MetricsService` - health/metrics endpoints

---

## 🎨 Phase 2: Core Application Features

### 2.1 Applications Page
- [x] Replace mock data with real API calls ✅
- [x] Loading/error states ✅
- [x] Search functionality ✅
- [ ] Implement infinite scroll/pagination
- [ ] Add real-time sync status updates (WebSocket/SSE)
- [ ] Build filtering system (by cluster, namespace, health, sync)
- [ ] Add bulk operations (sync, delete, refresh)
- [ ] Show application metrics/stats
- [x] Add "New Application" wizard modal ✅

### 2.2 Application Detail View ✅ COMPLETE
- [x] Create application detail route (`/applications/:name`) ✅
- [x] Build resource tree visualization (React Flow) ✅
- [x] Show application manifest/spec ✅
- [x] Display sync status details ✅
- [x] Health status breakdown by resource ✅
- [ ] Operation history timeline
- [x] Resource-level actions (sync, delete, refresh) ✅
- [ ] Live logs viewer with filtering
- [ ] Diff viewer for out-of-sync resources
- [ ] Events/notifications panel

### 2.3 Resource Details ✅ COMPLETE
- [x] Resource detail modal/drawer ✅
- [x] YAML/JSON manifest viewer (syntax highlighted) ✅
- [ ] Live resource status
- [ ] Pod logs with container selection
- [ ] Terminal/shell access to pods (xterm.js)
- [ ] Resource events timeline
- [ ] Delete/edit resource actions
- [ ] Resource relationships graph

---

## ⚙️ Phase 3: Settings & Configuration

### 3.1 Repositories Management
- [ ] List all connected repositories
- [ ] Add new repository (Git, Helm, OCI)
- [ ] Edit repository credentials
- [ ] Test repository connection
- [ ] Delete repositories (with safety checks)
- [ ] Show repository usage (apps using it)
- [ ] Webhook configuration

### 3.2 Clusters Management
- [ ] List all connected clusters
- [ ] Add new cluster (kubeconfig import)
- [ ] Edit cluster details
- [ ] Test cluster connectivity
- [ ] Show cluster health/metrics
- [ ] Namespace management
- [ ] Delete cluster (with safety checks)

### 3.3 Projects
- [ ] Create/edit/delete projects
- [ ] Project roles and permissions
- [ ] Source repository restrictions
- [ ] Destination cluster/namespace restrictions
- [ ] Resource allow/deny lists
- [ ] Sync windows configuration
- [ ] Orphaned resources handling

### 3.4 Accounts & RBAC
- [x] User account management ✅
- [ ] Role-based access control
- [ ] Group management
- [ ] Permission matrix view
- [ ] API token generation/revocation
- [ ] SSO configuration UI
- [ ] Audit log viewer

### 3.5 System Settings
- [x] General settings (URL, theme, etc.) ✅
- [x] Certificate management UI ✅
- [x] GPG key management UI ✅
- [ ] Notification settings (email, Slack, etc.)
- [ ] Resource customization configuration
- [ ] ConfigManagement plugin settings

---

## 🚀 Phase 4: Advanced Features

### 4.1 Application Creation Wizard
- [ ] Multi-step form (source, destination, sync policy)
- [ ] Helm values editor
- [ ] Kustomize configuration
- [ ] Plugin selection
- [ ] Validation and preview
- [ ] Template/starter app support

### 4.2 GitOps Workflows
- [ ] Create app from Git repo browser
- [ ] PR/MR preview environments
- [ ] Auto-sync configuration
- [ ] Sync waves and phases
- [ ] Pre/post sync hooks
- [ ] Sync retry configuration

### 4.3 Observability
- [ ] Application metrics dashboard
- [ ] Sync history and trends
- [ ] Resource health dashboard
- [ ] Error rate monitoring
- [ ] Deployment frequency stats
- [ ] MTTR (mean time to recovery) tracking

### 4.4 Diff & Sync Management
- [ ] Live diff viewer (Monaco editor)
- [ ] 3-way merge visualization
- [ ] Manual sync with options
- [ ] Selective resource sync
- [ ] Prune resources toggle
- [ ] Force sync option
- [ ] Dry run preview

### 4.5 Terminal & Logs
- [ ] xterm.js integration for pod shells
- [ ] Multi-pod log aggregation
- [ ] Log filtering and search
- [ ] Download logs
- [ ] Follow mode (tail -f)
- [ ] Container selection
- [ ] Timestamp options

---

## 🎯 Phase 5: Polish & Production Readiness

### 5.1 UI/UX Improvements
- [ ] Loading skeletons for all pages
- [ ] Empty states with helpful CTAs
- [ ] Error boundaries with retry logic
- [x] Toast notifications system ✅
- [x] Confirmation dialogs for destructive actions ✅
- [ ] Keyboard shortcuts (⌘K command palette)
- [ ] Breadcrumbs navigation
- [ ] Responsive design for mobile/tablet

### 5.2 Performance Optimization
- [ ] Code splitting and lazy loading
- [ ] Virtual scrolling for large lists (react-virtual)
- [ ] Memoization for expensive components
- [ ] Debounced search inputs
- [ ] Optimistic updates for mutations
- [ ] Service worker for offline support
- [ ] Bundle size optimization

### 5.3 Accessibility (a11y)
- [ ] ARIA labels on all interactive elements
- [ ] Keyboard navigation support
- [ ] Focus management
- [ ] Screen reader testing
- [ ] Color contrast compliance (WCAG AA)
- [ ] Reduced motion support
- [ ] Semantic HTML structure

### 5.4 Testing
- [ ] Unit tests for utilities and hooks (Vitest)
- [ ] Component tests (React Testing Library)
- [ ] Integration tests for API services
- [ ] E2E tests (Playwright/Cypress)
- [ ] Visual regression tests
- [ ] Performance benchmarks
- [ ] Accessibility tests (axe-core)

### 5.5 Documentation
- [ ] User guide
- [ ] Developer documentation
- [ ] API integration docs
- [ ] Deployment guide
- [ ] Configuration reference
- [ ] Troubleshooting guide
- [ ] Contribution guidelines

---

## 🔒 Phase 6: Security & DevOps

### 6.1 Security
- [ ] Content Security Policy (CSP)
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Secure token storage
- [ ] Input sanitization
- [ ] Dependency vulnerability scanning
- [ ] Security headers configuration
- [ ] Rate limiting on API calls

### 6.2 Build & Deploy
- [ ] Production build optimization
- [ ] Environment variable management
- [ ] Docker containerization
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated testing in CI
- [ ] Semantic versioning
- [ ] Changelog generation
- [ ] Release process automation

### 6.3 Monitoring & Analytics
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (Web Vitals)
- [ ] User analytics (optional, privacy-focused)
- [ ] Feature flags system
- [ ] Health check endpoint
- [ ] Metrics endpoint for Prometheus

---

## 🎁 Phase 7: Nice-to-Haves (Future)

### 7.1 Advanced UI Features
- [x] Dark/Light/Auto theme ✅
- [x] Collapsible sidebar ✅
- [ ] Customizable dashboard
- [ ] Saved filters and views
- [ ] Favorites/bookmarks
- [ ] Notification center
- [ ] Activity feed
- [ ] Collaboration features (comments, annotations)

### 7.2 Developer Experience
- [ ] API mocking for development
- [ ] Storybook for component development
- [ ] Chrome DevTools extension
- [ ] VS Code extension
- [ ] CLI companion tool

### 7.3 Enterprise Features
- [ ] Multi-tenancy support
- [ ] Advanced audit logging
- [ ] Compliance reporting
- [ ] Custom branding options
- [ ] Backup/restore functionality
- [ ] Disaster recovery tools

---
