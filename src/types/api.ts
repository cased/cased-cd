// ArgoCD API Types

// Health Status
export type HealthStatus = 'Healthy' | 'Progressing' | 'Degraded' | 'Suspended' | 'Missing' | 'Unknown'

// Sync Status
export type SyncStatus = 'Synced' | 'OutOfSync' | 'Unknown'

// Application
export interface Application {
  metadata: {
    name: string
    namespace: string
    uid?: string
    resourceVersion?: string
    creationTimestamp?: string
    labels?: Record<string, string>
    annotations?: Record<string, string>
  }
  spec: ApplicationSpec
  status?: ApplicationStatus
}

export interface ApplicationSpec {
  source: ApplicationSource
  destination: ApplicationDestination
  project: string
  syncPolicy?: SyncPolicy
}

export interface ApplicationSource {
  repoURL: string
  path?: string
  targetRevision?: string
  helm?: HelmSource
  kustomize?: KustomizeSource
  chart?: string
}

export interface HelmSource {
  valueFiles?: string[]
  values?: string
  parameters?: Array<{ name: string; value: string }>
}

export interface KustomizeSource {
  namePrefix?: string
  nameSuffix?: string
  images?: string[]
}

export interface ApplicationDestination {
  server?: string
  namespace?: string
  name?: string
}

export interface SyncPolicy {
  automated?: {
    prune?: boolean
    selfHeal?: boolean
    allowEmpty?: boolean
  }
  syncOptions?: string[]
  retry?: {
    limit?: number
    backoff?: {
      duration?: string
      factor?: number
      maxDuration?: string
    }
  }
}

export interface ApplicationStatus {
  health?: {
    status: HealthStatus
    message?: string
  }
  sync?: {
    status: SyncStatus
    revision?: string
    comparedTo?: {
      source: ApplicationSource
      destination: ApplicationDestination
    }
  }
  operationState?: OperationState
  reconciledAt?: string
  resources?: ResourceStatus[]
  summary?: {
    externalURLs?: string[]
    images?: string[]
  }
  history?: RevisionHistory[]
}

export interface ResourceStatus {
  group?: string
  kind: string
  namespace?: string
  name: string
  version?: string
  status?: SyncStatus
  health?: {
    status: HealthStatus
    message?: string
  }
}

export interface OperationState {
  operation?: {
    sync?: {
      revision?: string
      prune?: boolean
      syncStrategy?: {
        hook?: Record<string, unknown>
        apply?: Record<string, unknown>
      }
    }
  }
  phase: 'Running' | 'Failed' | 'Error' | 'Succeeded' | 'Terminating'
  message?: string
  startedAt?: string
  finishedAt?: string
}

// Application List Response
export interface ApplicationList {
  items: Application[]
  metadata?: {
    continue?: string
    remainingItemCount?: number
    resourceVersion?: string
  }
}

// Repository
export interface Repository {
  repo: string
  username?: string
  password?: string
  sshPrivateKey?: string
  insecure?: boolean
  enableLfs?: boolean
  enableOCI?: boolean
  type?: 'git' | 'helm' | 'oci'
  name?: string
  project?: string
  connectionState?: {
    status: 'Successful' | 'Failed'
    message?: string
    attemptedAt?: string
  }
}

// Repository List Response
export interface RepositoryList {
  items: Repository[]
  metadata?: {
    continue?: string
    remainingItemCount?: number
    resourceVersion?: string
  }
}

// Cluster
export interface Cluster {
  name: string
  server: string
  config: {
    username?: string
    password?: string
    bearerToken?: string
    tlsClientConfig?: {
      insecure?: boolean
      caData?: string
      certData?: string
      keyData?: string
    }
  }
  connectionState?: {
    status: 'Successful' | 'Failed'
    message?: string
    attemptedAt?: string
  }
  info?: {
    serverVersion?: string
    applicationsCount?: number
    cacheInfo?: {
      resourcesCount?: number
      apisCount?: number
    }
  }
}

// Cluster List Response
export interface ClusterList {
  items: Cluster[]
  metadata?: {
    continue?: string
    remainingItemCount?: number
    resourceVersion?: string
  }
}

// Project
export interface Project {
  metadata: {
    name: string
    namespace?: string
    creationTimestamp?: string
  }
  spec: {
    sourceRepos?: string[]
    destinations?: Array<{
      server?: string
      namespace?: string
      name?: string
    }>
    clusterResourceWhitelist?: Array<{
      group?: string
      kind?: string
    }>
    clusterResourceBlacklist?: Array<{
      group?: string
      kind?: string
    }>
    namespaceResourceWhitelist?: Array<{
      group?: string
      kind?: string
    }>
    namespaceResourceBlacklist?: Array<{
      group?: string
      kind?: string
    }>
    roles?: ProjectRole[]
  }
}

export interface ProjectRole {
  name: string
  description?: string
  policies?: string[]
  groups?: string[]
  jwtTokens?: Array<{
    iat: number
    exp?: number
    id?: string
  }>
}

export interface ProjectList {
  items: Project[]
  metadata?: {
    continue?: string
    remainingItemCount?: number
    resourceVersion?: string
  }
}

// User / Account
export interface Account {
  name: string
  enabled: boolean
  capabilities?: string[]
  tokens?: AccountToken[]
}

export interface AccountToken {
  id: string
  issuedAt: number
  expiresAt?: number
}

// Session / Auth
export interface SessionInfo {
  username?: string
  loggedIn: boolean
  iss?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
}

// Version
export interface Version {
  version: string
  buildDate: string
  gitCommit: string
  gitTreeState: string
  goVersion: string
}

// Generic API Response
export interface ApiResponse<T> {
  data: T
  metadata?: Record<string, unknown>
}

// Error Response
export interface ApiError {
  error: string
  code: number
  message: string
}

// Managed Resources (for diff view)
export interface ManagedResource {
  group?: string
  kind: string
  namespace?: string
  name: string
  version?: string
  targetState?: string // YAML manifest from Git
  liveState?: string // YAML manifest from cluster
  predictedLiveState?: string // Predicted state after apply
  normalizedLiveState?: string // Normalized live state
  syncStatus?: SyncStatus
  health?: {
    status: HealthStatus
    message?: string
  }
}

export interface ManagedResourcesResponse {
  items: ManagedResource[]
}

// Application History & Rollback
export interface RevisionHistory {
  id: number
  revision: string
  deployedAt: string
  deployStartedAt?: string
  initiatedBy?: {
    username: string
    automated?: boolean
  }
  source?: ApplicationSource | ApplicationSource[]
  sources?: ApplicationSource[]
  revisions?: string[]
}

export interface RevisionMetadata {
  author?: string
  date: string
  tags?: string[]
  message: string
  signatureInfo?: string
}

export interface RollbackRequest {
  id: number
  prune?: boolean
  dryRun?: boolean
  appNamespace?: string
}

export interface AccountList {
  items: Account[]
}

// Casbin Policy Types
export type PolicyEffect = 'allow' | 'deny'
export type PolicyType = 'p' | 'g' // p = policy, g = group

export interface CasbinPolicy {
  type: PolicyType
  subject: string // user, role, or group
  resource?: string // applications, clusters, etc.
  action?: string // get, create, sync, etc.
  object?: string // project/app pattern, e.g., "*/*, "my-project/*"
  effect?: PolicyEffect
  role?: string // for group assignments (type 'g')
}

export interface RBACConfig {
  policy: string // raw policy.csv content
  policyDefault?: string // default policy
  scopes?: string
}

export interface ParsedRBACConfig {
  policies: CasbinPolicy[]
  defaultPolicy?: string
  raw: string
}

// Permission check request/response
export interface CanIRequest {
  resource: string // applications, clusters, etc.
  action: string // get, sync, delete, etc.
  subresource?: string // project/app, e.g., "my-project/my-app"
}

export interface CanIResponse {
  value: string // "yes" or "no"
}

// Licensing
export type LicenseTier = 'free' | 'enterprise'

export type FeatureFlag = 'rbac' | 'audit' | 'sso' | 'notifications'

export interface License {
  tier: LicenseTier
  features: FeatureFlag[]
  expiresAt?: string // ISO date string
  organization?: string
}
