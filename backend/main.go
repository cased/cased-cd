package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"

	"golang.org/x/crypto/bcrypt"
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

type License struct {
	Tier     string   `json:"tier"`
	Features []string `json:"features"`
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

	http.HandleFunc("/api/v1/settings/rbac", handler.handleRBAC)
	http.HandleFunc("/api/v1/license", handler.handleLicense)
	http.HandleFunc("/api/v1/settings/accounts", handler.handleAccount)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

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
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

func (h *Handler) handleLicense(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Return enterprise license for local development
	license := License{
		Tier:     "enterprise",
		Features: []string{"rbac", "sso", "audit-logs"},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(license)
}

func (h *Handler) handleAccount(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	ctx := context.Background()

	switch r.Method {
	case "POST":
		h.createAccount(ctx, w, r)
	case "DELETE":
		h.deleteAccount(ctx, w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
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

	// Check if account exists
	accountKey := fmt.Sprintf("accounts.%s", accountName)
	if _, exists := configMap.Data[accountKey]; !exists {
		http.Error(w, "Account not found", http.StatusNotFound)
		return
	}

	// Remove account fields from ConfigMap
	delete(configMap.Data, accountKey)
	enabledKey := fmt.Sprintf("accounts.%s.enabled", accountName)
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

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"name":    accountName,
		"message": "Account deleted successfully",
	})
}
