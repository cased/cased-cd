# Cased CD Enterprise - Troubleshooting Guide

This guide helps diagnose and fix common installation issues.

## Quick Diagnostic Script

Run this first to get a health report:

```bash
curl -sL https://raw.githubusercontent.com/cased/cased-cd/main/scripts/diagnose.sh | bash
```

Or manually:

```bash
kubectl get pods -n argocd -l app.kubernetes.io/name=cased-cd
kubectl describe pod -n argocd -l app.kubernetes.io/name=cased-cd
kubectl logs -n argocd -l app.kubernetes.io/name=cased-cd --tail=50
```

---

## Common Issues

### 1. Pod Stuck in `ImagePullBackOff`

**Symptom:**
```
NAME                        READY   STATUS             RESTARTS   AGE
cased-cd-enterprise-xxx     0/1     ImagePullBackOff   0          2m
```

**Check the error:**
```bash
kubectl describe pod -n argocd -l app.kubernetes.io/component=enterprise | grep -A 5 "Events:"
```

#### Cause A: imagePullSecret Not Created

**Error:**
```
Failed to pull image "docker.io/casedimages/cased-cd-enterprise:0.1.12":
rpc error: code = Unknown desc = failed to pull and unpack image:
failed to resolve reference "docker.io/casedimages/cased-cd-enterprise:0.1.12":
pull access denied, repository does not exist or may require authentication
```

**Fix:**
```bash
# Create the secret with your DockerHub token
kubectl create secret docker-registry cased-cd-registry \
  --docker-server=docker.io \
  --docker-username=casedimages \
  --docker-password=YOUR_TOKEN_HERE \
  -n argocd

# Verify it exists
kubectl get secret cased-cd-registry -n argocd
```

#### Cause B: Wrong Secret Name in Helm Values

**Fix:**
```bash
# Check what secret name you used
kubectl get secrets -n argocd | grep docker-registry

# Reinstall with correct secret name
helm upgrade cased-cd cased-cd/cased-cd \
  --namespace argocd \
  --set enterprise.enabled=true \
  --set imagePullSecrets[0].name=cased-cd-registry  # ← Must match secret name
```

#### Cause C: Token Expired or Invalid

**Check token validity:**
```bash
# Try pulling the image manually
docker login docker.io -u casedimages -p YOUR_TOKEN_HERE
docker pull docker.io/casedimages/cased-cd-enterprise:0.1.12
```

If this fails, contact support@cased.com for a new token.

---

### 2. Pod Stuck in `CrashLoopBackOff`

**Symptom:**
```
NAME                        READY   STATUS             RESTARTS   AGE
cased-cd-enterprise-xxx     0/1     CrashLoopBackOff   5          5m
```

**Check logs:**
```bash
kubectl logs -n argocd -l app.kubernetes.io/component=enterprise --tail=100
```

#### Cause A: Cannot Connect to ArgoCD Server

**Error in logs:**
```
Failed to connect to ArgoCD server: dial tcp 10.96.0.1:443: connect: connection refused
```

**Check ArgoCD is running:**
```bash
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server
```

**Fix:**
```bash
# If ArgoCD server isn't running, install/restart it first
kubectl rollout status deployment/argocd-server -n argocd

# Then restart Cased CD
kubectl rollout restart deployment/cased-cd-enterprise -n argocd
```

#### Cause B: Missing Environment Variables

**Check env vars are set:**
```bash
kubectl get deployment cased-cd-enterprise -n argocd -o yaml | grep -A 10 "env:"
```

Should include:
```yaml
env:
  - name: ARGOCD_SERVER
    value: "https://argocd-server.argocd.svc.cluster.local"
  - name: PORT
    value: "8081"
```

---

### 3. PersistentVolumeClaim Stuck in `Pending`

**Symptom:**
```bash
$ kubectl get pvc -n argocd
NAME                          STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS
cased-cd-enterprise-audit     Pending
```

**Check the error:**
```bash
kubectl describe pvc cased-cd-enterprise-audit -n argocd
```

#### Cause A: No Default StorageClass

**Error:**
```
no persistent volumes available for this claim and no storage class is set
```

**Check storage classes:**
```bash
kubectl get storageclass
```

**Fix - Option 1: Use existing storage class:**
```bash
helm upgrade cased-cd cased-cd/cased-cd \
  --namespace argocd \
  --set enterprise.enabled=true \
  --set enterprise.auditTrail.storageClass=gp2  # ← Use your storage class name
```

**Fix - Option 2: Disable PVC (audit logs go to pod logs):**
```bash
helm upgrade cased-cd cased-cd/cased-cd \
  --namespace argocd \
  --set enterprise.enabled=true \
  --set enterprise.auditTrail.enabled=false  # ← Disable persistent audit logs
```

---

### 4. Cannot Access UI (Connection Refused)

**Symptom:**
```bash
$ kubectl port-forward svc/cased-cd 8080:80 -n argocd
Forwarding from 127.0.0.1:8080 -> 8080
Forwarding from [::1]:8080 -> 8080

$ curl http://localhost:8080
curl: (7) Failed to connect to localhost port 8080: Connection refused
```

**Check pod is running:**
```bash
kubectl get pods -n argocd -l app.kubernetes.io/name=cased-cd
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

If endpoints are empty, the pod isn't ready. Check pod health:
```bash
kubectl describe pod -n argocd -l app.kubernetes.io/name=cased-cd
```

---

### 5. RBAC Errors (Enterprise Features Not Working)

**Symptom:**
```
Enterprise features show "Access Denied" or don't work
```

**Check RBAC role exists:**
```bash
kubectl get role cased-cd-enterprise -n argocd
kubectl get rolebinding cased-cd-enterprise -n argocd
```

**Verify permissions:**
```bash
kubectl describe role cased-cd-enterprise -n argocd
```

Should allow:
- `get`, `update`, `patch` on ConfigMaps: `argocd-rbac-cm`, `argocd-notifications-cm`
- `get`, `update`, `patch` on Secrets: `argocd-secret`

**Fix:**
```bash
# Reinstall with enterprise enabled
helm upgrade cased-cd cased-cd/cased-cd \
  --namespace argocd \
  --set enterprise.enabled=true \
  --install
```

---

### 6. Health Checks Failing

**Check liveness/readiness probes:**
```bash
kubectl describe pod -n argocd -l app.kubernetes.io/component=enterprise | grep -A 10 "Liveness\|Readiness"
```

**Test health endpoint manually:**
```bash
# Port-forward to the pod directly
kubectl port-forward -n argocd pod/cased-cd-enterprise-xxx 8081:8081

# Test in another terminal
curl http://localhost:8081/health
```

Expected response:
```json
{"status":"ok","version":"0.1.12"}
```

---

### 7. Wrong Image Version

**Check what image is running:**
```bash
kubectl get deployment cased-cd-enterprise -n argocd -o jsonpath='{.spec.template.spec.containers[0].image}'
```

**Update to latest:**
```bash
helm upgrade cased-cd cased-cd/cased-cd \
  --namespace argocd \
  --set enterprise.enabled=true \
  --set enterprise.image.tag=0.1.12  # ← Specify version
```

---

## Debug Mode

Enable verbose logging:

```bash
helm upgrade cased-cd cased-cd/cased-cd \
  --namespace argocd \
  --set enterprise.enabled=true \
  --set enterprise.debug=true
```

Then check logs:
```bash
kubectl logs -n argocd -l app.kubernetes.io/component=enterprise -f
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

echo "=== Pods ==="
kubectl get pods -n argocd -l app.kubernetes.io/name=cased-cd

echo ""
echo "=== Deployments ==="
kubectl get deployments -n argocd -l app.kubernetes.io/name=cased-cd

echo ""
echo "=== Services ==="
kubectl get svc -n argocd -l app.kubernetes.io/name=cased-cd

echo ""
echo "=== PVCs ==="
kubectl get pvc -n argocd -l app.kubernetes.io/name=cased-cd

echo ""
echo "=== Secrets ==="
kubectl get secrets -n argocd | grep cased

echo ""
echo "=== Recent Pod Events ==="
kubectl get events -n argocd --sort-by='.lastTimestamp' | grep cased-cd | tail -20

echo ""
echo "=== Pod Logs (Last 50 lines) ==="
kubectl logs -n argocd -l app.kubernetes.io/name=cased-cd --tail=50

echo ""
echo "=== Enterprise Pod Logs (Last 50 lines) ==="
kubectl logs -n argocd -l app.kubernetes.io/component=enterprise --tail=50 2>/dev/null || echo "No enterprise pods found"
```

Save as `debug-report.sh`, run it:
```bash
chmod +x debug-report.sh
./debug-report.sh > debug-report.txt
```

Send `debug-report.txt` to support@cased.com

### Contact Support

- **Email**: support@cased.com
- **Documentation**: https://cased.github.io/cased-cd
- **GitHub Issues**: https://github.com/cased/cased-cd/issues

Include:
- Kubernetes version: `kubectl version --short`
- ArgoCD version: `kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server -o jsonpath='{.items[0].spec.containers[0].image}'`
- Debug report from above
- Steps to reproduce the issue
