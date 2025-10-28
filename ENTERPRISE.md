# Cased CD Enterprise

This document explains how the Cased CD enterprise distribution model works, including image management, customer access, and deployment.

## Overview

Cased CD uses a **private container registry access** model for enterprise licensing:

- **Standard Tier**: Public image at `ghcr.io/cased/cased-cd`
- **Enterprise Tier**: Private image at `docker.io/casedimages/cased-cd-enterprise`

Access to the private enterprise image serves as the license mechanism - no license keys required. Each customer receives a unique DockerHub access token for pulling enterprise images.

## Image Distribution

| Tier | Image | Registry | Visibility | Access |
|------|-------|----------|------------|--------|
| Standard | `ghcr.io/cased/cased-cd` | GitHub Packages | Public | Anyone |
| Enterprise | `docker.io/casedimages/cased-cd-enterprise` | DockerHub | Private | Per-customer token |

Enterprise images are distributed exclusively via DockerHub with unique access tokens per customer. This provides clean separation from the open source distribution and doesn't require adding customers to the GitHub organization.

## How Enterprise Detection Works

The frontend automatically detects which tier is running:

1. On startup, frontend checks if `/api/v1/settings/rbac` endpoint exists
2. **200 OK** = Enterprise backend present → Show all features
3. **404 Not Found** = Standard deployment → Hide enterprise features

No license endpoint, no validation API - just endpoint presence detection.

## Building Enterprise Images

### Prerequisites

Before building enterprise images, configure GitHub Actions secrets (see `DOCKERHUB-SETUP.md`):
- `DOCKERHUB_USERNAME`: `casedimages`
- `DOCKERHUB_TOKEN`: Your DockerHub access token with read/write permissions

### Automated Builds (Recommended)

GitHub Actions automatically builds and pushes both images on release:

```bash
# Create a release tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# GitHub Actions will:
# 1. Build standard image → ghcr.io/cased/cased-cd:v1.0.0 (public)
# 2. Build enterprise image → docker.io/casedimages/cased-cd-enterprise:v1.0.0 (private)
# 3. Tag both as :latest
# 4. Push to respective registries
```

### Manual Builds

For local testing or custom builds:

```bash
# Build standard tier
./scripts/build-standard.sh v1.0.0

# Build enterprise tier
./scripts/build-enterprise.sh v1.0.0

# Login to registries
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
echo $DOCKERHUB_TOKEN | docker login docker.io -u casedimages --password-stdin

# Push images
docker push ghcr.io/cased/cased-cd:v1.0.0
docker push docker.io/casedimages/cased-cd-enterprise:v1.0.0
```

## Setting Up DockerHub Repository (First Time)

### 1. Create the Private Repository

1. Log in to [hub.docker.com](https://hub.docker.com)
2. Go to **Organizations** → `casedimages`
3. Click **Create Repository**
   - Name: `cased-cd-enterprise`
   - Visibility: **Private**
   - Description: "Cased CD Enterprise - Private container image for commercial customers"
4. Click **Create**

### 2. Verify Privacy Settings

1. Go to https://hub.docker.com/r/casedimages/cased-cd-enterprise/settings
2. Confirm **Visibility** is set to **Private**
3. This ensures only authenticated users with tokens can pull the image

## Granting Customer Access

Enterprise customers receive access via unique DockerHub access tokens.

### DockerHub Per-Customer Token Distribution

Each customer receives a unique DockerHub access token, providing excellent isolation and revocation capabilities.

#### Prerequisites

1. DockerHub organization: `casedimages`
2. Private repository: `casedimages/cased-cd-enterprise`
3. GitHub secrets configured (see `DOCKERHUB-SETUP.md`)

#### Creating Customer Access

For each new customer:

1. **Create DockerHub Access Token**
   - Log in to [hub.docker.com](https://hub.docker.com)
   - Go to **Account Settings** → **Security** → **Access Tokens**
   - Click **"New Access Token"**
   - Description: Customer name (e.g., "Acme Corp")
   - Permissions: **Read Only**
   - Copy the token (format: `dckr_pat_xxxxxxxxxxxxx`)

2. **Add Customer to Tracking System**
   ```bash
   ./scripts/customers/manage.sh add \
     "Acme Corp" \
     "admin@acme.com" \
     "dckr_pat_xxxxxxxxxxxxx"
   ```

3. **Send Installation Instructions**
   ```bash
   # Generate ready-to-send instructions
   ./scripts/customers/manage.sh instructions "Acme Corp"
   ```

   This outputs complete kubectl and helm commands the customer can run directly.

#### Customer Installation

The customer receives these instructions:

```bash
# Step 1: Create Docker registry secret
kubectl create secret docker-registry cased-cd-registry \
  --docker-server=docker.io \
  --docker-username=casedimages \
  --docker-password=dckr_pat_customer_token \
  -n argocd

# Step 2: Install with Helm
helm install cased-cd \
  https://cased.github.io/cased-cd/cased-cd-0.1.12.tgz \
  --namespace argocd \
  --set enterprise.enabled=true \
  --set enterprise.auditTrail.enabled=true \
  --set enterprise.image.repository=docker.io/casedimages/cased-cd-enterprise \
  --set imagePullSecrets[0].name=cased-cd-registry

# Step 3: Access the UI
kubectl port-forward svc/cased-cd 8080:80 -n argocd
# Visit: http://localhost:8080
```

#### Revoking Access

When a customer's license expires:

1. Go to [DockerHub Settings](https://hub.docker.com/settings/security)
2. Find the token with customer name in description
3. Click **Delete**
4. Update tracking system:
   ```bash
   ./scripts/customers/manage.sh revoke "Acme Corp"
   ```

The customer will immediately lose access to pull new images (existing pods continue running).

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
  repository: docker.io/casedimages/cased-cd-enterprise
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
  - Create unique DockerHub access token (read-only)
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

View enterprise image pull statistics on DockerHub:

1. Log in to [hub.docker.com](https://hub.docker.com)
2. Go to https://hub.docker.com/r/casedimages/cased-cd-enterprise
3. View **Insights** tab for:
   - Total pull count
   - Pulls by tag/version
   - Pull trend over time

**Note**: DockerHub doesn't show which specific users pulled images, only aggregate statistics. Use the customer tracking system (`./scripts/customers/manage.sh list`) to manage active customers.

### Usage Analytics

Consider implementing optional telemetry in enterprise builds:

- Anonymous deployment count
- Feature usage (which RBAC features are used)
- ArgoCD version distribution
- Error reporting (opt-in)

This helps prioritize enterprise feature development.

## Security Considerations

### Credential Management

- **Never commit DockerHub tokens to git** - Customer data is stored in `~/.cased-cd-customers.json` (outside project)
- Store DockerHub publisher token (`DOCKERHUB_TOKEN`) in GitHub secrets only
- Create **read-only** tokens for customers (never read-write)
- Use unique token per customer for easy revocation
- Rotate customer tokens annually or on license renewal
- Keep `~/.cased-cd-customers.json` backed up securely (contains token history)
- File is created with `chmod 600` (owner read/write only) for extra security

### Image Scanning

DockerHub automatically scans container images for vulnerabilities:

1. Log in to [hub.docker.com](https://hub.docker.com)
2. Go to repository: `casedimages/cased-cd-enterprise`
3. Check **Tags** tab
4. Click on a tag to see security scan results
5. Review any CVEs found
6. Update dependencies and rebuild if needed

### Supply Chain Security

The GitHub Actions workflow implements:
- Dependabot for dependency updates
- SHA-pinned actions for reproducibility
- Multi-platform builds (amd64, arm64)
- Build provenance via GitHub attestations (for GHCR standard image)

**Future enhancements**:
- Docker Content Trust (DCT) for image signing on DockerHub
- SBOM generation and publishing
- Cosign signatures for supply chain verification

## Troubleshooting

For comprehensive troubleshooting, see `TROUBLESHOOTING.md` and the diagnostic script at `scripts/diagnose.sh`.

### Customer Can't Pull Enterprise Image

**Error**: `Error response from daemon: pull access denied for docker.io/casedimages/cased-cd-enterprise`

**Solutions**:
1. Verify DockerHub token hasn't expired
2. Check token was created with **Read** permission
3. Verify customer created the imagePullSecret correctly
4. Test credentials locally:
   ```bash
   echo $DOCKERHUB_TOKEN | docker login docker.io -u casedimages --password-stdin
   docker pull docker.io/casedimages/cased-cd-enterprise:latest
   ```
5. If token is invalid, create a new one and update customer's secret:
   ```bash
   kubectl delete secret cased-cd-registry -n argocd
   kubectl create secret docker-registry cased-cd-registry \
     --docker-server=docker.io \
     --docker-username=casedimages \
     --docker-password=NEW_TOKEN \
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

# Should show: docker.io/casedimages/cased-cd-enterprise:xxx

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
