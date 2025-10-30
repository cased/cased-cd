# Cased CD - Troubleshooting Guide

This guide helps diagnose and fix common installation issues for Cased CD Community Edition.

> **⚠️ Important: Namespace Configuration**
>
> All examples in this guide use `-n argocd` assuming Cased CD is installed in the `argocd` namespace. **If you installed Cased CD in a different namespace** (e.g., `default`, `cased-cd`), you must replace `-n argocd` with `-n YOUR_NAMESPACE` in all kubectl commands.
>
> To check which namespace Cased CD is in:
> ```bash
> kubectl get pods --all-namespaces | grep cased-cd
> ```

## Quick Diagnostic Commands

Run these first to get a health report:

```bash
# Check pod status
kubectl get pods -n argocd -l app.kubernetes.io/name=cased-cd

# View recent logs
kubectl logs -n argocd -l app.kubernetes.io/name=cased-cd --tail=50

# Describe pod for events
kubectl describe pod -n argocd -l app.kubernetes.io/name=cased-cd
```

---

## Common Issues

### 1. Pod Stuck in `ImagePullBackOff`

**Symptom:**
```
NAME                        READY   STATUS             RESTARTS   AGE
cased-cd-xxx                0/1     ImagePullBackOff   0          2m
```

**Check the error:**
```bash
kubectl describe pod -n argocd -l app.kubernetes.io/name=cased-cd | grep -A 5 "Events:"
```

#### Cause: Cannot Pull Image from GitHub Container Registry

**Error:**
```
Failed to pull image "ghcr.io/cased/cased-cd:0.1.21":
rpc error: code = Unknown desc = failed to pull and unpack image
```

**Fix:**

The community image is public and shouldn't require authentication. This usually means:

1. **Network connectivity issue** - Your cluster cannot reach ghcr.io
   ```bash
   # Test from a pod in your cluster
   kubectl run test --rm -it --image=alpine -- wget -O- https://ghcr.io
   ```

2. **Rate limiting** - GitHub Container Registry has rate limits
   - Wait a few minutes and try again
   - Or use a specific version tag instead of `latest`

3. **Wrong image name** - Check your deployment
   ```bash
   kubectl get deployment cased-cd -n argocd -o jsonpath='{.spec.template.spec.containers[0].image}'
   ```
   Should be: `ghcr.io/cased/cased-cd:0.1.21` (or another valid version)

---

### 2. Pod Stuck in `CrashLoopBackOff`

**Symptom:**
```
NAME                        READY   STATUS             RESTARTS   AGE
cased-cd-xxx                0/1     CrashLoopBackOff   5          5m
```

**Check logs:**
```bash
kubectl logs -n argocd -l app.kubernetes.io/name=cased-cd --tail=100
```

#### Cause A: Cannot Connect to ArgoCD Server

**Error in logs:**
```
Failed to connect to ArgoCD server: dial tcp 10.96.0.1:443: connect: connection refused
nginx: [emerg] host not found in upstream "argocd-server.argocd.svc.cluster.local"
```

**Check ArgoCD is running:**
```bash
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server
```

**Fix 1: If ArgoCD server isn't running**
```bash
# Check ArgoCD installation
kubectl get all -n argocd

# If ArgoCD isn't installed, install it first:
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
kubectl wait --for=condition=available --timeout=600s deployment/argocd-server -n argocd
```

**Fix 2: If ArgoCD is in a different namespace or has custom service name**

Using Helm (recommended):
```bash
helm upgrade cased-cd cased/cased-cd \
  --namespace argocd \
  --set argocd.server="https://my-argocd.custom-namespace.svc.cluster.local"
```

Or edit the static install.yaml before applying.

#### Cause B: Wrong ArgoCD Server URL

**Check the configured URL:**
```bash
kubectl get deployment cased-cd -n argocd -o yaml | grep -A 2 "ARGOCD_SERVER"
```

**Default value:** `https://argocd-server.argocd.svc.cluster.local`

If your ArgoCD uses a different namespace or service name, update it:
```bash
helm upgrade cased-cd cased/cased-cd \
  --namespace argocd \
  --set argocd.server="https://argocd-server.NAMESPACE.svc.cluster.local"
```

---

### 3. Cannot Access UI (Connection Refused)

**Symptom:**
```bash
$ kubectl port-forward svc/cased-cd 8080:80 -n argocd
Forwarding from 127.0.0.1:8080 -> 8080

$ curl http://localhost:8080
curl: (7) Failed to connect to localhost port 8080: Connection refused
```

**Check pod is running:**
```bash
kubectl get pods -n argocd -l app.kubernetes.io/name=cased-cd
```

If pod shows `0/1 Ready`, check logs:
```bash
kubectl logs -n argocd -l app.kubernetes.io/name=cased-cd
```

**Check service:**
```bash
kubectl get svc cased-cd -n argocd
kubectl describe svc cased-cd -n argocd
```

**Check endpoints:**
```bash
kubectl get endpoints cased-cd -n argocd
```

If endpoints are empty, the pod isn't passing health checks:
```bash
kubectl describe pod -n argocd -l app.kubernetes.io/name=cased-cd
```

---

### 4. Health Checks Failing

**Check liveness/readiness probes:**
```bash
kubectl describe pod -n argocd -l app.kubernetes.io/name=cased-cd | grep -A 10 "Liveness\|Readiness"
```

**Test health endpoint manually:**
```bash
# Port-forward to the pod directly
POD_NAME=$(kubectl get pod -n argocd -l app.kubernetes.io/name=cased-cd -o jsonpath='{.items[0].metadata.name}')
kubectl port-forward -n argocd pod/$POD_NAME 8081:8080

# Test in another terminal
curl http://localhost:8081/health
```

Expected response:
```
OK
```

---

### 5. Login Issues

**Symptom:** Cannot log in with ArgoCD credentials

**Get ArgoCD admin password:**
```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
echo
```

**Check ArgoCD API is accessible from Cased CD pod:**
```bash
POD_NAME=$(kubectl get pod -n argocd -l app.kubernetes.io/name=cased-cd -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n argocd $POD_NAME -- wget -O- http://argocd-server.argocd.svc.cluster.local/api/version
```

If this fails, there's a network connectivity issue between Cased CD and ArgoCD.

---

### 6. Nginx Configuration Errors

**Check nginx logs in the pod:**
```bash
kubectl logs -n argocd -l app.kubernetes.io/name=cased-cd | grep nginx
```

Common errors:

**Error: "host not found in upstream"**
```
nginx: [emerg] host not found in upstream "argocd-server.argocd.svc.cluster.local"
```

Fix: ArgoCD server doesn't exist or is in a different namespace. Update `argocd.server` value.

**Error: "bind() to 0.0.0.0:80 failed"**
```
nginx: [emerg] bind() to 0.0.0.0:80 failed (13: Permission denied)
```

Fix: This shouldn't happen with our default configuration. Check pod security context is correct.

---

### 7. Ingress Not Working

**Check ingress resource:**
```bash
kubectl get ingress -n argocd
kubectl describe ingress cased-cd -n argocd
```

**Check ingress controller is running:**
```bash
# For nginx ingress
kubectl get pods -n ingress-nginx

# For other ingress controllers, check their namespace
```

**Check ingress class:**
```bash
kubectl get ingressclass
```

Make sure your Helm values specify the correct ingress class:
```yaml
ingress:
  enabled: true
  className: "nginx"  # or whatever your cluster uses
```

---

### 8. TLS/HTTPS Issues with ArgoCD

If your ArgoCD server uses self-signed certificates, you may see TLS errors.

**Fix: Enable insecure mode**
```bash
helm upgrade cased-cd cased/cased-cd \
  --namespace argocd \
  --set argocd.insecure=true
```

This tells nginx to skip TLS certificate verification when proxying to ArgoCD.

---

## Debug Mode

Get more verbose output from nginx:

```bash
# View all logs (not just errors)
kubectl logs -n argocd -l app.kubernetes.io/name=cased-cd -f
```

---

## Getting Help

### Collect Debug Information

Run this and send output to support:

```bash
#!/bin/bash
echo "=== Cased CD Debug Report ==="
echo "Date: $(date)"
echo ""

echo "=== Kubernetes Version ==="
kubectl version --short

echo ""
echo "=== Pods ==="
kubectl get pods -n argocd -l app.kubernetes.io/name=cased-cd

echo ""
echo "=== Deployments ==="
kubectl get deployments -n argocd -l app.kubernetes.io/name=cased-cd -o wide

echo ""
echo "=== Services ==="
kubectl get svc -n argocd -l app.kubernetes.io/name=cased-cd

echo ""
echo "=== ArgoCD Server Status ==="
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server

echo ""
echo "=== Recent Pod Events ==="
kubectl get events -n argocd --sort-by='.lastTimestamp' | grep cased-cd | tail -20

echo ""
echo "=== Pod Logs (Last 100 lines) ==="
kubectl logs -n argocd -l app.kubernetes.io/name=cased-cd --tail=100

echo ""
echo "=== Cased CD Configuration ==="
kubectl get deployment cased-cd -n argocd -o yaml | grep -A 5 "env:"
```

Save as `debug-report.sh`, run it:
```bash
chmod +x debug-report.sh
./debug-report.sh > debug-report.txt
```

### Contact Support

- **GitHub Issues**: https://github.com/cased/cased-cd/issues
- **Email**: support@cased.com
- **Documentation**: https://cased.github.io/cased-cd

Please include:
- Kubernetes version: `kubectl version --short`
- ArgoCD version: `kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server -o jsonpath='{.items[0].spec.containers[0].image}'`
- Debug report from above
- Steps to reproduce the issue

---

## Upgrading to Enterprise

For advanced features including RBAC management, audit trail, user management, and notifications, visit https://cased.com to learn about Cased CD Enterprise.
