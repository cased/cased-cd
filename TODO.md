# CasedCD Feature TODO

## CLI Tool
- [x] Basic CLI structure (context, doctor, access, version)
- [x] Cluster context display
- [x] Health checks for deployments
- [x] Installation guidance (online help)
- [x] Local development status checker
- [ ] Audit log export command
- [ ] Audit log tail/streaming command

## Notifications
- [x] Notifications UI page
- [x] List all notification configurations
- [x] Create/edit/delete notification services
- [x] Configure notification services (Slack, email, webhooks)
- [ ] Test notifications UI (send test notification)
- [ ] Notification history view
- [ ] Notification templates editor
- [ ] Subscription management per application

## Audit Trails
- [x] Audit log viewer UI
- [x] Filter by user, action, time range
- [x] Backend with PVC storage
- [x] Login tracking
- [x] RBAC change tracking
- [x] Resource deletion tracking
- [x] Detailed diff view for configuration changes
- [ ] Server-side pagination for audit logs
- [ ] Export audit logs (CSV, JSON)
- [ ] Real-time audit log streaming
- [ ] Audit log retention policies
- [ ] Compliance reporting

## Security Enhancements
- [ ] Implement CSRF protection
  - [ ] Add CSRF tokens for state-changing operations
  - [ ] Tighten CORS policy (replace `*` with specific origins)
  - [ ] Add SameSite cookies for JWT storage
  - [ ] Implement custom request headers (X-Requested-With)
- [ ] Content Security Policy (CSP) headers
- [ ] XSS protection improvements
- [ ] Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- [ ] Rate limiting on API endpoints
- [ ] Session timeout and refresh token mechanism
- [ ] Research and implement ArgoCD UI security best practices

## Future Features
- [ ] Multi-cluster management
- [ ] Application health dashboard
- [ ] Resource usage analytics
- [ ] Rollback UI improvements
- [ ] Drift detection visualization
