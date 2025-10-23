# ArgoCD UI Security Research

Research on ArgoCD UI security vulnerabilities and how Cased CD can do better.

## ArgoCD Security Vulnerabilities (2024-2025)

### Critical UI Vulnerabilities

#### 1. CVE-2025-47933 - Cross-Site Scripting (XSS)
- **Severity**: Critical (CVSS: High)
- **Issue**: Attackers could inject JavaScript links into the UI
- **Impact**: When clicked, scripts executed with victim permissions, enabling unauthorized actions (create, modify, delete Kubernetes resources)
- **How We Can Do Better**:
  - Implement strict Content Security Policy (CSP) headers
  - Use DOMPurify for sanitizing all user-generated content
  - React's built-in XSS protection helps, but we should add additional layers
  - Audit all `dangerouslySetInnerHTML` usage (we don't currently use it)

#### 2. CVE-2025-55190 - Maximum Severity API Credential Leak
- **Severity**: 10.0 CVSS (Maximum)
- **Issue**: Bypass isolation mechanisms to access all repository credentials
- **Impact**: Any token with project-level get permissions could retrieve all repository credentials
- **Affected**: ArgoCD 2.13.0-2.13.8, 2.14.0-2.14.15, 3.0.0-3.0.12, 3.1.0-rc1-3.1.1
- **How We Can Do Better**:
  - Implement proper authorization checks on ALL API endpoints
  - Use principle of least privilege - users only see what they need
  - Add request/response validation middleware
  - Implement API audit logging for all credential access

#### 3. CVE-2024-37152 - Unauthenticated Access
- **Issue**: `/api/v1/settings` endpoint accessible without authentication
- **Impact**: Exposed password properties and lengths, enabling server manipulation
- **How We Can Do Better**:
  - Strict authentication middleware on ALL routes
  - No public endpoints except login
  - Comprehensive route protection testing

#### 4. PR #16856 - Missing CSRF Protection
- **Issue**: ArgoCD lacked proper CSRF protections
- **Solution Implemented**:
  - Added Gorilla CSRF framework
  - All non-GET requests require `X-Csrf-Token` header
  - Cookie-based auth triggers CSRF checks (Bearer tokens skip)
  - Token retrieved via GET to `/api/v1/session/userinfo`
- **How We Can Do Better**:
  - We use JWT in localStorage (not cookies) - provides some CSRF protection
  - Should still implement custom headers (X-Requested-With) for state-changing operations
  - Add double-submit cookie pattern as defense-in-depth

### Other Critical Vulnerabilities

#### 5. Cluster Secrets Exposure
- **Issue**: Secrets stored in `kubectl.kubernetes.io/last-applied-configuration` annotation exposed via API
- **How We Can Do Better**:
  - Never expose Kubernetes annotations in API responses
  - Sanitize all Kubernetes resource data before sending to frontend
  - Implement secret redaction in backend

#### 6. DoS Attacks
- **Issue**: Repo-server vulnerable to DoS by fetching unbounded data from malicious Helm registries
- **How We Can Do Better**:
  - Implement rate limiting on all API endpoints
  - Add request size limits
  - Timeout controls on all backend operations

## ArgoCD Security Model Weaknesses

### 1. JWT Authentication Only
- ArgoCD uses JWT exclusively (no session tokens)
- JWTs stored in browser can be stolen via XSS
- **Our Advantage**: We can implement refresh tokens + short-lived access tokens

### 2. CORS Configuration
- ArgoCD's default CORS can be overly permissive
- **Our Advantage**: We control the backend, can enforce strict CORS policies

### 3. No Built-in MFA
- ArgoCD relies on SSO providers for MFA
- **Our Advantage**: We can build native MFA support

## Security Features We Can Implement Better

### 1. Authentication & Authorization
- ✅ **Refresh Token Rotation**: Short-lived access tokens (15 min) + long-lived refresh tokens
- ✅ **httpOnly Cookies**: Store refresh tokens in httpOnly, secure, SameSite=Strict cookies
- ✅ **Session Management**: Proper session invalidation and concurrent session limits
- ✅ **MFA Support**: Native TOTP/WebAuthn support (not just SSO)
- ✅ **Audit Logging**: Every auth event logged with IP, user agent, location

### 2. CSRF Protection
- ✅ **Double-Submit Cookie Pattern**: Send CSRF token in both cookie and header
- ✅ **Custom Headers**: Require X-Requested-With header for all state-changing operations
- ✅ **Origin Validation**: Strict origin/referer checking

### 3. XSS Protection
- ✅ **Strict CSP**: Content-Security-Policy header blocking inline scripts
- ✅ **DOMPurify**: Sanitize all user-generated content
- ✅ **No dangerouslySetInnerHTML**: Avoid React's escape hatches
- ✅ **Sanitize URLs**: Validate and sanitize all external URLs

### 4. Security Headers
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 5. API Security
- ✅ **Rate Limiting**: Per-user and per-IP rate limits
- ✅ **Request Validation**: JSON schema validation on all inputs
- ✅ **Response Sanitization**: Never expose internal details in errors
- ✅ **API Versioning**: Proper API versioning for security updates
- ✅ **Audit Logging**: Complete audit trail of all API calls

### 6. Frontend Security
- ✅ **Credential Redaction**: Never log or display tokens/secrets
- ✅ **Secure Storage**: Use IndexedDB with encryption for sensitive data
- ✅ **Auto-Logout**: Inactivity timeout with warning
- ✅ **Copy Protection**: Prevent clipboard access to sensitive data
- ✅ **Screenshot Protection**: Add watermarks to sensitive views

### 7. Network Security
- ✅ **Strict CORS**: Only allow requests from known origins
- ✅ **HTTPS Only**: Force HTTPS in production
- ✅ **Certificate Pinning**: Pin backend certificates
- ✅ **Subresource Integrity**: Use SRI for external resources

## Implementation Priority

### Phase 1 (Immediate - Critical)
1. Tighten CORS policy (replace `*` with specific origins)
2. Add security headers (CSP, X-Frame-Options, etc.)
3. Implement custom request headers for CSRF protection
4. Add rate limiting to Go backend

### Phase 2 (High Priority)
1. Implement refresh token mechanism
2. Move JWT to httpOnly cookies
3. Add comprehensive audit logging
4. Implement request validation middleware

### Phase 3 (Medium Priority)
1. Add MFA support (TOTP)
2. Implement session management
3. Add DOMPurify for content sanitization
4. Implement credential redaction

### Phase 4 (Nice to Have)
1. WebAuthn support
2. Advanced threat detection
3. Anomaly detection for unusual API patterns
4. Security dashboard for admins

## ArgoCD's 2024 Security Improvements

ArgoCD made significant security improvements in 2024:
- Released 13 security patches
- Reviewed 28 vulnerability reports
- Added CSRF protection (PR #16856)
- Fixed XSS vulnerabilities
- Improved secret handling
- Added DoS protections

**We can learn from their mistakes and build security in from day one.**

## References
- ArgoCD Security Docs: https://argo-cd.readthedocs.io/en/stable/security_considerations/
- CVE-2025-47933: XSS Vulnerability
- CVE-2025-55190: Credential Leak (CVSS 10.0)
- CVE-2024-37152: Unauthenticated Access
- PR #16856: CSRF Protection Implementation
