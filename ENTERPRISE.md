# Cased CD Enterprise

This document explains how the Cased CD enterprise distribution model works, including image management, customer access, and deployment.

## Overview

Cased CD uses a **private container registry access** model for enterprise licensing:

- **Standard Tier**: Public image at `ghcr.io/cased/cased-cd`
- **Enterprise Tier**: Private image at `ghcr.io/cased/cased-cd-enterprise`

Access to the private enterprise image serves as the license mechanism - no license keys required.

## Image Distribution

| Tier | Image | Registry | Visibility | Access |
|------|-------|----------|------------|--------|
| Standard | `ghcr.io/cased/cased-cd` | GitHub Packages | Public | Anyone |
| Enterprise | `ghcr.io/cased/cased-cd-enterprise` | GitHub Packages | Private | Credentials required |

## How Enterprise Detection Works

The frontend automatically detects which tier is running:

1. On startup, frontend checks if `/api/v1/settings/rbac` endpoint exists
2. **200 OK** = Enterprise backend present → Show all features
3. **404 Not Found** = Standard deployment → Hide enterprise features

No license endpoint, no validation API - just endpoint presence detection.

## Building Enterprise Images

### Automated Builds (Recommended)

GitHub Actions automatically builds and pushes both images on release:

```bash
# Create a release tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# GitHub Actions will:
# 1. Build standard image → ghcr.io/cased/cased-cd:v1.0.0
# 2. Build enterprise image → ghcr.io/cased/cased-cd-enterprise:v1.0.0
# 3. Tag both as :latest
# 4. Push to GitHub Container Registry
```

### Manual Builds

For local testing or custom builds:

```bash
# Build standard tier
./scripts/build-standard.sh v1.0.0

# Build enterprise tier
./scripts/build-enterprise.sh v1.0.0

# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Push images
docker push ghcr.io/cased/cased-cd:v1.0.0
docker push ghcr.io/cased/cased-cd-enterprise:v1.0.0
```

## Setting Up Enterprise Package (First Time)

### 1. Create the Enterprise Package

On first build, push the enterprise image to create the package:

```bash
./scripts/build-enterprise.sh v1.0.0
docker push ghcr.io/cased/cased-cd-enterprise:v1.0.0
docker push ghcr.io/cased/cased-cd-enterprise:latest
```

### 2. Set Package to Private

1. Go to https://github.com/orgs/cased/packages/container/cased-cd-enterprise/settings
2. Under "Danger Zone" → Change visibility
3. Select **Private**
4. Confirm the change

### 3. Link Package to Repository (Optional)

1. In package settings, scroll to "Connect repository"
2. Select `cased/cased-cd`
3. This shows the package on the repo page

## Granting Customer Access

There are two methods for giving customers access to the enterprise image.

### Method 1: Direct GitHub User/Org Access (Recommended for Small Deployments)

Best for customers who already use GitHub and want to use their own credentials.

**Steps:**

1. Customer provides their GitHub username or organization name
2. Go to https://github.com/orgs/cased/packages/container/cased-cd-enterprise/settings
3. Scroll to "Manage Actions access"
4. Click "Add Repository" or "Add Team"
5. Add their GitHub org/user with **Read** permission

**Customer deploys with:**

```bash
# Customer logs in with their GitHub credentials
echo $GITHUB_PAT | docker login ghcr.io -u customer-username --password-stdin

# Pull enterprise image
docker pull ghcr.io/cased/cased-cd-enterprise:latest

# Or in Kubernetes with imagePullSecrets
kubectl create secret docker-registry cased-enterprise \
  --docker-server=ghcr.io \
  --docker-username=customer-github-username \
  --docker-password=$CUSTOMER_GITHUB_PAT \
  --docker-email=customer@example.com \
  -n argocd
```

**GitHub PAT Requirements:**
- Scope: `read:packages`
- Expiration: Recommend 1 year (renewable)

### Method 2: Robot Account (Recommended for Production/Scale)

Best for many customers or customers without GitHub accounts.

**Setup (One-Time):**

1. Create a GitHub bot account (e.g., `cased-enterprise-bot`)
2. Invite bot to `cased` organization with Member role
3. Grant bot **Read** access to `cased-cd-enterprise` package
4. Create a Personal Access Token (PAT) for the bot:
   - Scope: `read:packages`
   - Expiration: No expiration (or 1 year renewable)
5. Store bot credentials securely (1Password, etc.)

**For Each Customer:**

Provide these credentials (via secure channel):

```yaml
Registry: ghcr.io
Username: cased-enterprise-bot
Password: ghp_xxxxxxxxxxxxxxxxxxxx  # Bot's PAT
Image: ghcr.io/cased/cased-cd-enterprise:latest
```

**Customer creates Kubernetes secret:**

```bash
kubectl create secret docker-registry cased-enterprise \
  --docker-server=ghcr.io \
  --docker-username=cased-enterprise-bot \
  --docker-password=ghp_xxxxxxxxxxxxxxxxxxxx \
  --docker-email=support@cased.com \
  -n argocd
```

**In Helm values:**

```yaml
image:
  repository: ghcr.io/cased/cased-cd-enterprise
  tag: "1.0.0"
  pullPolicy: Always

imagePullSecrets:
  - name: cased-enterprise
```

### Method Comparison

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **Direct Access** | Customer manages their own credentials, more secure | Requires GitHub account, harder to revoke | Small # of tech-savvy customers |
| **Robot Account** | Simple to distribute, works for anyone | Single point of failure, credential sharing | Production deployments, many customers |

## Revoking Enterprise Access

When a customer's license expires or is terminated:

### Method 1 (Direct Access):
1. Go to package settings
2. Find their GitHub user/org in access list
3. Click "Remove"

### Method 2 (Robot Account):
**Option A - Regenerate Token:**
1. Revoke the current bot PAT
2. Create a new PAT
3. Distribute new credentials to active customers only

**Option B - Use Multiple Tokens:**
- Create separate PATs for different customers
- Revoke individual PATs as needed
- More work to manage but better isolation

## Enterprise Helm Chart

The enterprise Helm chart should include:

```yaml
# values.yaml (Enterprise-specific)
image:
  repository: ghcr.io/cased/cased-cd-enterprise
  tag: "1.0.0"
  pullPolicy: Always

imagePullSecrets:
  - name: cased-enterprise

# RBAC backend configuration
rbacBackend:
  enabled: true
  port: 8080

  # Kubernetes RBAC permissions for the backend
  serviceAccount:
    create: true
    name: cased-cd-enterprise
    annotations: {}

# ServiceAccount needs permissions to read/write ConfigMaps and Secrets
rbac:
  create: true
  rules:
    - apiGroups: [""]
      resources: ["configmaps"]
      verbs: ["get", "list", "update", "patch"]
      resourceNames: ["argocd-rbac-cm", "argocd-cm"]
    - apiGroups: [""]
      resources: ["secrets"]
      verbs: ["get", "list", "update", "patch"]
      resourceNames: ["argocd-secret"]
```

## Customer Onboarding Checklist

When a customer purchases enterprise:

- [ ] **Collect Information**
  - GitHub username/org (Method 1) OR customer email (Method 2)
  - Kubernetes cluster version
  - ArgoCD version
  - Deployment namespace

- [ ] **Grant Access**
  - Method 1: Add GitHub user/org to package
  - Method 2: Provide robot account credentials

- [ ] **Provide Deployment Assets**
  - Enterprise Helm chart
  - `values.yaml` template with registry credentials
  - Deployment documentation
  - Support contact information

- [ ] **Verify Deployment**
  - Customer can pull the image
  - RBAC backend starts successfully
  - Enterprise features are visible in UI
  - User management works
  - Permission assignment works

- [ ] **Documentation**
  - Record customer in CRM
  - Note access method used
  - Set license expiration reminder

## Monitoring & Metrics

### Package Download Stats

View enterprise image pull statistics:

```bash
# Via GitHub UI
# Go to: https://github.com/orgs/cased/packages/container/cased-cd-enterprise
# Shows: Total downloads, downloads by version

# Note: GitHub Packages doesn't show which users/IPs pulled
# Only shows aggregate download counts
```

### Usage Analytics

Consider implementing optional telemetry in enterprise builds:

- Anonymous deployment count
- Feature usage (which RBAC features are used)
- ArgoCD version distribution
- Error reporting (opt-in)

This helps prioritize enterprise feature development.

## Security Considerations

### Credential Management

- **Never commit PATs to git**
- Store bot credentials in secure vault (1Password, Vault, etc.)
- Rotate robot account PAT annually
- Use separate PATs per customer when possible
- Monitor package access logs (if available)

### Image Scanning

GitHub automatically scans container images for vulnerabilities:

1. Go to package page
2. Check "Security" tab
3. Review any CVEs found
4. Update dependencies and rebuild if needed

### Supply Chain Security

The GitHub Actions workflow uses:
- Dependabot for dependency updates
- SHA-pinned actions for reproducibility
- SBOM generation (future enhancement)
- Image signing with cosign (future enhancement)

## Troubleshooting

### Customer Can't Pull Enterprise Image

**Error**: `unauthorized: unauthenticated`

**Solutions**:
1. Verify customer has read access to package
2. Check PAT has `read:packages` scope
3. Verify PAT hasn't expired
4. Test credentials locally:
   ```bash
   echo $PAT | docker login ghcr.io -u username --password-stdin
   docker pull ghcr.io/cased/cased-cd-enterprise:latest
   ```

### Enterprise Features Not Showing

**Possible Causes**:
1. Wrong image deployed (standard instead of enterprise)
2. RBAC backend not starting (check pod logs)
3. Frontend can't reach RBAC endpoints (network policy issue)

**Debug**:
```bash
# Check which image is running
kubectl get deploy -n argocd cased-cd -o jsonpath='{.spec.template.spec.containers[0].image}'

# Should show: ghcr.io/cased/cased-cd-enterprise:xxx

# Check RBAC backend logs
kubectl logs -n argocd deployment/cased-cd -c rbac-backend

# Test RBAC endpoint from pod
kubectl exec -n argocd deployment/cased-cd -- wget -O- http://localhost:8080/api/v1/settings/rbac
```

### Kubernetes RBAC Permissions Issues

**Error**: `Failed to get ConfigMap: forbidden`

**Solution**: Verify ServiceAccount has correct RBAC permissions:

```bash
# Check if ServiceAccount exists
kubectl get sa -n argocd cased-cd-enterprise

# Check if RoleBinding exists
kubectl get rolebinding -n argocd cased-cd-enterprise

# Verify permissions
kubectl auth can-i get configmaps --as=system:serviceaccount:argocd:cased-cd-enterprise -n argocd
kubectl auth can-i update configmaps --as=system:serviceaccount:argocd:cased-cd-enterprise -n argocd
```

## Support

For enterprise customer support issues:

- **Email**: support@cased.com
- **Slack**: #cased-cd-enterprise (invite customers to private channel)
- **Documentation**: https://docs.cased.com/cased-cd/enterprise

## Future Enhancements

Planned improvements to enterprise distribution:

- [ ] Automated license expiration tracking
- [ ] Usage-based billing metrics
- [ ] Helm chart repository for enterprise charts
- [ ] Automated customer onboarding portal
- [ ] SSO integration for RBAC
- [ ] Audit log streaming to customer SIEM
- [ ] Multi-cluster RBAC management
