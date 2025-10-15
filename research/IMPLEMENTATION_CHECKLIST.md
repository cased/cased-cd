# ArgoCD Feature Parity - Implementation Checklist

This checklist tracks the implementation of ArgoCD UI features in Cased CD. Refer to `ARGOCD_UI_FEATURES_RESEARCH.md` for detailed specifications.

---

## 1. Application Logs / Pod Logs Viewer

### Backend Integration
- [ ] Add `LogEntry` and `LogQueryParams` types to `src/types/api.ts`
- [ ] Create `logs` service in `src/services/logs.ts`:
  - [ ] `getContainerLogs()` function with EventSource streaming
  - [ ] `useContainerLogs()` hook for reactive streaming
  - [ ] Log buffering and filtering logic

### UI Components
- [ ] Create `src/components/pod-logs-viewer/` directory
- [ ] Implement `PodLogsViewer.tsx` main component:
  - [ ] Log display area with virtualization (react-window)
  - [ ] Auto-scroll to bottom functionality
  - [ ] Log line highlighting for search terms

- [ ] Implement `PodLogsToolbar.tsx`:
  - [ ] Container selector dropdown
  - [ ] Follow/auto-scroll toggle button
  - [ ] Timestamps toggle
  - [ ] Dark/light mode toggle
  - [ ] Line wrapping toggle
  - [ ] Download logs button
  - [ ] Copy logs button
  - [ ] Fullscreen mode button

- [ ] Implement `PodLogsFilters.tsx`:
  - [ ] Text filter input with case-sensitive option
  - [ ] Tail lines selector
  - [ ] Since seconds/time range picker
  - [ ] Previous logs toggle

- [ ] Create `PodLogsDialog.tsx` for fullscreen mode

### Features
- [ ] Real-time log streaming with RxJS or similar
- [ ] Buffering (100ms) to prevent UI thrashing
- [ ] Log filtering with regex support
- [ ] Syntax highlighting for common log formats
- [ ] Download logs as .txt or .log file
- [ ] Copy logs to clipboard
- [ ] Pause/resume streaming
- [ ] Reconnect on stream error
- [ ] Multi-container support

### Integration Points
- [ ] Add "Logs" tab/button in resource details panel
- [ ] Link from pod resources in application tree
- [ ] Show logs icon on pod nodes

### Testing
- [ ] Test with multi-container pods
- [ ] Test streaming with high-volume logs
- [ ] Test filtering and search
- [ ] Test download and copy functions
- [ ] Test auto-scroll behavior
- [ ] Test reconnection on network error

---

## 2. Application History & Rollback

### Backend Integration
- [ ] Add `RevisionHistory`, `RevisionMetadata`, `RollbackRequest` types to `src/types/api.ts`
- [ ] Update `Application` interface to include `status.history`
- [ ] Add to `src/services/applications.ts`:
  - [ ] `getRevisionMetadata()` API function
  - [ ] `getChartDetails()` API function (for Helm apps)
  - [ ] `rollbackApplication()` API function
  - [ ] `useRevisionMetadata()` hook
  - [ ] `useRollbackApplication()` mutation hook

### UI Components
- [ ] Create `src/components/application-history/` directory
- [ ] Implement `ApplicationHistory.tsx` main component:
  - [ ] Reverse chronological list of revisions
  - [ ] Empty state for apps with no history

- [ ] Implement `RevisionCard.tsx`:
  - [ ] Revision ID badge
  - [ ] Deployed timestamp (relative + exact on hover)
  - [ ] Deploy duration
  - [ ] Initiator username with automated/manual badge
  - [ ] Time active (time until next deployment)
  - [ ] Git commit SHA (short form, clickable)
  - [ ] Repository and path display
  - [ ] Actions dropdown (ellipsis menu)
  - [ ] Current revision highlighting

- [ ] Implement `RevisionMetadata.tsx`:
  - [ ] Lazy-load commit author, message
  - [ ] Display commit tags
  - [ ] Link to Git provider

- [ ] Implement `RollbackDialog.tsx`:
  - [ ] Confirmation dialog
  - [ ] Display target revision details
  - [ ] Prune resources checkbox
  - [ ] Warning for auto-sync enabled apps
  - [ ] Cancel/Rollback buttons

### Features
- [ ] Sort history in reverse chronological order
- [ ] Display relative times with moment.js or date-fns
- [ ] Fetch commit metadata on demand (lazy loading)
- [ ] Show collapsible sections for multi-source apps
- [ ] Disable rollback for revisions outside history limit
- [ ] Prevent rollback if auto-sync is enabled
- [ ] Success/error toast notifications
- [ ] Invalidate queries after successful rollback

### Integration Points
- [ ] Add "History" or "History & Rollback" tab to application details
- [ ] Show history count badge
- [ ] Link revision SHAs to Git provider (GitHub, GitLab, etc.)

### Testing
- [ ] Test with apps having multiple deployments
- [ ] Test rollback with prune enabled/disabled
- [ ] Test with auto-sync enabled (should prevent rollback)
- [ ] Test with multi-source applications
- [ ] Test revision metadata loading
- [ ] Test with Helm applications (chart details)
- [ ] Verify query invalidation after rollback

---

## 3. Resource Action Buttons

### Backend Integration
- [ ] Add `ResourceAction`, `ResourceActionParam`, `ResourceIdentifier` types to `src/types/api.ts`
- [ ] Add to `src/services/applications.ts`:
  - [ ] `getResourceActions()` API function
  - [ ] `runResourceAction()` API function
  - [ ] `useResourceActions()` hook
  - [ ] `useRunResourceAction()` mutation hook

### UI Components
- [ ] Create `src/components/resource-actions/` directory
- [ ] Implement `ResourceActionsMenu.tsx`:
  - [ ] Three-dot menu button
  - [ ] Dropdown with available actions
  - [ ] Loading state while fetching actions
  - [ ] Disabled state for unavailable actions
  - [ ] Action icons (if provided)

- [ ] Implement `ResourceActionDialog.tsx`:
  - [ ] Generic action confirmation dialog
  - [ ] Dynamic parameter inputs based on action.params
  - [ ] Input validation
  - [ ] Destructive action styling (red for delete, abort)
  - [ ] Cancel/Execute buttons

- [ ] Implement convenience components:
  - [ ] `RestartButton.tsx` - Quick restart action
  - [ ] `DeleteResourceButton.tsx` - Delete with name confirmation
  - [ ] `ScaleButton.tsx` - Scale replicas with input

### Features
- [ ] Fetch actions dynamically per resource
- [ ] Support parameterized actions with form inputs
- [ ] Confirmation dialogs for destructive actions
- [ ] Type-to-confirm for delete actions
- [ ] Success/error notifications
- [ ] Permission-based action visibility
- [ ] Invalidate resource queries after action

### Built-in Actions to Support
- [ ] **Deployment/StatefulSet/DaemonSet:**
  - [ ] Restart
- [ ] **CronJob:**
  - [ ] Suspend
  - [ ] Resume
  - [ ] Create Job
- [ ] **Argo Rollouts:**
  - [ ] Restart
  - [ ] Retry
  - [ ] Abort
  - [ ] Promote-full
  - [ ] Pause
  - [ ] Resume
- [ ] **Generic:**
  - [ ] Delete

### Integration Points
- [ ] Add actions button to resource details panel header
- [ ] Show actions in resource context menu (right-click)
- [ ] Quick action buttons for common operations (restart, delete)

### Error Handling
- [ ] Handle 403 permission denied
- [ ] Handle 404 resource not found
- [ ] Handle "not permitted to manage resource" errors
- [ ] Show specific error messages in toasts

### Testing
- [ ] Test restart action on Deployment
- [ ] Test delete action on Pod
- [ ] Test actions with parameters (scale, etc.)
- [ ] Test permission denied scenarios
- [ ] Test with custom resource actions (if available)
- [ ] Verify confirmation dialogs appear
- [ ] Test query invalidation after action

---

## 4. Additional Enhancements (Future)

### Improvements Over ArgoCD
- [ ] JSON log parsing with collapsible view (ArgoCD Issue #7960)
- [ ] Working time range filters for logs (ArgoCD Issue #22330)
- [ ] Configurable line limit for logs (ArgoCD Issue #6199)
- [ ] Better previous logs support (ArgoCD Issue #7193)
- [ ] Export logs in multiple formats (JSON, CSV)
- [ ] Log syntax highlighting for popular formats
- [ ] Advanced log filtering (regex, multi-term)

### UI/UX Improvements
- [ ] Keyboard shortcuts for common actions
- [ ] Breadcrumb navigation
- [ ] Resource action favorites/pinning
- [ ] Bulk actions on multiple resources
- [ ] Action history/audit log
- [ ] Rollback comparison view (diff between revisions)

---

## Implementation Order

### Phase 1: Foundation (Week 1)
1. Add all TypeScript types to `src/types/api.ts`
2. Extend application service with new API methods
3. Create basic service layer tests

### Phase 2: History & Rollback (Week 1-2)
1. Build history list component
2. Implement revision card with details
3. Add rollback dialog and mutation
4. Test thoroughly with real ArgoCD

### Phase 3: Resource Actions (Week 2)
1. Build actions menu component
2. Implement action dialog with parameters
3. Add convenience buttons (restart, delete)
4. Test with various resource types

### Phase 4: Pod Logs (Week 2-3)
1. Implement log streaming service
2. Build logs viewer with virtualization
3. Add toolbar and filters
4. Implement download/copy functionality
5. Test streaming performance

### Phase 5: Polish & Testing (Week 3)
1. Integration testing with real ArgoCD
2. Cross-browser testing
3. Performance optimization
4. Documentation updates
5. Screenshot comparisons with ArgoCD UI

---

## Testing Checklist

### Manual Testing
- [ ] Compare side-by-side with ArgoCD UI
- [ ] Test all features with real ArgoCD instance
- [ ] Verify API request/response formats match ArgoCD
- [ ] Test error scenarios (network errors, permissions, etc.)
- [ ] Test with various application types (Git, Helm, multi-source)
- [ ] Test with different resource types (Pods, Deployments, etc.)

### Automated Testing
- [ ] Unit tests for service layer methods
- [ ] Component tests for UI components
- [ ] Integration tests for API interactions
- [ ] E2E tests for critical user flows

### Performance Testing
- [ ] Log streaming with high-volume logs
- [ ] Large revision history lists
- [ ] Multiple simultaneous resource actions
- [ ] Memory usage monitoring

---

## Documentation Tasks

- [ ] Update `CLAUDE.md` with new service patterns
- [ ] Add API documentation for new endpoints
- [ ] Create user guide for history/rollback feature
- [ ] Document resource actions usage
- [ ] Add troubleshooting guide
- [ ] Update README with new features

---

## Dependencies to Install

```bash
# For log streaming
npm install rxjs

# For time formatting
npm install date-fns

# For log virtualization (if not already installed)
npm install react-window react-window-infinite-loader

# For file downloads
npm install file-saver
npm install -D @types/file-saver
```

---

## Key Considerations

### ArgoCD Compatibility
- Ensure all API calls match ArgoCD's exact format
- Use same field names and data structures
- Handle all error cases the same way
- Support same query parameters

### User Experience
- Provide clear feedback for all actions
- Use loading states appropriately
- Show helpful error messages
- Add confirmation for destructive actions
- Maintain consistent UI patterns with rest of Cased CD

### Performance
- Use virtualization for large log lists
- Debounce/throttle filter inputs
- Lazy-load metadata on demand
- Invalidate queries efficiently
- Clean up streams on unmount

### Accessibility
- Keyboard navigation for all actions
- Screen reader support
- Focus management in dialogs
- ARIA labels for icon buttons
- Color contrast for logs

---

## Success Criteria

1. All features work identically to ArgoCD UI
2. API calls match ArgoCD's format exactly
3. Error handling matches ArgoCD behavior
4. UI is responsive and performant
5. No regression in existing features
6. Code follows Cased CD patterns and style
7. Comprehensive test coverage
8. Documentation is complete and accurate

---

**Status:** Not Started
**Last Updated:** 2025-10-11
**Estimated Completion:** 3 weeks
