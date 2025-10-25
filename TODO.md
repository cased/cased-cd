# CasedCD Feature TODO

## Notifications
- [ ] Notifications UI page
- [ ] List all ArgoCD notification configurations
- [ ] Create/edit/delete notification triggers
- [ ] Configure notification services (Slack, email, webhooks)
- [ ] Test notifications
- [ ] Notification history view
- [ ] Notification templates editor
- [ ] Subscription management per application

## Audit Trails
- [ ] Audit log viewer UI
- [ ] Filter by user, action, resource, time range
- [ ] Export audit logs (CSV, JSON)
- [ ] Real-time audit log streaming
- [ ] Audit log retention policies
- [ ] Compliance reporting
- [ ] Detailed diff view for configuration changes

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
