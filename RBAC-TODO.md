# RBAC & Enterprise TODO

## RBAC Features
- [ ] Role templates (e.g., "Rollback Only", "Read Only", "Developer")
- [ ] Bulk operations (grant access to multiple apps)
- [ ] Permission inheritance visualization
- [ ] Policy conflict detection
- [ ] Audit log (who granted what to whom)
- [ ] Policy testing ("can user X do Y on app Z?")
- [ ] Export/import permission sets
- [ ] Compliance reporting (who has admin access?)
- [ ] Time-limited permissions
- [ ] SSO/OIDC group mapping
- [ ] Permission request workflow

## Enterprise Distribution
- [ ] Create enterprise Helm chart
- [ ] Set up enterprise image in private registry
- [ ] Create robot account for customer access
- [ ] Customer onboarding automation
- [ ] Usage-based billing metrics
- [ ] License expiration tracking

## Open Questions
- How do we handle SSO/OIDC groups vs local users?
- Should we support project-level defaults?
- Do we want "permission requests" workflow?
- How to handle admin override scenarios?
