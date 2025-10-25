package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"net/http/httputil"
	"net/smtp"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

type RBACConfig struct {
	Policy       string `json:"policy"`
	PolicyDefault string `json:"policyDefault,omitempty"`
	Scopes       string `json:"scopes,omitempty"`
}

type CreateAccountRequest struct {
	Name     string `json:"name"`
	Password string `json:"password"`
	Enabled  bool   `json:"enabled"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	// Try in-cluster config first, fall back to kubeconfig for local development
	config, err := rest.InClusterConfig()
	if err != nil {
		log.Println("Not running in cluster, using kubeconfig...")

		// Use KUBECONFIG env var if set, otherwise use default location
		kubeconfig := os.Getenv("KUBECONFIG")
		if kubeconfig == "" {
			if home := homedir.HomeDir(); home != "" {
				kubeconfig = filepath.Join(home, ".kube", "config")
			}
		}

		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			log.Fatalf("Failed to create kubeconfig: %v", err)
		}
		log.Printf("Using kubeconfig: %s", kubeconfig)
	} else {
		log.Println("Using in-cluster config")
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.Fatalf("Failed to create Kubernetes client: %v", err)
	}

	handler := &Handler{
		clientset: clientset,
		namespace: "argocd",
	}

	// Set up reverse proxy to ArgoCD for all API requests (except /api/v1/settings/*)
	argoCDServer := os.Getenv("ARGOCD_SERVER")
	if argoCDServer == "" {
		argoCDServer = "http://argocd-server.argocd.svc.cluster.local:80"
	}
	argoCDURL, err := url.Parse(argoCDServer)
	if err != nil {
		log.Fatalf("Invalid ARGOCD_SERVER URL: %v", err)
	}

	proxy := httputil.NewSingleHostReverseProxy(argoCDURL)
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.Host = argoCDURL.Host
	}

	// Proxy all /api/* requests (except /api/v1/settings/* and /api/v1/notifications/*) to ArgoCD
	http.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		// Handle RBAC endpoints directly (don't proxy to ArgoCD)
		if r.URL.Path == "/api/v1/settings/rbac" {
			handler.handleRBAC(w, r)
			return
		}
		if r.URL.Path == "/api/v1/account" || r.URL.Path == "/api/v1/settings/accounts" {
			handler.handleAccount(w, r)
			return
		}
		if r.URL.Path == "/api/v1/notifications/config" {
			handler.handleNotifications(w, r)
			return
		}
		if strings.HasPrefix(r.URL.Path, "/api/v1/notifications/services") {
			handler.handleNotificationServices(w, r)
			return
		}
		if r.URL.Path == "/api/v1/settings/audit" {
			handler.handleAudit(w, r)
			return
		}
		if r.URL.Path == "/api/v1/session" {
			handler.handleSession(w, r, proxy)
			return
		}
		// Audit application deletes
		if strings.HasPrefix(r.URL.Path, "/api/v1/applications/") && r.Method == "DELETE" {
			handler.handleApplicationDelete(w, r, proxy)
			return
		}
		// Audit project deletes
		if strings.HasPrefix(r.URL.Path, "/api/v1/projects/") && r.Method == "DELETE" {
			handler.handleProjectDelete(w, r, proxy)
			return
		}

		// CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight OPTIONS requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Proxy everything else to ArgoCD
		proxy.ServeHTTP(w, r)
	})

	// Health check
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Serve static files (React build)
	fs := http.FileServer(http.Dir("/app/dist"))
	http.Handle("/", fs)

	log.Printf("Starting RBAC proxy server on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

type Handler struct {
	clientset *kubernetes.Clientset
	namespace string
}

func (h *Handler) handleRBAC(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	ctx := context.Background()

	switch r.Method {
	case "GET":
		h.getRBACConfig(ctx, w, r)
	case "PUT":
		h.updateRBACConfig(ctx, w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *Handler) getRBACConfig(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "argocd-rbac-cm", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	config := RBACConfig{
		Policy:       configMap.Data["policy.csv"],
		PolicyDefault: configMap.Data["policy.default"],
		Scopes:       configMap.Data["scopes"],
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

func (h *Handler) updateRBACConfig(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	var config RBACConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		http.Error(w, fmt.Sprintf("Failed to decode request: %v", err), http.StatusBadRequest)
		return
	}

	// Get current ConfigMap
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "argocd-rbac-cm", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	// Capture old policy for audit trail
	oldPolicy := ""
	oldPolicyDefault := ""
	if configMap.Data != nil {
		oldPolicy = configMap.Data["policy.csv"]
		oldPolicyDefault = configMap.Data["policy.default"]
	}

	// Update data
	if configMap.Data == nil {
		configMap.Data = make(map[string]string)
	}
	configMap.Data["policy.csv"] = config.Policy
	if config.PolicyDefault != "" {
		configMap.Data["policy.default"] = config.PolicyDefault
	}
	if config.Scopes != "" {
		configMap.Data["scopes"] = config.Scopes
	}

	// Update ConfigMap
	_, err = h.clientset.CoreV1().ConfigMaps(h.namespace).Update(ctx, configMap, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update ConfigMap: %v", err), http.StatusInternalServerError)
		//Log failed audit event
		h.createAuditEvent(ctx, "admin", "rbac.update", "rbac", "permissions", "error", r.RemoteAddr, false)
		return
	}

	// Log successful audit event with before/after details
	changeDetails := map[string]interface{}{
		"before": map[string]string{
			"policy.csv":     oldPolicy,
			"policy.default": oldPolicyDefault,
		},
		"after": map[string]string{
			"policy.csv":     config.Policy,
			"policy.default": config.PolicyDefault,
		},
	}
	h.createAuditEvent(ctx, "admin", "rbac.update", "rbac", "permissions", "info", r.RemoteAddr, true, changeDetails)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

func (h *Handler) handleAccount(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	ctx := context.Background()

	switch r.Method {
	case "GET":
		h.listAccounts(ctx, w, r)
	case "POST":
		h.createAccount(ctx, w, r)
	case "DELETE":
		h.deleteAccount(ctx, w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *Handler) listAccounts(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	// Get argocd-cm ConfigMap to read accounts
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "argocd-cm", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	// Parse accounts from ConfigMap data
	// Accounts are stored as "accounts.<name>" keys with capabilities as values
	accounts := []map[string]interface{}{}

	// Admin account is always present
	adminEnabled := true
	if enabledVal, ok := configMap.Data["accounts.admin.enabled"]; ok && enabledVal == "false" {
		adminEnabled = false
	}
	accounts = append(accounts, map[string]interface{}{
		"name":         "admin",
		"enabled":      adminEnabled,
		"capabilities": []string{"apiKey", "login"},
	})

	// Parse other accounts from ConfigMap
	for key, value := range configMap.Data {
		if strings.HasPrefix(key, "accounts.") && !strings.Contains(key, ".enabled") {
			accountName := strings.TrimPrefix(key, "accounts.")

			// Skip admin account (already added)
			if accountName == "admin" {
				continue
			}

			// Check if account is enabled
			enabled := true
			enabledKey := fmt.Sprintf("accounts.%s.enabled", accountName)
			if enabledVal, ok := configMap.Data[enabledKey]; ok && enabledVal == "false" {
				enabled = false
			}

			// Parse capabilities from value (e.g., "apiKey,login")
			capabilities := []string{}
			if value != "" {
				capabilities = strings.Split(value, ",")
			}

			accounts = append(accounts, map[string]interface{}{
				"name":         accountName,
				"enabled":      enabled,
				"capabilities": capabilities,
			})
		}
	}

	// Return accounts list
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"items": accounts,
	})
}

func (h *Handler) createAccount(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	var req CreateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Failed to decode request: %v", err), http.StatusBadRequest)
		return
	}

	// Validate input
	if req.Name == "" {
		http.Error(w, "Account name is required", http.StatusBadRequest)
		return
	}
	if len(req.Name) < 3 {
		http.Error(w, "Account name must be at least 3 characters", http.StatusBadRequest)
		return
	}
	if len(req.Name) > 63 {
		http.Error(w, "Account name must be less than 63 characters", http.StatusBadRequest)
		return
	}
	// Validate username format: alphanumeric, hyphens, underscores, periods
	// Must start and end with alphanumeric
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$`, req.Name)
	if !matched {
		http.Error(w, "Account name must start and end with alphanumeric, and contain only letters, numbers, hyphens, underscores, or periods", http.StatusBadRequest)
		return
	}
	if req.Password == "" {
		http.Error(w, "Password is required", http.StatusBadRequest)
		return
	}

	// Get argocd-cm ConfigMap
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "argocd-cm", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	// Initialize data if needed
	if configMap.Data == nil {
		configMap.Data = make(map[string]string)
	}

	// Check if account already exists
	accountKey := fmt.Sprintf("accounts.%s", req.Name)
	if _, exists := configMap.Data[accountKey]; exists {
		http.Error(w, "Account already exists", http.StatusConflict)
		return
	}

	// Add account to ConfigMap with login capability
	configMap.Data[accountKey] = "apiKey,login"
	enabledKey := fmt.Sprintf("accounts.%s.enabled", req.Name)
	if req.Enabled {
		configMap.Data[enabledKey] = "true"
	} else {
		configMap.Data[enabledKey] = "false"
	}

	// Update ConfigMap
	_, err = h.clientset.CoreV1().ConfigMaps(h.namespace).Update(ctx, configMap, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	// Get argocd-secret Secret to set password
	secret, err := h.clientset.CoreV1().Secrets(h.namespace).Get(ctx, "argocd-secret", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get Secret: %v", err), http.StatusInternalServerError)
		return
	}

	// Initialize data if needed
	if secret.Data == nil {
		secret.Data = make(map[string][]byte)
	}

	// Hash the password using bcrypt
	// Note: In a production environment, you should use ArgoCD's password hashing utility
	// For now, we'll store a simple bcrypt hash
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to hash password: %v", err), http.StatusInternalServerError)
		return
	}

	// Store password in secret - ArgoCD expects bcrypt format
	passwordKey := fmt.Sprintf("accounts.%s.password", req.Name)
	secret.Data[passwordKey] = hashedPassword

	// Update Secret
	_, err = h.clientset.CoreV1().Secrets(h.namespace).Update(ctx, secret, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update Secret: %v", err), http.StatusInternalServerError)
		return
	}

	// Log successful audit event with details
	accountDetails := map[string]interface{}{
		"after": map[string]interface{}{
			"name":         req.Name,
			"enabled":      req.Enabled,
			"capabilities": []string{"apiKey", "login"},
		},
	}
	h.createAuditEvent(ctx, "admin", "account.create", "account", req.Name, "info", r.RemoteAddr, true, accountDetails)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"name":    req.Name,
		"message": "Account created successfully",
	})
}

func (h *Handler) deleteAccount(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	// Get account name from query parameter
	accountName := r.URL.Query().Get("name")
	if accountName == "" {
		http.Error(w, "Account name is required", http.StatusBadRequest)
		return
	}

	// Prevent deletion of admin account
	if accountName == "admin" {
		http.Error(w, "Cannot delete admin account", http.StatusForbidden)
		return
	}

	// Get argocd-cm ConfigMap
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "argocd-cm", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	// Check if account exists and capture details before deleting
	accountKey := fmt.Sprintf("accounts.%s", accountName)
	capabilities, exists := configMap.Data[accountKey]
	if !exists {
		http.Error(w, "Account not found", http.StatusNotFound)
		return
	}

	// Capture account state before deletion for audit
	enabledKey := fmt.Sprintf("accounts.%s.enabled", accountName)
	enabled := true
	if enabledVal, ok := configMap.Data[enabledKey]; ok && enabledVal == "false" {
		enabled = false
	}

	// Parse capabilities
	capList := []string{}
	if capabilities != "" {
		capList = strings.Split(capabilities, ",")
	}

	// Remove account fields from ConfigMap
	delete(configMap.Data, accountKey)
	delete(configMap.Data, enabledKey)

	// Update ConfigMap
	_, err = h.clientset.CoreV1().ConfigMaps(h.namespace).Update(ctx, configMap, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	// Delete password from argocd-secret Secret
	secret, err := h.clientset.CoreV1().Secrets(h.namespace).Get(ctx, "argocd-secret", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get Secret: %v", err), http.StatusInternalServerError)
		return
	}

	passwordKey := fmt.Sprintf("accounts.%s.password", accountName)
	delete(secret.Data, passwordKey)

	// Update Secret
	_, err = h.clientset.CoreV1().Secrets(h.namespace).Update(ctx, secret, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update Secret: %v", err), http.StatusInternalServerError)
		return
	}

	// Log successful audit event with details
	accountDetails := map[string]interface{}{
		"before": map[string]interface{}{
			"name":         accountName,
			"enabled":      enabled,
			"capabilities": capList,
		},
	}
	h.createAuditEvent(ctx, "admin", "account.delete", "account", accountName, "warning", r.RemoteAddr, true, accountDetails)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"name":    accountName,
		"message": "Account deleted successfully",
	})
}

func (h *Handler) handleNotifications(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	ctx := context.Background()

	switch r.Method {
	case "GET":
		h.getNotificationsConfig(ctx, w, r)
	case "PUT":
		h.updateNotificationsConfig(ctx, w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *Handler) getNotificationsConfig(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	// Get argocd-notifications-cm ConfigMap
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "argocd-notifications-cm", metav1.GetOptions{})
	if err != nil {
		// If ConfigMap doesn't exist, return empty config
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"data": map[string]string{},
		})
		return
	}

	// Return ConfigMap data
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": configMap.Data,
	})
}

func (h *Handler) updateNotificationsConfig(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	var request map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, fmt.Sprintf("Failed to decode request: %v", err), http.StatusBadRequest)
		return
	}

	// Get or create argocd-notifications-cm ConfigMap
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "argocd-notifications-cm", metav1.GetOptions{})
	createNew := false
	if err != nil {
		// ConfigMap doesn't exist, create it
		createNew = true
		configMap = &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "argocd-notifications-cm",
				Namespace: h.namespace,
			},
			Data: make(map[string]string),
		}
	}

	// Capture old config for audit
	oldData := make(map[string]string)
	if configMap.Data != nil {
		for k, v := range configMap.Data {
			oldData[k] = v
		}
	}

	// Initialize data if needed
	if configMap.Data == nil {
		configMap.Data = make(map[string]string)
	}

	// Update ConfigMap data from request
	if data, ok := request["data"].(map[string]interface{}); ok {
		// Clear existing data
		configMap.Data = make(map[string]string)
		// Set new data
		for key, value := range data {
			if strValue, ok := value.(string); ok {
				configMap.Data[key] = strValue
			}
		}
	}

	// Create or update ConfigMap
	if createNew {
		_, err = h.clientset.CoreV1().ConfigMaps(h.namespace).Create(ctx, configMap, metav1.CreateOptions{})
	} else {
		_, err = h.clientset.CoreV1().ConfigMaps(h.namespace).Update(ctx, configMap, metav1.UpdateOptions{})
	}

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update ConfigMap: %v", err), http.StatusInternalServerError)
		// Log failed audit event
		h.createAuditEvent(ctx, "admin", "notification.update", "notification", "config", "error", r.RemoteAddr, false)
		return
	}

	// Log successful audit event with before/after details
	changeDetails := map[string]interface{}{
		"before": oldData,
		"after":  configMap.Data,
	}
	h.createAuditEvent(ctx, "admin", "notification.update", "notification", "config", "info", r.RemoteAddr, true, changeDetails)

	// Return success
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": configMap.Data,
	})
}

// Audit types
type AuditEvent struct {
	ID           string                 `json:"id"`
	Timestamp    string                 `json:"timestamp"`
	User         string                 `json:"user"`
	Action       string                 `json:"action"`
	ResourceType string                 `json:"resourceType"`
	ResourceName string                 `json:"resourceName"`
	Severity     string                 `json:"severity"`
	Details      map[string]interface{} `json:"details,omitempty"`
	IPAddress    string                 `json:"ipAddress,omitempty"`
	UserAgent    string                 `json:"userAgent,omitempty"`
	Success      bool                   `json:"success"`
}

type AuditEventList struct {
	Items    []AuditEvent          `json:"items"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

func (h *Handler) handleAudit(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	ctx := context.Background()

	switch r.Method {
	case "GET":
		h.getAuditEvents(ctx, w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *Handler) handleSession(w http.ResponseWriter, r *http.Request, proxy *httputil.ReverseProxy) {
	ctx := context.Background()

	// Read the request body to extract username
	var loginReq struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes)) // Reset body for proxy

	// Try to parse username from request
	username := "unknown"
	if err := json.Unmarshal(bodyBytes, &loginReq); err == nil {
		username = loginReq.Username
	}

	// Create a response recorder to capture the proxy response
	recorder := httptest.NewRecorder()

	// Forward request to ArgoCD using the proxy
	proxy.ServeHTTP(recorder, r)

	// Copy response from recorder to actual response writer
	for key, values := range recorder.Header() {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
	w.WriteHeader(recorder.Code)
	w.Write(recorder.Body.Bytes())

	// Create audit event based on response status
	success := recorder.Code == http.StatusOK
	severity := "info"
	action := "auth.login"
	if !success {
		severity = "warning"
	}

	loginDetails := map[string]interface{}{
		"username":    username,
		"statusCode":  recorder.Code,
		"ipAddress":   r.RemoteAddr,
	}

	if success {
		h.createAuditEvent(ctx, username, action, "session", "login", severity, r.RemoteAddr, true, map[string]interface{}{"after": loginDetails})
	} else {
		h.createAuditEvent(ctx, username, action, "session", "login", severity, r.RemoteAddr, false, map[string]interface{}{"after": loginDetails})
	}
}

func (h *Handler) handleApplicationDelete(w http.ResponseWriter, r *http.Request, proxy *httputil.ReverseProxy) {
	ctx := context.Background()

	// Extract application name from path
	appName := strings.TrimPrefix(r.URL.Path, "/api/v1/applications/")
	appName = strings.Split(appName, "?")[0] // Remove query params if any

	// Create a response recorder to capture the proxy response
	recorder := httptest.NewRecorder()

	// Forward request to ArgoCD using the proxy
	proxy.ServeHTTP(recorder, r)

	// Copy response from recorder to actual response writer
	for key, values := range recorder.Header() {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
	w.WriteHeader(recorder.Code)
	w.Write(recorder.Body.Bytes())

	// Create audit event based on response status
	success := recorder.Code == http.StatusOK
	severity := "warning" // Deletes are always warnings

	if success {
		h.createAuditEvent(ctx, "admin", "application.delete", "application", appName, severity, r.RemoteAddr, true, map[string]interface{}{
			"before": map[string]string{"name": appName},
		})
	} else {
		h.createAuditEvent(ctx, "admin", "application.delete", "application", appName, "error", r.RemoteAddr, false)
	}
}

func (h *Handler) handleProjectDelete(w http.ResponseWriter, r *http.Request, proxy *httputil.ReverseProxy) {
	ctx := context.Background()

	// Extract project name from path
	projectName := strings.TrimPrefix(r.URL.Path, "/api/v1/projects/")
	projectName = strings.Split(projectName, "?")[0] // Remove query params if any

	// Create a response recorder to capture the proxy response
	recorder := httptest.NewRecorder()

	// Forward request to ArgoCD using the proxy
	proxy.ServeHTTP(recorder, r)

	// Copy response from recorder to actual response writer
	for key, values := range recorder.Header() {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
	w.WriteHeader(recorder.Code)
	w.Write(recorder.Body.Bytes())

	// Create audit event based on response status
	success := recorder.Code == http.StatusOK
	severity := "warning" // Deletes are always warnings

	if success {
		h.createAuditEvent(ctx, "admin", "project.delete", "project", projectName, severity, r.RemoteAddr, true, map[string]interface{}{
			"before": map[string]string{"name": projectName},
		})
	} else {
		h.createAuditEvent(ctx, "admin", "project.delete", "project", projectName, "error", r.RemoteAddr, false)
	}
}

func (h *Handler) getNotifications(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "argocd-notifications-cm", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(configMap)
}

func (h *Handler) updateNotifications(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	// This will be implemented when we add edit functionality
	http.Error(w, "Not implemented yet", http.StatusNotImplemented)
}

// handleNotificationServices handles CRUD operations for notification services
func (h *Handler) handleNotificationServices(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	ctx := context.Background()
	path := r.URL.Path

	// POST /api/v1/notifications/services/slack - Create Slack service
	if path == "/api/v1/notifications/services/slack" && r.Method == "POST" {
		h.createSlackService(ctx, w, r)
		return
	}

	// POST /api/v1/notifications/services/webhook - Create Webhook service
	if path == "/api/v1/notifications/services/webhook" && r.Method == "POST" {
		h.createWebhookService(ctx, w, r)
		return
	}

	// POST /api/v1/notifications/services/email - Create Email service
	if path == "/api/v1/notifications/services/email" && r.Method == "POST" {
		h.createEmailService(ctx, w, r)
		return
	}

	// PUT /api/v1/notifications/services/slack/{name} - Update Slack service
	if strings.HasPrefix(path, "/api/v1/notifications/services/slack/") && r.Method == "PUT" {
		serviceName := strings.TrimPrefix(path, "/api/v1/notifications/services/slack/")
		h.updateSlackService(ctx, w, r, serviceName)
		return
	}

	// PUT /api/v1/notifications/services/webhook/{name} - Update Webhook service
	if strings.HasPrefix(path, "/api/v1/notifications/services/webhook/") && r.Method == "PUT" {
		serviceName := strings.TrimPrefix(path, "/api/v1/notifications/services/webhook/")
		h.updateWebhookService(ctx, w, r, serviceName)
		return
	}

	// PUT /api/v1/notifications/services/email/{name} - Update Email service
	if strings.HasPrefix(path, "/api/v1/notifications/services/email/") && r.Method == "PUT" {
		serviceName := strings.TrimPrefix(path, "/api/v1/notifications/services/email/")
		h.updateEmailService(ctx, w, r, serviceName)
		return
	}

	// POST /api/v1/notifications/services/{name}/test/webhook - Test webhook service
	if strings.Contains(path, "/test/webhook") && r.Method == "POST" {
		serviceName := strings.TrimPrefix(path, "/api/v1/notifications/services/")
		serviceName = strings.TrimSuffix(serviceName, "/test/webhook")
		h.testWebhookService(ctx, w, r, serviceName)
		return
	}

	// POST /api/v1/notifications/services/{name}/test/email - Test email service
	if strings.Contains(path, "/test/email") && r.Method == "POST" {
		serviceName := strings.TrimPrefix(path, "/api/v1/notifications/services/")
		serviceName = strings.TrimSuffix(serviceName, "/test/email")
		h.testEmailService(ctx, w, r, serviceName)
		return
	}

	// Extract service name from path: /api/v1/notifications/services/{name}[/test]
	parts := strings.Split(strings.TrimPrefix(path, "/api/v1/notifications/services/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Service name is required", http.StatusBadRequest)
		return
	}

	serviceName := parts[0]

	// POST /api/v1/notifications/services/{name}/test - Test Slack service
	if len(parts) == 2 && parts[1] == "test" && r.Method == "POST" {
		h.testSlackService(ctx, w, r, serviceName)
		return
	}

	// DELETE /api/v1/notifications/services/{name} - Delete service
	if len(parts) == 1 && r.Method == "DELETE" {
		h.deleteNotificationService(ctx, w, r, serviceName)
		return
	}

	http.Error(w, "Not found", http.StatusNotFound)
}

// SlackServiceRequest represents a Slack notification service configuration
type SlackServiceRequest struct {
	Name       string `json:"name"`
	WebhookURL string `json:"webhookUrl"`
	Channel    string `json:"channel,omitempty"`
	Username   string `json:"username,omitempty"`
	Icon       string `json:"icon,omitempty"`
}

type WebhookServiceRequest struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

type EmailServiceRequest struct {
	Name     string `json:"name"`
	SMTPHost string `json:"smtpHost"`
	SMTPPort string `json:"smtpPort"`
	Username string `json:"username"`
	Password string `json:"password"`
	From     string `json:"from"`
	To       string `json:"to,omitempty"`
}

func (h *Handler) createSlackService(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	var req SlackServiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Name == "" || req.WebhookURL == "" {
		http.Error(w, "name and webhookUrl are required", http.StatusBadRequest)
		return
	}

	// Get the ConfigMap
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "argocd-notifications-cm", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	// Check if service already exists
	serviceKey := fmt.Sprintf("service.slack.%s", req.Name)
	if _, exists := configMap.Data[serviceKey]; exists {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{
			"error":   "Service already exists",
			"message": fmt.Sprintf("A Slack service named '%s' already exists. Please choose a different name or delete the existing service first.", req.Name),
		})
		return
	}

	// Build YAML config for the service
	var yamlConfig strings.Builder
	secretKey := fmt.Sprintf("slack-%s-token", req.Name)
	yamlConfig.WriteString(fmt.Sprintf("token: $%s\n", secretKey))
	if req.Username != "" {
		yamlConfig.WriteString(fmt.Sprintf("username: %s\n", req.Username))
	}
	if req.Icon != "" {
		yamlConfig.WriteString(fmt.Sprintf("icon: %s\n", req.Icon))
	}
	if req.Channel != "" {
		yamlConfig.WriteString(fmt.Sprintf("channel: %s\n", req.Channel))
	}

	// Update ConfigMap
	if configMap.Data == nil {
		configMap.Data = make(map[string]string)
	}
	configMap.Data[serviceKey] = yamlConfig.String()

	_, err = h.clientset.CoreV1().ConfigMaps(h.namespace).Update(ctx, configMap, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	// Store webhook URL in secret
	secret, err := h.clientset.CoreV1().Secrets(h.namespace).Get(ctx, "argocd-notifications-secret", metav1.GetOptions{})
	if err != nil {
		// Create secret if it doesn't exist
		secret = &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "argocd-notifications-secret",
				Namespace: h.namespace,
			},
			Data: make(map[string][]byte),
		}
	}

	if secret.Data == nil {
		secret.Data = make(map[string][]byte)
	}
	secret.Data[secretKey] = []byte(req.WebhookURL)

	if secret.CreationTimestamp.IsZero() {
		_, err = h.clientset.CoreV1().Secrets(h.namespace).Create(ctx, secret, metav1.CreateOptions{})
	} else {
		_, err = h.clientset.CoreV1().Secrets(h.namespace).Update(ctx, secret, metav1.UpdateOptions{})
	}

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update secret: %v", err), http.StatusInternalServerError)
		h.createAuditEvent(ctx, "admin", "notification.service.create", "notification", fmt.Sprintf("slack/%s", req.Name), "error", r.RemoteAddr, false)
		return
	}

	// Log successful audit event
	serviceDetails := map[string]interface{}{
		"after": map[string]interface{}{
			"type":     "slack",
			"name":     req.Name,
			"channel":  req.Channel,
			"username": req.Username,
		},
	}
	h.createAuditEvent(ctx, "admin", "notification.service.create", "notification", fmt.Sprintf("slack/%s", req.Name), "info", r.RemoteAddr, true, serviceDetails)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "created", "name": req.Name})
}

func (h *Handler) updateSlackService(ctx context.Context, w http.ResponseWriter, r *http.Request, serviceName string) {
	var req SlackServiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.WebhookURL == "" {
		http.Error(w, "webhookUrl is required", http.StatusBadRequest)
		return
	}

	// Get the ConfigMap
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "argocd-notifications-cm", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	serviceKey := fmt.Sprintf("service.slack.%s", serviceName)
	if _, exists := configMap.Data[serviceKey]; !exists {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	// Build YAML config
	var yamlConfig strings.Builder
	secretKey := fmt.Sprintf("slack-%s-token", serviceName)
	yamlConfig.WriteString(fmt.Sprintf("token: $%s\n", secretKey))
	if req.Username != "" {
		yamlConfig.WriteString(fmt.Sprintf("username: %s\n", req.Username))
	}
	if req.Icon != "" {
		yamlConfig.WriteString(fmt.Sprintf("icon: %s\n", req.Icon))
	}
	if req.Channel != "" {
		yamlConfig.WriteString(fmt.Sprintf("channel: %s\n", req.Channel))
	}

	configMap.Data[serviceKey] = yamlConfig.String()

	_, err = h.clientset.CoreV1().ConfigMaps(h.namespace).Update(ctx, configMap, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	// Update secret
	secret, err := h.clientset.CoreV1().Secrets(h.namespace).Get(ctx, "argocd-notifications-secret", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get secret: %v", err), http.StatusInternalServerError)
		return
	}

	if secret.Data == nil {
		secret.Data = make(map[string][]byte)
	}
	secret.Data[secretKey] = []byte(req.WebhookURL)

	_, err = h.clientset.CoreV1().Secrets(h.namespace).Update(ctx, secret, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update secret: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated", "name": serviceName})
}

func (h *Handler) deleteNotificationService(ctx context.Context, w http.ResponseWriter, r *http.Request, serviceName string) {
	// Get the ConfigMap
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "argocd-notifications-cm", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	// Find the service and determine its type
	var serviceKey string
	var serviceType string
	var serviceConfig string

	// Check all service types
	for _, svcType := range []string{"slack", "webhook", "email"} {
		key := fmt.Sprintf("service.%s.%s", svcType, serviceName)
		if config, exists := configMap.Data[key]; exists {
			serviceKey = key
			serviceType = svcType
			serviceConfig = config
			break
		}
	}

	if serviceKey == "" {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	// Remove from ConfigMap
	delete(configMap.Data, serviceKey)

	_, err = h.clientset.CoreV1().ConfigMaps(h.namespace).Update(ctx, configMap, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update ConfigMap: %v", err), http.StatusInternalServerError)
		h.createAuditEvent(ctx, "admin", "notification.service.delete", "notification", fmt.Sprintf("%s/%s", serviceType, serviceName), "error", r.RemoteAddr, false)
		return
	}

	// Remove from secret based on service type
	secret, err := h.clientset.CoreV1().Secrets(h.namespace).Get(ctx, "argocd-notifications-secret", metav1.GetOptions{})
	if err == nil {
		var secretKey string
		if serviceType == "slack" {
			secretKey = fmt.Sprintf("slack-%s-token", serviceName)
		} else if serviceType == "email" {
			secretKey = fmt.Sprintf("email-%s-password", serviceName)
		}
		if secretKey != "" {
			delete(secret.Data, secretKey)
			h.clientset.CoreV1().Secrets(h.namespace).Update(ctx, secret, metav1.UpdateOptions{})
		}
	}

	// Log successful audit event
	serviceDetails := map[string]interface{}{
		"before": map[string]interface{}{
			"type":   serviceType,
			"name":   serviceName,
			"config": serviceConfig,
		},
	}
	h.createAuditEvent(ctx, "admin", "notification.service.delete", "notification", fmt.Sprintf("%s/%s", serviceType, serviceName), "warning", r.RemoteAddr, true, serviceDetails)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted", "name": serviceName})
}

func (h *Handler) testSlackService(ctx context.Context, w http.ResponseWriter, r *http.Request, serviceName string) {
	var req SlackServiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	if req.WebhookURL == "" {
		http.Error(w, "webhookUrl is required", http.StatusBadRequest)
		return
	}

	// Send test message to Slack
	payload := map[string]interface{}{
		"text": "🧪 Test notification from Cased CD",
	}
	if req.Username != "" {
		payload["username"] = req.Username
	}
	if req.Icon != "" {
		payload["icon_emoji"] = req.Icon
	}
	if req.Channel != "" {
		payload["channel"] = req.Channel
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to marshal payload: %v", err), http.StatusInternalServerError)
		return
	}

	resp, err := http.Post(req.WebhookURL, "application/json", strings.NewReader(string(payloadBytes)))
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to send test notification: %v", err), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Slack returned error: %s", resp.Status), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Test notification sent"})
}

// Webhook service handlers

func (h *Handler) createWebhookService(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	var req WebhookServiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Name == "" || req.URL == "" {
		http.Error(w, "name and url are required", http.StatusBadRequest)
		return
	}

	// Get the ConfigMap
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "argocd-notifications-cm", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	// Check if service already exists
	serviceKey := fmt.Sprintf("service.webhook.%s", req.Name)
	if _, exists := configMap.Data[serviceKey]; exists {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{
			"error":   "Service already exists",
			"message": fmt.Sprintf("A webhook service named '%s' already exists. Please choose a different name or delete the existing service first.", req.Name),
		})
		return
	}

	// Build YAML config for webhook service
	yamlConfig := fmt.Sprintf("url: %s\n", req.URL)

	// Update ConfigMap
	if configMap.Data == nil {
		configMap.Data = make(map[string]string)
	}
	configMap.Data[serviceKey] = yamlConfig

	_, err = h.clientset.CoreV1().ConfigMaps(h.namespace).Update(ctx, configMap, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update ConfigMap: %v", err), http.StatusInternalServerError)
		h.createAuditEvent(ctx, "admin", "notification.service.create", "notification", fmt.Sprintf("webhook/%s", req.Name), "error", r.RemoteAddr, false)
		return
	}

	// Log successful audit event
	serviceDetails := map[string]interface{}{
		"after": map[string]interface{}{
			"type": "webhook",
			"name": req.Name,
			"url":  req.URL,
		},
	}
	h.createAuditEvent(ctx, "admin", "notification.service.create", "notification", fmt.Sprintf("webhook/%s", req.Name), "info", r.RemoteAddr, true, serviceDetails)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "created", "name": req.Name})
}

func (h *Handler) updateWebhookService(ctx context.Context, w http.ResponseWriter, r *http.Request, serviceName string) {
	var req WebhookServiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.URL == "" {
		http.Error(w, "url is required", http.StatusBadRequest)
		return
	}

	// Get the ConfigMap
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "argocd-notifications-cm", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	serviceKey := fmt.Sprintf("service.webhook.%s", serviceName)
	if _, exists := configMap.Data[serviceKey]; !exists {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	// Build YAML config
	yamlConfig := fmt.Sprintf("url: %s\n", req.URL)
	configMap.Data[serviceKey] = yamlConfig

	_, err = h.clientset.CoreV1().ConfigMaps(h.namespace).Update(ctx, configMap, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated", "name": serviceName})
}

func (h *Handler) testWebhookService(ctx context.Context, w http.ResponseWriter, r *http.Request, serviceName string) {
	var req WebhookServiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	if req.URL == "" {
		http.Error(w, "url is required", http.StatusBadRequest)
		return
	}

	// Send test webhook with sample payload
	payload := map[string]interface{}{
		"app": map[string]string{
			"name":      "test-app",
			"namespace": "default",
		},
		"status": map[string]string{
			"health": "Healthy",
			"sync":   "Synced",
		},
		"revision": "abc123def456",
		"message":  "This is a test webhook from Cased CD",
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to marshal payload: %v", err), http.StatusInternalServerError)
		return
	}

	resp, err := http.Post(req.URL, "application/json", strings.NewReader(string(payloadBytes)))
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to send test webhook: %v", err), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		http.Error(w, fmt.Sprintf("Webhook endpoint returned error: %s", resp.Status), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": fmt.Sprintf("Test webhook sent successfully (%s)", resp.Status)})
}

// Email service handlers

func (h *Handler) createEmailService(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	var req EmailServiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Name == "" || req.SMTPHost == "" || req.SMTPPort == "" || req.Username == "" || req.Password == "" || req.From == "" {
		http.Error(w, "name, smtpHost, smtpPort, username, password, and from are required", http.StatusBadRequest)
		return
	}

	// Get the ConfigMap
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "argocd-notifications-cm", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	// Check if service already exists
	serviceKey := fmt.Sprintf("service.email.%s", req.Name)
	if _, exists := configMap.Data[serviceKey]; exists {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{
			"error":   "Service already exists",
			"message": fmt.Sprintf("An email service named '%s' already exists. Please choose a different name or delete the existing service first.", req.Name),
		})
		return
	}

	// Build YAML config for email service
	var yamlConfig strings.Builder
	secretKey := fmt.Sprintf("email-%s-password", req.Name)
	yamlConfig.WriteString(fmt.Sprintf("host: %s\n", req.SMTPHost))
	yamlConfig.WriteString(fmt.Sprintf("port: %s\n", req.SMTPPort))
	yamlConfig.WriteString(fmt.Sprintf("username: %s\n", req.Username))
	yamlConfig.WriteString(fmt.Sprintf("password: $%s\n", secretKey))
	yamlConfig.WriteString(fmt.Sprintf("from: %s\n", req.From))
	if req.To != "" {
		yamlConfig.WriteString(fmt.Sprintf("to: %s\n", req.To))
	}

	// Update ConfigMap
	if configMap.Data == nil {
		configMap.Data = make(map[string]string)
	}
	configMap.Data[serviceKey] = yamlConfig.String()

	_, err = h.clientset.CoreV1().ConfigMaps(h.namespace).Update(ctx, configMap, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	// Store password in secret
	secret, err := h.clientset.CoreV1().Secrets(h.namespace).Get(ctx, "argocd-notifications-secret", metav1.GetOptions{})
	if err != nil {
		// Create secret if it doesn't exist
		secret = &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "argocd-notifications-secret",
				Namespace: h.namespace,
			},
			Data: make(map[string][]byte),
		}
	}

	if secret.Data == nil {
		secret.Data = make(map[string][]byte)
	}
	secret.Data[secretKey] = []byte(req.Password)

	if secret.CreationTimestamp.IsZero() {
		_, err = h.clientset.CoreV1().Secrets(h.namespace).Create(ctx, secret, metav1.CreateOptions{})
	} else {
		_, err = h.clientset.CoreV1().Secrets(h.namespace).Update(ctx, secret, metav1.UpdateOptions{})
	}

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update secret: %v", err), http.StatusInternalServerError)
		h.createAuditEvent(ctx, "admin", "notification.service.create", "notification", fmt.Sprintf("email/%s", req.Name), "error", r.RemoteAddr, false)
		return
	}

	// Log successful audit event
	serviceDetails := map[string]interface{}{
		"after": map[string]interface{}{
			"type":     "email",
			"name":     req.Name,
			"smtpHost": req.SMTPHost,
			"smtpPort": req.SMTPPort,
			"username": req.Username,
			"from":     req.From,
			"to":       req.To,
		},
	}
	h.createAuditEvent(ctx, "admin", "notification.service.create", "notification", fmt.Sprintf("email/%s", req.Name), "info", r.RemoteAddr, true, serviceDetails)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "created", "name": req.Name})
}

func (h *Handler) updateEmailService(ctx context.Context, w http.ResponseWriter, r *http.Request, serviceName string) {
	var req EmailServiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.SMTPHost == "" || req.SMTPPort == "" || req.Username == "" || req.Password == "" || req.From == "" {
		http.Error(w, "smtpHost, smtpPort, username, password, and from are required", http.StatusBadRequest)
		return
	}

	// Get the ConfigMap
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "argocd-notifications-cm", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	serviceKey := fmt.Sprintf("service.email.%s", serviceName)
	if _, exists := configMap.Data[serviceKey]; !exists {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	// Build YAML config
	var yamlConfig strings.Builder
	secretKey := fmt.Sprintf("email-%s-password", serviceName)
	yamlConfig.WriteString(fmt.Sprintf("host: %s\n", req.SMTPHost))
	yamlConfig.WriteString(fmt.Sprintf("port: %s\n", req.SMTPPort))
	yamlConfig.WriteString(fmt.Sprintf("username: %s\n", req.Username))
	yamlConfig.WriteString(fmt.Sprintf("password: $%s\n", secretKey))
	yamlConfig.WriteString(fmt.Sprintf("from: %s\n", req.From))
	if req.To != "" {
		yamlConfig.WriteString(fmt.Sprintf("to: %s\n", req.To))
	}

	configMap.Data[serviceKey] = yamlConfig.String()

	_, err = h.clientset.CoreV1().ConfigMaps(h.namespace).Update(ctx, configMap, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update ConfigMap: %v", err), http.StatusInternalServerError)
		return
	}

	// Update secret
	secret, err := h.clientset.CoreV1().Secrets(h.namespace).Get(ctx, "argocd-notifications-secret", metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get secret: %v", err), http.StatusInternalServerError)
		return
	}

	if secret.Data == nil {
		secret.Data = make(map[string][]byte)
	}
	secret.Data[secretKey] = []byte(req.Password)

	_, err = h.clientset.CoreV1().Secrets(h.namespace).Update(ctx, secret, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update secret: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated", "name": serviceName})
}

func (h *Handler) testEmailService(ctx context.Context, w http.ResponseWriter, r *http.Request, serviceName string) {
	var req EmailServiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	if req.SMTPHost == "" || req.SMTPPort == "" || req.Username == "" || req.Password == "" || req.From == "" {
		http.Error(w, "smtpHost, smtpPort, username, password, and from are required", http.StatusBadRequest)
		return
	}

	// Test SMTP connection by attempting to authenticate
	addr := fmt.Sprintf("%s:%s", req.SMTPHost, req.SMTPPort)

	conn, err := smtp.Dial(addr)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to connect to SMTP server: %v", err), http.StatusBadGateway)
		return
	}
	defer conn.Close()

	// Send EHLO/HELO
	if err = conn.Hello("localhost"); err != nil {
		http.Error(w, fmt.Sprintf("SMTP HELLO failed: %v", err), http.StatusBadGateway)
		return
	}

	// Start TLS if supported (port 587 typically uses STARTTLS)
	if ok, _ := conn.Extension("STARTTLS"); ok {
		config := &tls.Config{ServerName: req.SMTPHost}
		if err = conn.StartTLS(config); err != nil {
			http.Error(w, fmt.Sprintf("STARTTLS failed: %v", err), http.StatusBadGateway)
			return
		}
	}

	// Test authentication
	auth := smtp.PlainAuth("", req.Username, req.Password, req.SMTPHost)
	if err = conn.Auth(auth); err != nil {
		http.Error(w, fmt.Sprintf("SMTP authentication failed: %v", err), http.StatusUnauthorized)
		return
	}

	// Optionally send a test email if 'to' is provided
	if req.To != "" {
		if err = conn.Mail(req.From); err != nil {
			http.Error(w, fmt.Sprintf("MAIL FROM failed: %v", err), http.StatusBadGateway)
			return
		}
		if err = conn.Rcpt(req.To); err != nil {
			http.Error(w, fmt.Sprintf("RCPT TO failed: %v", err), http.StatusBadGateway)
			return
		}

		// Send test message
		wc, err := conn.Data()
		if err != nil {
			http.Error(w, fmt.Sprintf("DATA command failed: %v", err), http.StatusBadGateway)
			return
		}
		defer wc.Close()

		message := fmt.Sprintf("From: %s\r\n"+
			"To: %s\r\n"+
			"Subject: Test Email from Cased Deploy\r\n"+
			"\r\n"+
			"This is a test email to verify your SMTP configuration.\r\n"+
			"\r\n"+
			"If you received this, your email notifications are configured correctly!\r\n"+
			"\r\n"+
			"--\r\n"+
			"Cased Deploy Notifications\r\n",
			req.From, req.To)

		if _, err = fmt.Fprintf(wc, message); err != nil {
			http.Error(w, fmt.Sprintf("Failed to write message: %v", err), http.StatusBadGateway)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	successMessage := "SMTP connection and authentication successful"
	if req.To != "" {
		successMessage = "Test email sent successfully"
	}
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": successMessage,
	})
}

func (h *Handler) getAuditEvents(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	// Get the cased-audit ConfigMap (stores audit events as JSON array)
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "cased-audit", metav1.GetOptions{})
	if err != nil {
		// If ConfigMap doesn't exist, return empty list
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AuditEventList{
			Items: []AuditEvent{},
		})
		return
	}

	// Parse events from ConfigMap data
	eventsJSON := configMap.Data["events"]
	if eventsJSON == "" {
		// No events yet
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AuditEventList{
			Items: []AuditEvent{},
		})
		return
	}

	var events []AuditEvent
	if err := json.Unmarshal([]byte(eventsJSON), &events); err != nil {
		http.Error(w, fmt.Sprintf("Failed to parse audit events: %v", err), http.StatusInternalServerError)
		return
	}

	// Apply query parameter filters
	queryParams := r.URL.Query()
	filteredEvents := events

	// Filter by user
	if user := queryParams.Get("user"); user != "" {
		filtered := []AuditEvent{}
		for _, event := range filteredEvents {
			if event.User == user {
				filtered = append(filtered, event)
			}
		}
		filteredEvents = filtered
	}

	// Filter by action
	if action := queryParams.Get("action"); action != "" {
		filtered := []AuditEvent{}
		for _, event := range filteredEvents {
			if event.Action == action {
				filtered = append(filtered, event)
			}
		}
		filteredEvents = filtered
	}

	// Filter by resource type
	if resourceType := queryParams.Get("resourceType"); resourceType != "" {
		filtered := []AuditEvent{}
		for _, event := range filteredEvents {
			if event.ResourceType == resourceType {
				filtered = append(filtered, event)
			}
		}
		filteredEvents = filtered
	}

	// Filter by severity
	if severity := queryParams.Get("severity"); severity != "" {
		filtered := []AuditEvent{}
		for _, event := range filteredEvents {
			if event.Severity == severity {
				filtered = append(filtered, event)
			}
		}
		filteredEvents = filtered
	}

	// Filter by success
	if successStr := queryParams.Get("success"); successStr != "" {
		success := successStr == "true"
		filtered := []AuditEvent{}
		for _, event := range filteredEvents {
			if event.Success == success {
				filtered = append(filtered, event)
			}
		}
		filteredEvents = filtered
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuditEventList{
		Items: filteredEvents,
		Metadata: map[string]interface{}{
			"totalCount": len(filteredEvents),
		},
	})
}

// Helper function to create an audit event
func (h *Handler) createAuditEvent(ctx context.Context, user, action, resourceType, resourceName, severity, ipAddress string, success bool, details ...map[string]interface{}) error {
	// Generate event ID using timestamp + random component
	eventID := fmt.Sprintf("audit-%d", time.Now().UnixNano())

	// Create audit event
	detailsMap := make(map[string]interface{})
	if len(details) > 0 && details[0] != nil {
		detailsMap = details[0]
	}

	event := AuditEvent{
		ID:           eventID,
		Timestamp:    time.Now().Format(time.RFC3339),
		User:         user,
		Action:       action,
		ResourceType: resourceType,
		ResourceName: resourceName,
		Severity:     severity,
		IPAddress:    ipAddress,
		Success:      success,
		Details:      detailsMap,
	}

	// Get existing events from ConfigMap
	configMap, err := h.clientset.CoreV1().ConfigMaps(h.namespace).Get(ctx, "cased-audit", metav1.GetOptions{})
	var events []AuditEvent

	if err != nil {
		// ConfigMap doesn't exist, create it
		events = []AuditEvent{event}
		eventsJSON, _ := json.Marshal(events)

		configMap = &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "cased-audit",
				Namespace: h.namespace,
			},
			Data: map[string]string{
				"events": string(eventsJSON),
			},
		}

		_, err = h.clientset.CoreV1().ConfigMaps(h.namespace).Create(ctx, configMap, metav1.CreateOptions{})
		return err
	}

	// Parse existing events
	if eventsJSON := configMap.Data["events"]; eventsJSON != "" {
		json.Unmarshal([]byte(eventsJSON), &events)
	}

	// Prepend new event to keep newest first
	events = append([]AuditEvent{event}, events...)

	// Keep only last 1000 events to prevent unbounded growth
	if len(events) > 1000 {
		events = events[:1000]
	}

	// Save back to ConfigMap
	eventsJSON, _ := json.Marshal(events)
	configMap.Data["events"] = string(eventsJSON)

	_, err = h.clientset.CoreV1().ConfigMaps(h.namespace).Update(ctx, configMap, metav1.UpdateOptions{})
	return err
}
