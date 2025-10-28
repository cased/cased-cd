# Cased CD Enterprise

This document explains how the Cased CD enterprise distribution model works, including image management, customer access, and deployment.

## Overview

Cased CD uses a **private container registry access** model for enterprise licensing:

- **Standard Tier**: Public image at `ghcr.io/cased/cased-cd`
- **Enterprise Tier**: Private image at `ghcr.io/cased/cased-cd-enterprise`

Access to the private enterprise image serves as the license mechanism - no license keys required. Each customer receives a unique **package-scoped** GitHub Personal Access Token that provides access ONLY to the enterprise image, ensuring excellent security isolation.

## Image Distribution

| Tier | Image | Registry | Visibility | Access |
|------|-------|----------|------------|--------|
| Standard | `ghcr.io/cased/cased-cd` | GitHub Container Registry | Public | Anyone |
| Enterprise | `ghcr.io/cased/cased-cd-enterprise` | GitHub Container Registry | Private | Package-scoped PAT |

Enterprise images are distributed via GHCR with **fine-grained, package-scoped** Personal Access Tokens. Each customer token can ONLY pull the enterprise image and nothing else, providing superior security compared to account-wide tokens.

## How Enterprise Detection Works

The frontend automatically detects which tier is running:

1. On startup, frontend checks if `/api/v1/settings/rbac` endpoint exists
2. **200 OK** = Enterprise backend present → Show all features
3. **404 Not Found** = Standard deployment → Hide enterprise features

No license endpoint, no validation API - just endpoint presence detection.

## Building Enterprise Images

### Prerequisites

No additional secrets needed! GitHub Actions automatically uses `GITHUB_TOKEN` to publish to GHCR. The workflow is configured to push to both:
- Public standard image: `ghcr.io/cased/cased-cd`
- Private enterprise image: `ghcr.io/cased/cased-cd-enterprise`

### Automated Builds (Recommended)

GitHub Actions automatically builds and pushes both images on release:

```bash
# Create a release tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# GitHub Actions will:
# 1. Build standard image → ghcr.io/cased/cased-cd:v1.0.0 (public)
# 2. Build enterprise image → ghcr.io/cased/cased-cd-enterprise:v1.0.0 (private)
# 3. Tag both as :latest
# 4. Push to GitHub Container Registry
# 5. Generate build provenance attestations for supply chain security
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

## Setting Up GHCR Package (First Time)

### 1. Verify Package Visibility

After the first GitHub Actions build:

1. Go to https://github.com/orgs/cased/packages
2. Find `cased-cd-enterprise` package
3. Click **Package settings**
4. Confirm **Visibility** is set to **Private**
5. This ensures only authenticated users with tokens can pull the image

### 2. Configure Package Access

The enterprise package should be configured to allow fine-grained PAT access:

1. Go to package settings
2. Under **Manage Actions access**, ensure organization members can create PATs
3. Package-scoped tokens provide excellent security isolation

## Granting Customer Access

Enterprise customers receive access via unique **fine-grained GitHub Personal Access Tokens** that are scoped to ONLY the enterprise package.

### GitHub Fine-Grained PAT Distribution

Each customer receives a unique package-scoped PAT, providing superior security isolation. The token can ONLY pull the enterprise image - it cannot access source code, other packages, or perform any write operations.

#### Prerequisites

1. GitHub organization: `cased`
2. Private package: `ghcr.io/cased/cased-cd-enterprise`
3. Customer tracking system: `~/.cased-cd-customers.json`

#### Creating Customer Access

For each new customer:

1. **Create Fine-Grained GitHub PAT**
   - Log in to **your** GitHub account (that owns `cased` org)
   - Go to **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
   - Click **"Generate new token"**
   - Configure:
     - **Token name**: `customer-acme-corp` (use customer name for tracking)
     - **Expiration**: 1 year (or custom)
     - **Resource owner**: `cased` (your organization)
     - **Repository access**: Select "Public Repositories (read-only)" (most restrictive option)
       - *Note: This doesn't affect package access, but select this to avoid granting any repo permissions*
     - **Permissions** → **Account permissions**:
       - **Packages**: `Read-only` ⚠️ **This is the key permission for GHCR access**
   - Click **"Generate token"**
   - **Copy the token** (format: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

2. **Add Customer to Tracking System**
   ```bash
   ./scripts/customers/manage.sh add \
     "Acme Corp" \
     "admin@acme.com" \
     "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

3. **Send Installation Instructions**
   ```bash
   # Generate ready-to-send instructions
   ./scripts/customers/manage.sh instructions "Acme Corp"
   ```

   This outputs complete kubectl and helm commands the customer can run directly.

#### Security Benefits

✅ **Package-scoped**: Token works ONLY for `cased-cd-enterprise` package
✅ **Read-only**: Cannot push, modify, or delete images
✅ **Org-scoped**: Cannot access packages outside `cased` organization
✅ **No code access**: Cannot read source code repositories
✅ **Revocable**: Delete token instantly revokes all access
✅ **Auditable**: GitHub tracks all package pulls

#### Customer Installation

The customer receives these instructions:

```bash
# Step 1: Create GitHub Container Registry secret
kubectl create secret docker-registry cased-cd-registry \
  --docker-server=ghcr.io \
  --docker-username=USERNAME \
  --docker-password=ghp_customer_token_here \
  -n argocd

# Step 2: Install with Helm
helm install cased-cd \
  https://cased.github.io/cased-cd/cased-cd-0.1.12.tgz \
  --namespace argocd \
  --set enterprise.enabled=true \
  --set enterprise.auditTrail.enabled=true \
  --set enterprise.image.repository=ghcr.io/cased/cased-cd-enterprise \
  --set imagePullSecrets[0].name=cased-cd-registry

# Step 3: Access the UI
kubectl port-forward svc/cased-cd 8080:80 -n argocd
# Visit: http://localhost:8080
```

**Note**: The `--docker-username` can be any valid GitHub username - it's not validated when using a PAT.

#### Revoking Access

When a customer's license expires:

1. Go to [GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Find the token with customer name (e.g., `customer-acme-corp`)
3. Click **Delete**
4. Confirm deletion
5. Update tracking system:
   ```bash
   ./scripts/customers/manage.sh revoke "Acme Corp"
   ```

The customer will immediately lose access to pull new images (existing pods continue running until restarted).

#### Troubleshooting

If a customer reports installation issues:

1. **Send diagnostic script**:
   ```bash
   curl -sL https://raw.githubusercontent.com/cased/cased-cd/main/scripts/diagnose.sh | bash
   ```

2. **Direct them to troubleshooting guide**:
   https://github.com/cased/cased-cd/blob/main/TROUBLESHOOTING.md

3. **Common issues**:
   - ImagePullBackOff → Token expired or incorrect
   - Wrong secret name → Must match `imagePullSecrets[0].name`
   - Connection refused → Pod not ready, check logs

See `TROUBLESHOOTING.md` for complete debugging guide.

## Enterprise Helm Chart

The enterprise Helm chart should include:

```yaml
# values.yaml (Enterprise-specific)
image:
  repository: ghcr.io/cased/cased-cd-enterprise
  tag: "1.0.0"
  pullPolicy: Always

imagePullSecrets:
  - name: cased-cd-registry

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
  - Customer name and email
  - Kubernetes cluster version
  - ArgoCD version
  - Deployment namespace (usually `argocd`)

- [ ] **Grant Access**
  - Create unique fine-grained GitHub PAT (read-only, package-scoped)
  - Add customer to tracking system: `./scripts/customers/manage.sh add "Customer" "email" "token"`

- [ ] **Provide Deployment Assets**
  - Generate and send installation instructions: `./scripts/customers/manage.sh instructions "Customer"`
  - Include link to troubleshooting guide
  - Provide support contact information

- [ ] **Verify Deployment**
  - Customer confirms they can pull the image
  - RBAC backend starts successfully
  - Enterprise features are visible in UI
  - Audit trail is working (if enabled)

- [ ] **Documentation**
  - Customer automatically recorded in `~/.cased-cd-customers.json`
  - Set license expiration reminder in calendar/CRM
  - Note any special requirements or customizations

## Monitoring & Metrics

### Package Download Stats

View enterprise image pull statistics on GitHub:

1. Go to https://github.com/orgs/cased/packages/container/cased-cd-enterprise
2. View package **Insights** (if available)
3. Check recent downloads and versions

**Note**: GitHub provides limited public statistics for private packages. For detailed tracking, use the customer tracking system (`./scripts/customers/manage.sh list`) to manage active customers and token expiration dates.

### Usage Analytics

Consider implementing optional telemetry in enterprise builds:

- Anonymous deployment count
- Feature usage (which RBAC features are used)
- ArgoCD version distribution
- Error reporting (opt-in)

This helps prioritize enterprise feature development.

## Security Considerations

### Credential Management

- **Never commit GitHub PATs to git** - Customer data is stored in `~/.cased-cd-customers.json` (outside project)
- No need for publisher tokens - GitHub Actions uses automatic `GITHUB_TOKEN`
- Create **read-only, package-scoped** PATs for customers (never write access)
- Use unique token per customer for easy revocation and tracking
- Name tokens clearly (e.g., `customer-acme-corp`) to identify them later
- Rotate customer tokens annually or on license renewal
- Keep `~/.cased-cd-customers.json` backed up securely (contains token history)
- File is created with `chmod 600` (owner read/write only) for extra security
- **Package-scoped tokens** cannot access source code or other packages - excellent security isolation

### Image Scanning

Enable security scanning for GHCR packages:

1. Go to https://github.com/orgs/cased/packages/container/cased-cd-enterprise
2. Navigate to **Package settings**
3. Enable **Dependency graph** and **Dependabot alerts** (if available)
4. GitHub will scan for known vulnerabilities
5. Review security advisories in the GitHub Security tab
6. Update dependencies and rebuild if needed

Alternatively, use third-party scanning tools like Trivy or Snyk for comprehensive vulnerability scanning.

### Supply Chain Security

The GitHub Actions workflow implements:
- Dependabot for dependency updates
- SHA-pinned actions for reproducibility
- Multi-platform builds (amd64, arm64)
- Build provenance via GitHub attestations (for both standard and enterprise images)
- Artifact attestation with subject digest tracking

**Future enhancements**:
- SBOM (Software Bill of Materials) generation and publishing
- Cosign signatures for supply chain verification
- SLSA provenance level 3 compliance

## Troubleshooting

For comprehensive troubleshooting, see `TROUBLESHOOTING.md` and the diagnostic script at `scripts/diagnose.sh`.

### Customer Can't Pull Enterprise Image

**Error**: `Error response from daemon: pull access denied for ghcr.io/cased/cased-cd-enterprise`

**Solutions**:
1. Verify GitHub PAT hasn't expired
2. Check token was created with **Packages: Read-only** permission
3. Verify token is scoped to the correct organization (`cased`)
4. Verify customer created the imagePullSecret correctly
5. Test credentials locally:
   ```bash
   echo $GITHUB_PAT | docker login ghcr.io -u USERNAME --password-stdin
   docker pull ghcr.io/cased/cased-cd-enterprise:latest
   ```
6. If token is invalid, create a new one and update customer's secret:
   ```bash
   kubectl delete secret cased-cd-registry -n argocd
   kubectl create secret docker-registry cased-cd-registry \
     --docker-server=ghcr.io \
     --docker-username=USERNAME \
     --docker-password=NEW_GITHUB_PAT \
     -n argocd
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
