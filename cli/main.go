package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/rest"
)

const (
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorPurple = "\033[35m"
	colorCyan   = "\033[36m"
	colorWhite  = "\033[37m"
	bold        = "\033[1m"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "context":
		handleContext()
	case "access":
		handleAccess()
	case "doctor":
		handleDoctor()
	case "version":
		handleVersion()
	case "help", "-h", "--help":
		printUsage()
	default:
		fmt.Printf("%sError:%s Unknown command '%s'\n\n", colorRed, colorReset, command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Printf(`%s%scased-cd%s - Cased CD CLI

%sUSAGE:%s
  cased-cd <command>

%sCOMMANDS:%s
  %scontext%s    Show current Kubernetes context and cluster info
  %saccess%s     Show how to access Cased CD (URL, port-forward, ingress)
  %sdoctor%s     Check Cased CD installation health
  %sversion%s    Show Cased CD component versions
  %shelp%s       Show this help message

%sEXAMPLES:%s
  # Check what cluster you're pointing at
  cased-cd context

  # Verify installation is healthy
  cased-cd doctor

  # Get access URL
  cased-cd access

`, bold+colorCyan, bold, colorReset,
		bold, colorReset,
		bold, colorReset,
		colorGreen, colorReset,
		colorGreen, colorReset,
		colorGreen, colorReset,
		colorGreen, colorReset,
		colorGreen, colorReset,
		bold, colorReset)
}

func handleContext() {
	fmt.Printf("\n%s%s🔍 Kubernetes Context%s\n\n", bold, colorCyan, colorReset)

	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	configOverrides := &clientcmd.ConfigOverrides{}
	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)

	rawConfig, err := kubeConfig.RawConfig()
	if err != nil {
		fmt.Printf("%s✗%s Failed to load kubeconfig: %v\n", colorRed, colorReset, err)
		os.Exit(1)
	}

	currentContext := rawConfig.CurrentContext
	if currentContext == "" {
		fmt.Printf("%s✗%s No current context set\n", colorRed, colorReset)
		os.Exit(1)
	}

	context := rawConfig.Contexts[currentContext]
	cluster := rawConfig.Clusters[context.Cluster]

	fmt.Printf("  %sContext:%s       %s\n", bold, colorReset, currentContext)
	fmt.Printf("  %sCluster:%s       %s\n", bold, colorReset, context.Cluster)
	fmt.Printf("  %sServer:%s        %s\n", bold, colorReset, cluster.Server)
	fmt.Printf("  %sNamespace:%s     %s\n", bold, colorReset, context.Namespace)
	fmt.Printf("  %sUser:%s          %s\n\n", bold, colorReset, context.AuthInfo)

	// Try to get cluster info
	config, err := kubeConfig.ClientConfig()
	if err == nil {
		clientset, err := kubernetes.NewForConfig(config)
		if err == nil {
			serverVersion, err := clientset.Discovery().ServerVersion()
			if err == nil {
				fmt.Printf("  %sKubernetes:%s    v%s\n", bold, colorReset, serverVersion.GitVersion)
			}
		}
	}

	fmt.Println()
}

func handleAccess() {
	fmt.Printf("\n%s%s🌐 Access Cased CD%s\n\n", bold, colorCyan, colorReset)

	config, clientset, namespace := getKubeClient()
	if clientset == nil {
		return
	}

	ctx := context.Background()

	// Check for Service
	service, err := clientset.CoreV1().Services(namespace).Get(ctx, "cased-cd", metav1.GetOptions{})
	if err != nil {
		fmt.Printf("%s✗%s Cased CD service not found in namespace '%s'\n", colorRed, colorReset, namespace)
		fmt.Printf("  Run %scased-cd doctor%s to check installation\n\n", colorCyan, colorReset)
		return
	}

	// Check for Ingress
	ingresses, err := clientset.NetworkingV1().Ingresses(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/name=cased-cd",
	})

	if err == nil && len(ingresses.Items) > 0 {
		fmt.Printf("%s✓%s Ingress configured:\n\n", colorGreen, colorReset)
		for _, ing := range ingresses.Items {
			for _, rule := range ing.Spec.Rules {
				protocol := "http"
				if ing.Spec.TLS != nil && len(ing.Spec.TLS) > 0 {
					protocol = "https"
				}
				fmt.Printf("  %s%s://%s%s\n", bold, protocol, rule.Host, colorReset)
			}
		}
		fmt.Println()
		return
	}

	// Check service type
	if service.Spec.Type == "LoadBalancer" {
		fmt.Printf("%s✓%s LoadBalancer service:\n\n", colorGreen, colorReset)
		if len(service.Status.LoadBalancer.Ingress) > 0 {
			for _, ing := range service.Status.LoadBalancer.Ingress {
				if ing.IP != "" {
					fmt.Printf("  http://%s\n", ing.IP)
				} else if ing.Hostname != "" {
					fmt.Printf("  http://%s\n", ing.Hostname)
				}
			}
		} else {
			fmt.Printf("  %sPending...%s (LoadBalancer IP not yet assigned)\n", colorYellow, colorReset)
		}
		fmt.Println()
		return
	}

	// Default: port-forward instructions
	fmt.Printf("%sℹ️  No external access configured%s\n\n", colorYellow, colorReset)
	fmt.Printf("Use port-forward to access:\n\n")
	
	// Check if we're in-cluster
	if isInCluster(config) {
		fmt.Printf("  %s# From inside the cluster:%s\n", colorPurple, colorReset)
		fmt.Printf("  http://cased-cd.%s.svc.cluster.local\n\n", namespace)
	}
	
	fmt.Printf("  %s# From your local machine:%s\n", colorPurple, colorReset)
	fmt.Printf("  kubectl port-forward -n %s svc/cased-cd 8080:80\n", namespace)
	fmt.Printf("  %s# Then open:%s http://localhost:8080\n\n", colorPurple, colorReset)
}

func handleDoctor() {
	fmt.Printf("\n%s%s🩺 Cased CD Health Check%s\n\n", bold, colorCyan, colorReset)

	_, clientset, namespace := getKubeClient()
	if clientset == nil {
		return
	}

	ctx := context.Background()
	allHealthy := true

	// Check Cased CD frontend deployment
	fmt.Printf("%sChecking Cased CD frontend...%s\n", bold, colorReset)
	frontendDep, err := clientset.AppsV1().Deployments(namespace).Get(ctx, "cased-cd", metav1.GetOptions{})
	if err != nil {
		fmt.Printf("  %s✗%s Deployment not found\n", colorRed, colorReset)
		allHealthy = false
	} else {
		if frontendDep.Status.ReadyReplicas == frontendDep.Status.Replicas && frontendDep.Status.Replicas > 0 {
			fmt.Printf("  %s✓%s Deployment healthy (%d/%d replicas ready)\n", colorGreen, colorReset, frontendDep.Status.ReadyReplicas, frontendDep.Status.Replicas)
		} else {
			fmt.Printf("  %s✗%s Deployment unhealthy (%d/%d replicas ready)\n", colorRed, colorReset, frontendDep.Status.ReadyReplicas, frontendDep.Status.Replicas)
			allHealthy = false
		}
	}

	// Check Enterprise backend (optional)
	fmt.Printf("\n%sChecking Enterprise backend...%s\n", bold, colorReset)
	enterpriseDep, err := clientset.AppsV1().Deployments(namespace).Get(ctx, "cased-cd-enterprise", metav1.GetOptions{})
	if err != nil {
		fmt.Printf("  %sℹ%s  Enterprise backend not installed (optional)\n", colorYellow, colorReset)
	} else {
		if enterpriseDep.Status.ReadyReplicas == enterpriseDep.Status.Replicas && enterpriseDep.Status.Replicas > 0 {
			fmt.Printf("  %s✓%s Deployment healthy (%d/%d replicas ready)\n", colorGreen, colorReset, enterpriseDep.Status.ReadyReplicas, enterpriseDep.Status.Replicas)
		} else {
			fmt.Printf("  %s✗%s Deployment unhealthy (%d/%d replicas ready)\n", colorRed, colorReset, enterpriseDep.Status.ReadyReplicas, enterpriseDep.Status.Replicas)
			allHealthy = false
		}

		// Check PVC for audit logs
		fmt.Printf("\n%sChecking audit log storage...%s\n", bold, colorReset)
		pvc, err := clientset.CoreV1().PersistentVolumeClaims(namespace).Get(ctx, "cased-cd-enterprise-audit", metav1.GetOptions{})
		if err != nil {
			fmt.Printf("  %s✗%s PVC not found\n", colorRed, colorReset)
			allHealthy = false
		} else {
			if pvc.Status.Phase == "Bound" {
				capacity := pvc.Status.Capacity.Storage().String()
				fmt.Printf("  %s✓%s PVC bound (%s)\n", colorGreen, colorReset, capacity)
			} else {
				fmt.Printf("  %s✗%s PVC not bound (status: %s)\n", colorRed, colorReset, pvc.Status.Phase)
				allHealthy = false
			}
		}
	}

	// Check Service
	fmt.Printf("\n%sChecking service...%s\n", bold, colorReset)
	_, err = clientset.CoreV1().Services(namespace).Get(ctx, "cased-cd", metav1.GetOptions{})
	if err != nil {
		fmt.Printf("  %s✗%s Service not found\n", colorRed, colorReset)
		allHealthy = false
	} else {
		fmt.Printf("  %s✓%s Service exists\n", colorGreen, colorReset)
	}

	// Check ArgoCD connectivity
	fmt.Printf("\n%sChecking ArgoCD...%s\n", bold, colorReset)
	_, err = clientset.CoreV1().Services("argocd").Get(ctx, "argocd-server", metav1.GetOptions{})
	if err != nil {
		fmt.Printf("  %s✗%s ArgoCD server not found in 'argocd' namespace\n", colorRed, colorReset)
		allHealthy = false
	} else {
		fmt.Printf("  %s✓%s ArgoCD server found\n", colorGreen, colorReset)
	}

	// Summary
	fmt.Println()
	if allHealthy {
		fmt.Printf("%s✓ All checks passed!%s\n\n", colorGreen+bold, colorReset)
	} else {
		fmt.Printf("%s✗ Some checks failed%s\n", colorRed+bold, colorReset)
		fmt.Printf("  Review the errors above and fix any issues.\n\n")
		os.Exit(1)
	}
}

func handleVersion() {
	fmt.Printf("\n%s%s📦 Cased CD Versions%s\n\n", bold, colorCyan, colorReset)

	_, clientset, namespace := getKubeClient()
	if clientset == nil {
		return
	}

	ctx := context.Background()

	// Get frontend version
	frontendDep, err := clientset.AppsV1().Deployments(namespace).Get(ctx, "cased-cd", metav1.GetOptions{})
	if err == nil {
		image := ""
		if len(frontendDep.Spec.Template.Spec.Containers) > 0 {
			image = frontendDep.Spec.Template.Spec.Containers[0].Image
		}
		fmt.Printf("  %sFrontend:%s     %s\n", bold, colorReset, image)
	}

	// Get enterprise version
	enterpriseDep, err := clientset.AppsV1().Deployments(namespace).Get(ctx, "cased-cd-enterprise", metav1.GetOptions{})
	if err == nil {
		image := ""
		if len(enterpriseDep.Spec.Template.Spec.Containers) > 0 {
			image = enterpriseDep.Spec.Template.Spec.Containers[0].Image
		}
		fmt.Printf("  %sEnterprise:%s    %s\n", bold, colorReset, image)
	}

	// Get chart version (from labels)
	if frontendDep != nil {
		chartVersion := frontendDep.Labels["helm.sh/chart"]
		if chartVersion != "" {
			fmt.Printf("  %sHelm Chart:%s   %s\n", bold, colorReset, chartVersion)
		}
	}

	fmt.Println()
}

func getKubeClient() (*rest.Config, *kubernetes.Clientset, string) {
	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	configOverrides := &clientcmd.ConfigOverrides{}
	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)

	namespace, _, err := kubeConfig.Namespace()
	if err != nil || namespace == "" {
		namespace = "argocd"
	}

	config, err := kubeConfig.ClientConfig()
	if err != nil {
		fmt.Printf("%s✗%s Failed to load kubeconfig: %v\n", colorRed, colorReset, err)
		return nil, nil, namespace
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		fmt.Printf("%s✗%s Failed to create Kubernetes client: %v\n", colorRed, colorReset, err)
		return config, nil, namespace
	}

	return config, clientset, namespace
}

func isInCluster(config *rest.Config) bool {
	// Check if running in-cluster by looking for service account token
	tokenFile := "/var/run/secrets/kubernetes.io/serviceaccount/token"
	if _, err := os.Stat(tokenFile); err == nil {
		return true
	}
	
	// Check if config looks like in-cluster config
	if config != nil && strings.HasPrefix(config.Host, "https://kubernetes.default") {
		return true
	}
	
	return false
}
