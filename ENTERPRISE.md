# Cased CD Enterprise

This document explains how the Cased CD enterprise distribution model works, including image management, customer access, and deployment.

## Overview

Cased CD uses a **private container registry proxy** model for enterprise licensing:

- **Standard Tier**: Public image at `ghcr.io/cased/cased-cd`
- **Enterprise Tier**: Private image at `registry.cased.com/cased/cased-cd-enterprise`

Access to the private enterprise image serves as the license mechanism - no license keys required. Each customer receives a unique **scoped access token** that provides access ONLY to the enterprise image through our registry proxy, ensuring excellent security isolation.

## Image Distribution

| Tier | Image | Registry | Visibility | Access |
|------|-------|----------|------------|--------|
| Standard | `ghcr.io/cased/cased-cd` | GitHub Container Registry | Public | Anyone |
| Enterprise | `registry.cased.com/cased/cased-cd-enterprise` | Cased Registry Proxy | Private | Scoped token |

Enterprise images are distributed via our private registry proxy at `registry.cased.com`. The proxy authenticates with GitHub Container Registry on behalf of customers using scoped tokens. Each customer token can ONLY pull the enterprise image and nothing else, providing superior security compared to direct GitHub PAT access.

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

Enterprise customers receive access via unique **scoped access tokens** for our private registry proxy at `registry.cased.com`.

### Registry Proxy Token Distribution

Each customer receives a unique token that is scoped to ONLY pull the enterprise image through our registry proxy. The token provides superior security isolation and can be instantly revoked.

#### Prerequisites

1. Access to production Comet deployment (where registry proxy runs)
2. kubectl access to production cluster

#### Creating Customer Access

For each new customer, run the management command on the Comet production server:

```bash
# Create a new customer token
kubectl exec -n comet deployment/comet-web -- \
  python manage.py registry_token create \
    "Customer Name" \
    "customer@example.com" \
    --image cased-cd-enterprise \
    --expires-days 365
```

This will output a confirmation with a partial token (first 8 characters only for security).

#### Get Installation Instructions

Generate complete installation instructions for the customer:

```bash
# Get full installation guide with token
kubectl exec -n comet deployment/comet-web -- \
  python manage.py registry_token instructions "Customer Name"
```

This outputs ready-to-send instructions including:
- kubectl command to create the registry secret
- Helm installation command
- kubectl installation manifests
- Troubleshooting steps

Send these instructions to the customer via secure channel (email, Slack, etc.).

#### Security Benefits

✅ **Image-scoped**: Token works ONLY for `cased-cd-enterprise` image
✅ **Read-only**: Cannot push, modify, or delete images
✅ **Proxy-isolated**: Customer never gets GitHub credentials
✅ **No code access**: Cannot read source code repositories
✅ **Instant revocation**: Revoke token with one command
✅ **Full audit trail**: All pulls logged in database

#### Customer Installation

The customer receives these instructions (automatically generated by the `instructions` command):

```bash
# Step 1: Create registry secret
kubectl create secret docker-registry cased-cd-registry \
  --docker-server=registry.cased.com \
  --docker-username=customer-name \
  --docker-password=<unique-token-here> \
  -n argocd

# Step 2: Install with Helm
helm install cased-cd \
  https://cased.github.io/cased-cd/cased-cd-0.1.14.tgz \
  --namespace argocd \
  --set enterprise.enabled=true \
  --set enterprise.auditTrail.enabled=true \
  --set enterprise.image.repository=registry.cased.com/cased/cased-cd-enterprise \
  --set imagePullSecrets[0].name=cased-cd-registry

# Step 3: Access the UI
kubectl port-forward svc/cased-cd 8080:80 -n argocd
# Visit: http://localhost:8080
```

**Or using kubectl:**

```bash
# Download the enterprise manifest
curl -O https://raw.githubusercontent.com/cased/cased-cd/main/manifests/install-enterprise.yaml

# Create the registry secret first
kubectl create secret docker-registry cased-cd-registry \
  --docker-server=registry.cased.com \
  --docker-username=customer-name \
  --docker-password=<unique-token-here> \
  -n argocd

# Apply the manifest
kubectl apply -f install-enterprise.yaml -n argocd
```

#### Revoking Access

When a customer's license expires or needs to be revoked:

```bash
# Revoke the token instantly
kubectl exec -n comet deployment/comet-web -- \
  python manage.py registry_token revoke "Customer Name"
```

The customer will immediately lose access to pull new images (existing pods continue running until restarted).

#### Managing Tokens

View all customer tokens:

```bash
# List all tokens with status
kubectl exec -n comet deployment/comet-web -- \
  python manage.py registry_token list
```

View usage statistics:

```bash
# See pull counts and customer activity
kubectl exec -n comet deployment/comet-web -- \
  python manage.py registry_token stats
```

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
  repository: registry.cased.com/cased/cased-cd-enterprise
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

- **All customer tokens stored in production database** - Secured by Kubernetes RBAC and database encryption
- No need for publisher tokens - GitHub Actions uses automatic `GITHUB_TOKEN` for building
- Registry proxy uses a single GitHub PAT (stored in SSM) to authenticate with GHCR
- Customer tokens are **image-scoped** - can only pull the enterprise image
- Use unique token per customer for easy revocation and tracking
- Tokens stored with customer name/email in database for audit trail
- Rotate customer tokens via management command before expiration
- **All pulls logged** to database with timestamp, IP, and success/failure
- **Instant revocation** - customer loses access immediately when token revoked

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

**Error**: `Error response from daemon: pull access denied for registry.cased.com/cased/cased-cd-enterprise`

**Solutions**:
1. Verify token hasn't been revoked: `kubectl exec -n comet deployment/comet-web -- python manage.py registry_token list`
2. Check token hasn't expired
3. Verify customer created the imagePullSecret correctly with `--docker-server=registry.cased.com`
4. Test credentials locally:
   ```bash
   echo $TOKEN | docker login registry.cased.com -u customer-name --password-stdin
   docker pull registry.cased.com/cased/cased-cd-enterprise:latest
   ```
5. If token is invalid, create a new one or update the existing secret:
   ```bash
   # On your side: get token for customer
   kubectl exec -n comet deployment/comet-web -- \
     python manage.py registry_token instructions "Customer Name"

   # Customer updates their secret:
   kubectl delete secret cased-cd-registry -n argocd
   kubectl create secret docker-registry cased-cd-registry \
     --docker-server=registry.cased.com \
     --docker-username=customer-name \
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
kubectl get deploy -n argocd cased-cd-enterprise -o jsonpath='{.spec.template.spec.containers[0].image}'

# Should show: registry.cased.com/cased/cased-cd-enterprise:xxx

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
