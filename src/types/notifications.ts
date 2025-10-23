// ArgoCD Notifications types

export interface NotificationService {
  name: string
  type: 'slack' | 'email' | 'webhook' | 'teams' | 'pagerduty' | 'github' | 'other'
  config: string // YAML configuration
}

export interface NotificationTemplate {
  name: string
  config: string // YAML configuration
}

export interface NotificationTrigger {
  name: string
  config: string // YAML configuration (when condition + send targets)
}

export interface NotificationsConfig {
  services: NotificationService[]
  templates: NotificationTemplate[]
  triggers: NotificationTrigger[]
}

export interface ApplicationSubscription {
  applicationName: string
  triggerName: string
  serviceName: string
}

// Raw Kubernetes ConfigMap structure
export interface NotificationsConfigMap {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    namespace: string
    resourceVersion?: string
    uid?: string
  }
  data: Record<string, string>
}
