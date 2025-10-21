# Deploying Cased CD

This guide covers deploying Cased CD to your Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (1.19+)
- ArgoCD installed in your cluster
- Helm 3.x
- kubectl configured to access your cluster

## Quick Start with Helm

The easiest way to deploy Cased CD is using the Helm chart:

```bash
# Add the Cased CD Helm repository (once available)
helm repo add cased https://charts.cased.com
helm repo update

# Install Cased CD in the same namespace as ArgoCD
helm install cased-cd cased/cased-cd \
  --namespace argocd \
  --set argocd.server=http://argocd-server.argocd.svc.cluster.local:80
```

### Install from local chart

If you're installing from the repository:

```bash
# From the repository root
helm install cased-cd ./chart \
  --namespace argocd \
  --set argocd.server=http://argocd-server.argocd.svc.cluster.local:80
```

## Configuration

### Basic Configuration

The Helm chart can be configured via `values.yaml` or `--set` flags:

```yaml
# Custom ArgoCD server URL
argocd:
  server: "http://argocd-server.argocd.svc.cluster.local:80"

# Enable ingress for external access
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: cased-cd.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: cased-cd-tls
      hosts:
        - cased-cd.example.com

# Resource limits
resources:
  limits:
    cpu: 200m
    memory: 256Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

### ArgoCD Server URL

The `argocd.server` value must point to your ArgoCD server API endpoint. Common configurations:

**ArgoCD in the same namespace:**
```yaml
argocd:
  server: "http://argocd-server:80"
```

**ArgoCD in different namespace:**
```yaml
argocd:
  server: "http://argocd-server.argocd.svc.cluster.local:80"
```

**External ArgoCD (HTTPS):**
```yaml
argocd:
  server: "https://argocd.example.com"
```

## Accessing Cased CD

After installation, access Cased CD based on your service type:

### ClusterIP (default)

```bash
# Port-forward to local machine
kubectl port-forward -n argocd svc/cased-cd 8080:80

# Open http://localhost:8080
```

### LoadBalancer

```bash
# Get the external IP
kubectl get svc -n argocd cased-cd

# Access via the EXTERNAL-IP
```

### Ingress

Access via the configured hostname (e.g., `https://cased-cd.example.com`)

## Authentication

Cased CD uses the same authentication as ArgoCD:

1. Get the ArgoCD admin password:
```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

2. Log in with:
   - Username: `admin`
   - Password: (from step 1)

## Advanced Deployment Options

### Using a Custom Docker Image

Build and push your own image:

```bash
# Build the Docker image
docker build -t myregistry.com/cased-cd:latest .

# Push to your registry
docker push myregistry.com/cased-cd:latest

# Install with custom image
helm install cased-cd ./chart \
  --namespace argocd \
  --set image.repository=myregistry.com/cased-cd \
  --set image.tag=latest
```

### High Availability Setup

```yaml
# values.yaml
replicaCount: 3

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app.kubernetes.io/name
                operator: In
                values:
                  - cased-cd
          topologyKey: kubernetes.io/hostname

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

### Using with Service Mesh (Istio/Linkerd)

No special configuration needed - Cased CD works seamlessly with service meshes.

## Upgrading

```bash
# Update the Helm repository
helm repo update

# Upgrade the release
helm upgrade cased-cd cased/cased-cd \
  --namespace argocd \
  --reuse-values
```

## Uninstalling

```bash
helm uninstall cased-cd --namespace argocd
```

## Troubleshooting

### Cannot connect to ArgoCD API

**Check the ArgoCD server URL:**
```bash
# Verify the URL is correct
kubectl get svc -n argocd argocd-server

# Check Cased CD logs
kubectl logs -n argocd deployment/cased-cd
```

**Check network connectivity:**
```bash
# Test from Cased CD pod
kubectl exec -n argocd deployment/cased-cd -- wget -O- http://argocd-server/api/version
```

### 401 Unauthorized errors

Make sure you're using valid ArgoCD credentials. The JWT token expires after 24 hours by default.

### UI not loading / blank page

**Check the pod status:**
```bash
kubectl get pods -n argocd -l app.kubernetes.io/name=cased-cd
```

**Check pod logs:**
```bash
kubectl logs -n argocd deployment/cased-cd
```

**Verify health endpoint:**
```bash
kubectl port-forward -n argocd svc/cased-cd 8080:80
curl http://localhost:8080/health
```

### CORS errors in browser console

This usually means the ArgoCD server URL is incorrect or the proxy isn't working. Check:

1. The `ARGOCD_SERVER` environment variable in the pod
2. ArgoCD server accessibility from the Cased CD pod
3. Browser console for specific error messages

## Support

- **Documentation**: https://docs.cased.com/cased-cd
- **Issues**: https://github.com/cased/cased-cd/issues
- **Website**: https://cased.com

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.
