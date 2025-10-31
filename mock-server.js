import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 8080

app.use(cors())
app.use(express.json())

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Mock session/login endpoint
app.post('/api/v1/session', (req, res) => {
  const { username, password } = req.body

  // Only accept specific demo credentials
  if (username === 'admin' && password === 'demo') {
    res.json({
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcmdvY2QiLCJzdWIiOiJhZG1pbjpsb2dpbiIsImV4cCI6MTczNjMwNzI5OSwibmJmIjoxNzM2MjIwODk5LCJpYXQiOjE3MzYyMjA4OTksImp0aSI6ImRlbW8ifQ.mock-signature'
    })
  } else {
    res.status(401).json({ error: 'Invalid credentials' })
  }
})

// In-memory applications store
let applications = [
      {
        metadata: {
          name: 'guestbook',
          namespace: 'argocd',
        },
        spec: {
          project: 'default',
          source: {
            repoURL: 'https://github.com/argoproj/argocd-example-apps',
            path: 'guestbook',
            targetRevision: 'HEAD',
          },
          destination: {
            server: 'https://kubernetes.default.svc',
            namespace: 'default',
          },
          syncPolicy: {
            automated: null,
          },
        },
        status: {
          sync: {
            status: 'Synced',
          },
          health: {
            status: 'Healthy',
          },
        },
      },
      {
        metadata: {
          name: 'helm-guestbook',
          namespace: 'argocd',
        },
        spec: {
          project: 'default',
          source: {
            repoURL: 'https://github.com/argoproj/argocd-example-apps',
            path: 'helm-guestbook',
            targetRevision: 'HEAD',
          },
          destination: {
            server: 'https://kubernetes.default.svc',
            namespace: 'default',
          },
        },
        status: {
          sync: {
            status: 'OutOfSync',
          },
          health: {
            status: 'Degraded',
          },
        },
      },
]

// Mock applications list endpoint
app.get('/api/v1/applications', (req, res) => {
  res.json({ items: applications })
})

// Mock create application endpoint
app.post('/api/v1/applications', (req, res) => {
  const newApp = {
    ...req.body,
    metadata: {
      ...req.body.metadata,
      namespace: req.body.metadata.namespace || 'argocd',
    },
    status: {
      sync: { status: 'OutOfSync' },
      health: { status: 'Unknown' },
    },
  }
  applications.push(newApp)
  res.status(201).json(newApp)
})

// Mock application detail endpoint
app.get('/api/v1/applications/:name', (req, res) => {
  const { name } = req.params
  const app = applications.find(a => a.metadata.name === name)

  if (app) {
    res.json({
      ...app,
      status: {
        ...app.status,
        resources: [
        {
          kind: 'Service',
          name: 'guestbook-ui',
          namespace: 'default',
          status: 'Synced',
          health: { status: 'Healthy' },
        },
        {
          kind: 'Deployment',
          name: 'guestbook-ui',
          namespace: 'default',
          status: 'Synced',
          health: { status: 'Healthy' },
        },
      ],
        history: [
          {
            id: 3,
            revision: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
            deployedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            deployStartedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 - 30000).toISOString(),
            initiatedBy: {
              username: 'admin',
              automated: false,
            },
          },
          {
            id: 2,
            revision: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1',
            deployedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            deployStartedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 - 45000).toISOString(),
            initiatedBy: {
              username: 'system',
              automated: true,
            },
          },
          {
            id: 1,
            revision: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2',
            deployedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
            deployStartedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 60000).toISOString(),
            initiatedBy: {
              username: 'developer',
              automated: false,
            },
          },
          {
            id: 0,
            revision: 'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3',
            deployedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
            deployStartedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 - 90000).toISOString(),
            initiatedBy: {
              username: 'admin',
              automated: false,
            },
          },
        ],
      },
    })
  } else {
    res.status(404).json({ error: 'Application not found' })
  }
})

// Mock application spec update endpoint
app.put('/api/v1/applications/:name/spec', (req, res) => {
  const { name } = req.params
  const app = applications.find(a => a.metadata.name === name)

  if (app) {
    // Update the spec
    app.spec = req.body

    console.log(`Updated spec for ${name}:`, JSON.stringify(req.body, null, 2))

    res.json(app.spec)
  } else {
    res.status(404).json({ error: 'Application not found' })
  }
})

// Mock resource tree endpoint
app.get('/api/v1/applications/:name/resource-tree', (req, res) => {
  res.json({
    nodes: [
      {
        kind: 'Service',
        name: 'guestbook-ui',
        namespace: 'default',
        status: 'Synced',
        health: { status: 'Healthy' },
        group: '',
        version: 'v1',
        parentRefs: [],
      },
      {
        kind: 'Deployment',
        name: 'guestbook-ui',
        namespace: 'default',
        status: 'Synced',
        health: { status: 'Healthy' },
        group: 'apps',
        version: 'v1',
        parentRefs: [],
      },
      {
        kind: 'ReplicaSet',
        name: 'guestbook-ui-85985d774c',
        namespace: 'default',
        status: 'Synced',
        health: { status: 'Healthy' },
        group: 'apps',
        version: 'v1',
        parentRefs: [{ kind: 'Deployment', name: 'guestbook-ui', namespace: 'default' }],
      },
      {
        kind: 'Pod',
        name: 'guestbook-ui-85985d774c-7nlwl',
        namespace: 'default',
        status: 'Running',
        health: { status: 'Healthy' },
        group: '',
        version: 'v1',
        parentRefs: [{ kind: 'ReplicaSet', name: 'guestbook-ui-85985d774c', namespace: 'default' }],
      },
    ],
  })
})

// Mock sync endpoint
app.post('/api/v1/applications/:name/sync', (req, res) => {
  res.json({ status: 'success' })
})

// Mock rollback endpoint
app.post('/api/v1/applications/:name/rollback', (req, res) => {
  const { name } = req.params
  const { id, prune } = req.body

  console.log(`Rollback request for ${name} to revision ${id}, prune: ${prune}`)

  res.json({
    metadata: {
      name,
      namespace: 'argocd',
    },
    spec: {
      source: {
        repoURL: 'https://github.com/argoproj/argocd-example-apps',
        path: 'guestbook',
        targetRevision: 'HEAD',
      },
      destination: {
        server: 'https://kubernetes.default.svc',
        namespace: 'default',
      },
    },
    status: {
      sync: {
        status: 'OutOfSync',
      },
      health: {
        status: 'Progressing',
      },
      operationState: {
        phase: 'Running',
        message: `Rolling back to revision ${id}...`,
        startedAt: new Date().toISOString(),
      },
    },
  })
})

// Mock application delete endpoint
app.delete('/api/v1/applications/:name', (req, res) => {
  const { name } = req.params
  const { cascade } = req.query

  // Remove from in-memory store
  applications = applications.filter(app => app.metadata.name !== name)

  res.json({
    status: 'success',
    message: `Application ${name} deleted${cascade === 'true' ? ' with cascade' : ''}`
  })
})

// Mock repositories list endpoint
app.get('/api/v1/repositories', (req, res) => {
  res.json({
    items: [
      {
        repo: 'https://github.com/argoproj/argocd-example-apps',
        type: 'git',
        name: 'argocd-example-apps',
        connectionState: {
          status: 'Successful',
          message: 'Successfully connected',
          attemptedAt: new Date().toISOString(),
        },
      },
      {
        repo: 'https://charts.bitnami.com/bitnami',
        type: 'helm',
        name: 'bitnami',
        connectionState: {
          status: 'Successful',
          message: 'Successfully connected',
          attemptedAt: new Date().toISOString(),
        },
      },
      {
        repo: 'https://github.com/cased/cased-apps',
        type: 'git',
        name: 'cased-apps',
        connectionState: {
          status: 'Successful',
          message: 'Successfully connected',
          attemptedAt: new Date().toISOString(),
        },
      },
    ],
  })
})

// Mock repository create endpoint
app.post('/api/v1/repositories', (req, res) => {
  res.json({
    ...req.body,
    connectionState: {
      status: 'Successful',
      message: 'Successfully connected',
      attemptedAt: new Date().toISOString(),
    },
  })
})

// Mock repository delete endpoint
app.delete('/api/v1/repositories/:url', (req, res) => {
  res.json({ status: 'success' })
})

// Mock clusters list endpoint
app.get('/api/v1/clusters', (req, res) => {
  res.json({
    items: [
      {
        name: 'in-cluster',
        server: 'https://kubernetes.default.svc',
        config: {},
        connectionState: {
          status: 'Successful',
          message: 'Successfully connected',
          attemptedAt: new Date().toISOString(),
        },
        info: {
          serverVersion: 'v1.28.3',
          applicationsCount: 12,
          cacheInfo: {
            resourcesCount: 145,
            apisCount: 42,
          },
        },
      },
      {
        name: 'production',
        server: 'https://prod-cluster.example.com',
        config: {},
        connectionState: {
          status: 'Successful',
          message: 'Successfully connected',
          attemptedAt: new Date().toISOString(),
        },
        info: {
          serverVersion: 'v1.29.0',
          applicationsCount: 28,
          cacheInfo: {
            resourcesCount: 342,
            apisCount: 56,
          },
        },
      },
      {
        name: 'staging',
        server: 'https://staging-cluster.example.com',
        config: {},
        connectionState: {
          status: 'Successful',
          message: 'Successfully connected',
          attemptedAt: new Date().toISOString(),
        },
        info: {
          serverVersion: 'v1.28.5',
          applicationsCount: 15,
          cacheInfo: {
            resourcesCount: 198,
            apisCount: 48,
          },
        },
      },
    ],
  })
})

// Mock cluster create endpoint
app.post('/api/v1/clusters', (req, res) => {
  res.json({
    ...req.body,
    connectionState: {
      status: 'Successful',
      message: 'Successfully connected',
      attemptedAt: new Date().toISOString(),
    },
  })
})

// Mock cluster delete endpoint
app.delete('/api/v1/clusters/:server', (req, res) => {
  res.json({ status: 'success' })
})

// In-memory projects store
let projects = [
  {
    metadata: {
      name: 'default',
      namespace: 'argocd',
      creationTimestamp: new Date().toISOString(),
    },
    spec: {
      sourceRepos: ['*'],
      destinations: [
        {
          server: '*',
          namespace: '*',
        },
      ],
    },
  },
  {
    metadata: {
      name: 'production',
      namespace: 'argocd',
      creationTimestamp: new Date().toISOString(),
    },
    spec: {
      sourceRepos: [
        'https://github.com/company/prod-apps',
        'https://charts.bitnami.com/bitnami',
      ],
      destinations: [
        {
          name: 'production',
          namespace: 'prod-*',
        },
      ],
      roles: [
        {
          name: 'deployer',
          description: 'Deployment role',
          policies: ['p, proj:production:deployer, applications, sync, production/*'],
        },
      ],
    },
  },
  {
    metadata: {
      name: 'development',
      namespace: 'argocd',
      creationTimestamp: new Date().toISOString(),
    },
    spec: {
      sourceRepos: ['*'],
      destinations: [
        {
          name: 'staging',
          namespace: 'dev-*',
        },
        {
          name: 'staging',
          namespace: 'test-*',
        },
      ],
    },
  },
]

// Mock projects list endpoint
app.get('/api/v1/projects', (req, res) => {
  res.json({ items: projects })
})

// Mock project detail endpoint
app.get('/api/v1/projects/:name', (req, res) => {
  const { name } = req.params
  const project = projects.find(p => p.metadata.name === name)

  if (project) {
    res.json(project)
  } else {
    res.status(404).json({ error: 'Project not found' })
  }
})

// Mock project create endpoint
app.post('/api/v1/projects', (req, res) => {
  const newProject = {
    ...req.body,
    metadata: {
      ...req.body.metadata,
      namespace: req.body.metadata.namespace || 'argocd',
      creationTimestamp: new Date().toISOString(),
    },
  }
  projects.push(newProject)
  res.status(201).json(newProject)
})

// Mock project update endpoint
app.put('/api/v1/projects/:name', (req, res) => {
  const { name } = req.params
  const index = projects.findIndex(p => p.metadata.name === name)

  if (index !== -1) {
    projects[index] = {
      ...projects[index],
      ...req.body,
      metadata: {
        ...projects[index].metadata,
        ...req.body.metadata,
      },
    }
    res.json(projects[index])
  } else {
    res.status(404).json({ error: 'Project not found' })
  }
})

// Mock project delete endpoint
app.delete('/api/v1/projects/:name', (req, res) => {
  const { name } = req.params

  // Don't allow deleting the default project
  if (name === 'default') {
    res.status(400).json({ error: 'Cannot delete the default project' })
    return
  }

  projects = projects.filter(p => p.metadata.name !== name)
  res.json({ status: 'success', message: `Project ${name} deleted` })
})

// Mock resource endpoint (get individual resource manifest)
app.get('/api/v1/applications/:name/resource', (req, res) => {
  const { resourceName, kind, namespace } = req.query

  // Mock manifests for different resource types
  const manifests = {
    Service: {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: resourceName,
        namespace: namespace || 'default',
        labels: {
          app: 'guestbook'
        }
      },
      spec: {
        type: 'ClusterIP',
        ports: [
          {
            port: 80,
            targetPort: 80,
            protocol: 'TCP'
          }
        ],
        selector: {
          app: 'guestbook-ui'
        }
      }
    },
    Deployment: {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: resourceName,
        namespace: namespace || 'default',
        labels: {
          app: 'guestbook'
        }
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: 'guestbook-ui'
          }
        },
        template: {
          metadata: {
            labels: {
              app: 'guestbook-ui'
            }
          },
          spec: {
            containers: [
              {
                name: 'guestbook-ui',
                image: 'gcr.io/heptio-images/ks-guestbook-demo:0.1',
                ports: [
                  {
                    containerPort: 80
                  }
                ]
              }
            ]
          }
        }
      }
    },
    ReplicaSet: {
      apiVersion: 'apps/v1',
      kind: 'ReplicaSet',
      metadata: {
        name: resourceName,
        namespace: namespace || 'default',
        labels: {
          app: 'guestbook-ui'
        }
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: 'guestbook-ui'
          }
        },
        template: {
          metadata: {
            labels: {
              app: 'guestbook-ui'
            }
          },
          spec: {
            containers: [
              {
                name: 'guestbook-ui',
                image: 'gcr.io/heptio-images/ks-guestbook-demo:0.1',
                ports: [
                  {
                    containerPort: 80
                  }
                ]
              }
            ]
          }
        }
      },
      status: {
        replicas: 1,
        fullyLabeledReplicas: 1,
        readyReplicas: 1,
        availableReplicas: 1
      }
    },
    Pod: {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        name: resourceName,
        namespace: namespace || 'default',
        labels: {
          app: 'guestbook-ui'
        }
      },
      spec: {
        containers: [
          {
            name: 'guestbook-ui',
            image: 'gcr.io/heptio-images/ks-guestbook-demo:0.1',
            ports: [
              {
                containerPort: 80
              }
            ]
          }
        ]
      },
      status: {
        phase: 'Running',
        conditions: [
          {
            type: 'Ready',
            status: 'True'
          }
        ]
      }
    }
  }

  const manifest = manifests[kind] || {
    apiVersion: 'v1',
    kind: kind,
    metadata: {
      name: resourceName,
      namespace: namespace || 'default'
    }
  }

  res.json({ manifest })
})

// Mock managed resources endpoint (for diff view)
app.get('/api/v1/applications/:name/managed-resources', (req, res) => {
  const { name } = req.params

  // Mock YAML manifests
  const deploymentLive = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: guestbook-ui
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: guestbook
      tier: frontend
  template:
    metadata:
      labels:
        app: guestbook
        tier: frontend
    spec:
      containers:
      - name: guestbook
        image: gcr.io/heptio-images/ks-guestbook-demo:0.1
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "200m"`

  const deploymentTarget = deploymentLive // Make it synced for now

  const serviceLive = `apiVersion: v1
kind: Service
metadata:
  name: guestbook-ui
  namespace: default
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
  selector:
    app: guestbook
    tier: frontend`

  const serviceTarget = serviceLive // Service is in sync

  res.json({
    items: [
      {
        group: 'apps',
        kind: 'Deployment',
        namespace: 'default',
        name: 'guestbook-ui',
        version: 'v1',
        liveState: deploymentLive,
        targetState: deploymentTarget,
        syncStatus: 'Synced',
        health: {
          status: 'Healthy',
          message: 'Deployment has minimum availability',
        },
      },
      {
        group: '',
        kind: 'Service',
        namespace: 'default',
        name: 'guestbook-ui',
        version: 'v1',
        liveState: serviceLive,
        targetState: serviceTarget,
        syncStatus: 'Synced',
        health: {
          status: 'Healthy',
          message: 'Service is healthy',
        },
      },
    ],
  })
})

// Mock accounts list endpoint
app.get('/api/v1/account', (req, res) => {
  res.json({
    items: [
      {
        name: 'admin',
        enabled: true,
        capabilities: ['login', 'apiKey'],
        tokens: []
      },
      {
        name: 'dev-user',
        enabled: true,
        capabilities: ['login'],
        tokens: []
      },
      {
        name: 'ops-user',
        enabled: true,
        capabilities: ['login'],
        tokens: []
      },
      {
        name: 'readonly-user',
        enabled: true,
        capabilities: ['login'],
        tokens: []
      }
    ]
  })
})

// Mock can-i permission check endpoint (with subresource)
app.get('/api/v1/account/can-i/:resource/:action/:subresource', (req, res) => {
  const { resource, action, subresource } = req.params
  const token = req.headers.authorization

  // Simple mock logic: admin can do everything
  if (token && token.includes('admin')) {
    res.json({ value: 'yes' })
  } else {
    // Non-admin users have limited permissions
    if (action === 'get') {
      res.json({ value: 'yes' })
    } else if (action === 'sync' && subresource?.includes('dev')) {
      res.json({ value: 'yes' })
    } else {
      res.json({ value: 'no' })
    }
  }
})

// Mock can-i permission check endpoint (without subresource)
app.get('/api/v1/account/can-i/:resource/:action', (req, res) => {
  const { resource, action } = req.params
  const token = req.headers.authorization

  // Simple mock logic: admin can do everything
  if (token && token.includes('admin')) {
    res.json({ value: 'yes' })
  } else {
    // Non-admin users have limited permissions
    if (action === 'get') {
      res.json({ value: 'yes' })
    } else {
      res.json({ value: 'no' })
    }
  }
})

// Mock license endpoint
app.get('/api/v1/license', (req, res) => {
  // For demo, return enterprise license with all features
  // In production, this would call app.cased.com to validate

  // Enterprise tier (default for demo)
  res.json({
    tier: 'enterprise',
    features: ['rbac', 'audit', 'sso'],
    organization: 'Demo Organization',
    // expiresAt: '2025-12-31T23:59:59Z' // Optional expiration
  })

  // Uncomment to test free tier (no RBAC access)
  // res.json({
  //   tier: 'free',
  //   features: [], // Free tier has no advanced features
  //   organization: 'Demo Organization',
  // })
})

// In-memory RBAC config store
let rbacConfig = {
  policy: `# Admin has full access
p, admin, *, *, */*, allow
p, role:admin, *, *, */*, allow

# Dev user can sync dev apps
p, dev-user, applications, get, */*, allow
p, dev-user, applications, sync, default/guestbook, allow
p, dev-user, applications, sync, default/helm-guestbook, allow

# Ops user can rollback production apps
p, ops-user, applications, get, */*, allow
p, ops-user, applications, action/*, production/*, allow

# Readonly user can only view
p, readonly-user, applications, get, */*, allow
p, readonly-user, clusters, get, */*, allow
p, readonly-user, repositories, get, */*, allow

# Group assignments
g, admin, role:admin`,
  policyDefault: 'role:readonly',
  scopes: '[groups, email]'
}

// Mock RBAC configuration endpoint - GET
app.get('/api/v1/settings/rbac', (req, res) => {
  res.json(rbacConfig)
})

// Mock RBAC configuration endpoint - PUT (update)
app.put('/api/v1/settings/rbac', (req, res) => {
  const { policy, policyDefault, scopes } = req.body

  console.log('📝 Updating RBAC config...')
  console.log('Received policy length:', policy?.length || 0)

  // Update the in-memory config
  if (policy !== undefined) rbacConfig.policy = policy
  if (policyDefault !== undefined) rbacConfig.policyDefault = policyDefault
  if (scopes !== undefined) rbacConfig.scopes = scopes

  console.log('✅ RBAC config updated')
  console.log('New policy length:', rbacConfig.policy?.length || 0)

  // Create audit event for RBAC update
  createAuditEvent('admin', 'rbac.update', 'rbac', 'permissions', 'info', true, req)

  // Return the updated config
  res.json(rbacConfig)
})

// In-memory notifications store
let notificationServices = []
let notificationTemplates = []
let notificationTriggers = []

// Mock notifications config endpoint - GET
app.get('/api/v1/notifications/config', (req, res) => {
  // Return services, templates, and triggers in ConfigMap format
  const data = {}

  notificationServices.forEach(service => {
    const key = `service.${service.name}`
    data[key] = service.config
  })

  notificationTemplates.forEach(template => {
    const key = `template.${template.name}`
    data[key] = template.config
  })

  notificationTriggers.forEach(trigger => {
    const key = `trigger.${trigger.name}`
    data[key] = trigger.config
  })

  res.json({ data })
})

// Mock create Slack service endpoint
app.post('/api/v1/notifications/services/slack', (req, res) => {
  const { name, webhookUrl, channel, username, icon, events } = req.body

  console.log(`📨 Creating Slack notification service: ${name}`)
  console.log(`   Events:`, events)

  // Create service config in YAML-like format
  const config = `webhookUrl: ${webhookUrl}${channel ? `\nchannel: ${channel}` : ''}${username ? `\nusername: ${username}` : ''}${icon ? `\nicon: ${icon}` : ''}`

  const service = {
    name,
    type: 'slack',
    config
  }

  // Remove any existing service with the same name
  notificationServices = notificationServices.filter(s => s.name !== name)
  notificationServices.push(service)

  // Default to all events enabled if not specified
  const enabledEvents = events || {
    onDeployed: true,
    onSyncFailed: true,
    onHealthDegraded: true
  }

  // Auto-create default templates for Slack (always create all templates)
  const templates = [
    {
      name: 'app-deployed',
      config: `message: |
  Application {{.app.metadata.name}} has been successfully deployed.
slack:
  attachments: |
    [{
      "title": "✅ Application Deployed",
      "color": "good",
      "fields": [
        {
          "title": "Application",
          "value": "{{.app.metadata.name}}",
          "short": true
        },
        {
          "title": "Sync Status",
          "value": "{{.app.status.sync.status}}",
          "short": true
        },
        {
          "title": "Health Status",
          "value": "{{.app.status.health.status}}",
          "short": true
        },
        {
          "title": "Revision",
          "value": "{{.app.status.sync.revision}}",
          "short": true
        }
      ]
    }]`
    },
    {
      name: 'app-sync-failed',
      config: `message: |
  Application {{.app.metadata.name}} sync failed.
slack:
  attachments: |
    [{
      "title": "❌ Application Sync Failed",
      "color": "danger",
      "fields": [
        {
          "title": "Application",
          "value": "{{.app.metadata.name}}",
          "short": true
        },
        {
          "title": "Sync Status",
          "value": "{{.app.status.sync.status}}",
          "short": true
        },
        {
          "title": "Error",
          "value": "{{.app.status.operationState.message}}",
          "short": false
        }
      ]
    }]`
    },
    {
      name: 'app-health-degraded',
      config: `message: |
  Application {{.app.metadata.name}} health is degraded.
slack:
  attachments: |
    [{
      "title": "⚠️ Application Health Degraded",
      "color": "warning",
      "fields": [
        {
          "title": "Application",
          "value": "{{.app.metadata.name}}",
          "short": true
        },
        {
          "title": "Health Status",
          "value": "{{.app.status.health.status}}",
          "short": true
        },
        {
          "title": "Message",
          "value": "{{.app.status.health.message}}",
          "short": false
        }
      ]
    }]`
    }
  ]

  // Remove any existing templates with the same names
  templates.forEach(template => {
    notificationTemplates = notificationTemplates.filter(t => t.name !== template.name)
    notificationTemplates.push(template)
  })

  // Auto-create triggers only for enabled events
  const triggers = []

  if (enabledEvents.onDeployed) {
    triggers.push({
      name: `on-deployed-${name}`,
      config: `- when: app.status.operationState.phase in ['Succeeded']
  send: [app-deployed]
  services: [${name}]`
    })
  }

  if (enabledEvents.onSyncFailed) {
    triggers.push({
      name: `on-sync-failed-${name}`,
      config: `- when: app.status.operationState.phase in ['Failed']
  send: [app-sync-failed]
  services: [${name}]`
    })
  }

  if (enabledEvents.onHealthDegraded) {
    triggers.push({
      name: `on-health-degraded-${name}`,
      config: `- when: app.status.health.status == 'Degraded'
  send: [app-health-degraded]
  services: [${name}]`
    })
  }

  // Remove any existing triggers with the same potential names (cleanup)
  const potentialTriggerNames = [
    `on-deployed-${name}`,
    `on-sync-failed-${name}`,
    `on-health-degraded-${name}`
  ]
  notificationTriggers = notificationTriggers.filter(t => !potentialTriggerNames.includes(t.name))

  // Add the new triggers
  triggers.forEach(trigger => {
    notificationTriggers.push(trigger)
  })

  console.log(`✅ Slack service "${name}" created with ${templates.length} templates and ${triggers.length} triggers`)
  res.json({ status: 'success', name })
})

// Mock create GitHub service endpoint
app.post('/api/v1/notifications/services/github', (req, res) => {
  const { name, installationId, repositories, events } = req.body

  console.log(`📨 Creating GitHub notification service: ${name}`)
  console.log(`   Events:`, events)

  // Create service config in YAML-like format
  const config = `installationId: ${installationId}${repositories ? `\nrepositories: ${repositories}` : ''}`

  const service = {
    name,
    type: 'github',
    config
  }

  // Remove any existing service with the same name
  notificationServices = notificationServices.filter(s => s.name !== name)
  notificationServices.push(service)

  // Default to all events enabled if not specified
  const enabledEvents = events || {
    onDeployed: true,
    onSyncFailed: true,
    onHealthDegraded: true
  }

  // Auto-create default templates for GitHub (always create all templates)
  const templates = [
    {
      name: 'github-app-deployed',
      config: `message: |
  Application {{.app.metadata.name}} has been successfully deployed.
github:
  status:
    state: success
    label: "continuous-delivery/{{.app.metadata.name}}"
    targetURL: "https://argocd.example.com/applications/{{.app.metadata.name}}"
  deployment:
    state: success
    environment: production
    environmentURL: "https://{{.app.metadata.name}}.example.com"`
    },
    {
      name: 'github-app-sync-failed',
      config: `message: |
  Application {{.app.metadata.name}} sync failed.
github:
  status:
    state: failure
    label: "continuous-delivery/{{.app.metadata.name}}"
    targetURL: "https://argocd.example.com/applications/{{.app.metadata.name}}"`
    },
    {
      name: 'github-app-health-degraded',
      config: `message: |
  Application {{.app.metadata.name}} health is degraded.
github:
  status:
    state: failure
    label: "continuous-delivery/{{.app.metadata.name}}"
    targetURL: "https://argocd.example.com/applications/{{.app.metadata.name}}"`
    }
  ]

  // Remove any existing templates with the same names
  templates.forEach(template => {
    notificationTemplates = notificationTemplates.filter(t => t.name !== template.name)
    notificationTemplates.push(template)
  })

  // Auto-create triggers only for enabled events
  const triggers = []

  if (enabledEvents.onDeployed) {
    triggers.push({
      name: `on-deployed-${name}`,
      config: `- when: app.status.operationState.phase in ['Succeeded']
  send: [github-app-deployed]
  services: [${name}]`
    })
  }

  if (enabledEvents.onSyncFailed) {
    triggers.push({
      name: `on-sync-failed-${name}`,
      config: `- when: app.status.operationState.phase in ['Failed']
  send: [github-app-sync-failed]
  services: [${name}]`
    })
  }

  if (enabledEvents.onHealthDegraded) {
    triggers.push({
      name: `on-health-degraded-${name}`,
      config: `- when: app.status.health.status == 'Degraded'
  send: [github-app-health-degraded]
  services: [${name}]`
    })
  }

  // Remove any existing triggers with the same potential names (cleanup)
  const potentialTriggerNames = [
    `on-deployed-${name}`,
    `on-sync-failed-${name}`,
    `on-health-degraded-${name}`
  ]
  notificationTriggers = notificationTriggers.filter(t => !potentialTriggerNames.includes(t.name))

  // Add the new triggers
  triggers.forEach(trigger => {
    notificationTriggers.push(trigger)
  })

  console.log(`✅ GitHub service "${name}" created with ${templates.length} templates and ${triggers.length} triggers`)
  res.json({ status: 'success', name })
})

// Test Slack service endpoint - sends REAL message
app.post('/api/v1/notifications/services/:name/test', async (req, res) => {
  const { name } = req.params
  const { webhookUrl, channel, username, icon } = req.body

  console.log(`🧪 Testing Slack notification service: ${name}`)
  console.log(`   Webhook URL: ${webhookUrl.substring(0, 40)}...`)

  try {
    // Build Slack message payload
    const payload = {
      text: '🧪 *Test Notification from Cased Deploy*',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 Test Notification',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `This is a test notification from the *${name}* service.\n\nIf you're seeing this message, your Slack integration is working correctly! :tada:`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Sent at: <!date^${Math.floor(Date.now() / 1000)}^{date_pretty} at {time}|${new Date().toISOString()}>`
            }
          ]
        }
      ]
    }

    // Add optional overrides
    if (channel) payload.channel = channel
    if (username) payload.username = username
    if (icon) payload.icon_emoji = icon

    // Send actual HTTP request to Slack webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Slack webhook failed: ${response.status} ${errorText}`)
      return res.status(response.status).json({
        status: 'error',
        message: `Slack API error: ${errorText || response.statusText}`
      })
    }

    console.log(`✅ Test notification sent successfully to Slack`)
    res.json({ status: 'success', message: 'Test notification sent successfully' })
  } catch (error) {
    console.error(`❌ Error sending Slack notification:`, error)
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to send test notification'
    })
  }
})

// Mock test GitHub service endpoint
app.post('/api/v1/notifications/services/:name/test/github', (req, res) => {
  const { name } = req.params
  const { installationId } = req.body

  console.log(`🧪 Testing GitHub notification service: ${name}`)
  console.log(`   Installation ID: ${installationId}`)

  // Simulate successful test
  res.json({ status: 'success', message: 'Test commit status sent successfully' })
})

// Mock update Slack service endpoint
app.put('/api/v1/notifications/services/slack/:name', (req, res) => {
  const { name } = req.params
  const { webhookUrl, channel, username, icon } = req.body

  console.log(`📝 Updating Slack notification service: ${name}`)

  const serviceIndex = notificationServices.findIndex(s => s.name === name)

  if (serviceIndex === -1) {
    res.status(404).json({ error: 'Service not found' })
    return
  }

  const config = `webhookUrl: ${webhookUrl}${channel ? `\nchannel: ${channel}` : ''}${username ? `\nusername: ${username}` : ''}${icon ? `\nicon: ${icon}` : ''}`

  notificationServices[serviceIndex] = { name, type: 'slack', config }

  console.log(`✅ Slack service "${name}" updated`)
  res.json({ status: 'success', name })
})

// Mock update GitHub service endpoint
app.put('/api/v1/notifications/services/github/:name', (req, res) => {
  const { name } = req.params
  const { installationId, repositories } = req.body

  console.log(`📝 Updating GitHub notification service: ${name}`)

  const serviceIndex = notificationServices.findIndex(s => s.name === name)

  if (serviceIndex === -1) {
    res.status(404).json({ error: 'Service not found' })
    return
  }

  const config = `installationId: ${installationId}${repositories ? `\nrepositories: ${repositories}` : ''}`

  notificationServices[serviceIndex] = { name, type: 'github', config }

  console.log(`✅ GitHub service "${name}" updated`)
  res.json({ status: 'success', name })
})

// Mock create Webhook service endpoint
app.post('/api/v1/notifications/services/webhook', (req, res) => {
  const { name, url, events } = req.body

  console.log(`📨 Creating Webhook notification service: ${name}`)
  console.log(`   URL: ${url}`)
  console.log(`   Events:`, events)

  // Create service config in YAML-like format
  const config = `url: ${url}`

  const service = {
    name,
    type: 'webhook',
    config
  }

  // Remove any existing service with the same name
  notificationServices = notificationServices.filter(s => s.name !== name)
  notificationServices.push(service)

  // Default to all events enabled if not specified
  const enabledEvents = events || {
    onDeployed: true,
    onSyncFailed: true,
    onHealthDegraded: true
  }

  // Auto-create triggers only for enabled events
  const triggers = []

  if (enabledEvents.onDeployed) {
    triggers.push({
      name: `on-deployed-${name}`,
      config: `- when: app.status.operationState.phase in ['Succeeded']
  send: [app-deployed]
  services: [${name}]`
    })
  }

  if (enabledEvents.onSyncFailed) {
    triggers.push({
      name: `on-sync-failed-${name}`,
      config: `- when: app.status.operationState.phase in ['Failed']
  send: [app-sync-failed]
  services: [${name}]`
    })
  }

  if (enabledEvents.onHealthDegraded) {
    triggers.push({
      name: `on-health-degraded-${name}`,
      config: `- when: app.status.health.status == 'Degraded'
  send: [app-health-degraded]
  services: [${name}]`
    })
  }

  // Remove any existing triggers with the same potential names (cleanup)
  const potentialTriggerNames = [
    `on-deployed-${name}`,
    `on-sync-failed-${name}`,
    `on-health-degraded-${name}`
  ]
  notificationTriggers = notificationTriggers.filter(t => !potentialTriggerNames.includes(t.name))

  // Add the new triggers
  triggers.forEach(trigger => {
    notificationTriggers.push(trigger)
  })

  console.log(`✅ Webhook service "${name}" created with ${triggers.length} triggers`)
  res.json({ status: 'success', name })
})

// Mock update Webhook service endpoint
app.put('/api/v1/notifications/services/webhook/:name', (req, res) => {
  const { name } = req.params
  const { url } = req.body

  console.log(`📝 Updating Webhook notification service: ${name}`)

  const serviceIndex = notificationServices.findIndex(s => s.name === name)

  if (serviceIndex === -1) {
    res.status(404).json({ error: 'Service not found' })
    return
  }

  const config = `url: ${url}`

  notificationServices[serviceIndex] = { name, type: 'webhook', config }

  console.log(`✅ Webhook service "${name}" updated`)
  res.json({ status: 'success', name })
})

// Mock test Webhook service endpoint
app.post('/api/v1/notifications/services/:name/test/webhook', async (req, res) => {
  const { name } = req.params
  const { url } = req.body

  console.log(`🧪 Testing webhook service: ${name || 'test'}`)
  console.log(`   URL: ${url}`)

  try {
    // Actually send a real webhook!
    const payload = {
      app: {
        name: 'test-app',
        namespace: 'default'
      },
      status: {
        health: 'Healthy',
        sync: 'Synced'
      },
      revision: 'abc123def456',
      message: 'This is a test webhook from Cased CD',
      timestamp: new Date().toISOString()
    }

    console.log(`📤 Sending test webhook to ${url}...`)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cased-CD-Webhook/1.0'
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      console.log(`✅ Webhook sent successfully! Response: ${response.status} ${response.statusText}`)
      res.json({
        status: 'success',
        message: `Test webhook sent successfully (${response.status} ${response.statusText})`
      })
    } else {
      console.log(`⚠️  Webhook sent but received error response: ${response.status} ${response.statusText}`)
      res.status(400).json({
        status: 'error',
        message: `Webhook endpoint returned ${response.status}: ${response.statusText}`
      })
    }
  } catch (error) {
    console.log(`❌ Failed to send webhook: ${error.message}`)
    res.status(500).json({
      status: 'error',
      message: `Failed to send webhook: ${error.message}`
    })
  }
})

// Mock create Email service endpoint
app.post('/api/v1/notifications/services/email', (req, res) => {
  const { name, smtpHost, smtpPort, username, password, from, to, events } = req.body

  console.log(`📧 Creating Email notification service: ${name}`)
  console.log(`   Host: ${smtpHost}:${smtpPort}`)
  console.log(`   From: ${from}`)
  console.log(`   To: ${to || 'not specified'}`)
  console.log(`   Events:`, events)

  // Create service config in YAML-like format
  let config = `host: ${smtpHost}
port: ${smtpPort}
username: ${username}
password: $email-${name}-password
from: ${from}`

  if (to) {
    config += `\nto: ${to}`
  }

  const service = {
    name,
    type: 'email',
    config
  }

  // Remove any existing service with the same name
  notificationServices = notificationServices.filter(s => s.name !== name)
  notificationServices.push(service)

  // Default to all events enabled if not specified
  const enabledEvents = events || {
    onDeployed: true,
    onSyncFailed: true,
    onHealthDegraded: true
  }

  // Auto-create triggers only for enabled events
  const triggers = []

  if (enabledEvents.onDeployed) {
    triggers.push({
      name: `on-deployed-${name}`,
      config: `- when: app.status.operationState.phase in ['Succeeded']
  send: [app-deployed]
  services: [${name}]`
    })
  }

  if (enabledEvents.onSyncFailed) {
    triggers.push({
      name: `on-sync-failed-${name}`,
      config: `- when: app.status.operationState.phase in ['Failed']
  send: [app-sync-failed]
  services: [${name}]`
    })
  }

  if (enabledEvents.onHealthDegraded) {
    triggers.push({
      name: `on-health-degraded-${name}`,
      config: `- when: app.status.health.status == 'Degraded'
  send: [app-health-degraded]
  services: [${name}]`
    })
  }

  // Remove any existing triggers with the same potential names (cleanup)
  const potentialTriggerNames = [
    `on-deployed-${name}`,
    `on-sync-failed-${name}`,
    `on-health-degraded-${name}`
  ]
  notificationTriggers = notificationTriggers.filter(t => !potentialTriggerNames.includes(t.name))

  // Add the new triggers
  triggers.forEach(trigger => {
    notificationTriggers.push(trigger)
  })

  console.log(`✅ Email service "${name}" created with ${triggers.length} triggers`)
  res.json({ status: 'created', name })
})

// Mock update Email service endpoint
app.put('/api/v1/notifications/services/email/:name', (req, res) => {
  const { name } = req.params
  const { smtpHost, smtpPort, username, password, from, to } = req.body

  console.log(`📝 Updating Email notification service: ${name}`)

  const serviceIndex = notificationServices.findIndex(s => s.name === name)

  if (serviceIndex === -1) {
    res.status(404).json({ error: 'Service not found' })
    return
  }

  let config = `host: ${smtpHost}
port: ${smtpPort}
username: ${username}
password: $email-${name}-password
from: ${from}`

  if (to) {
    config += `\nto: ${to}`
  }

  notificationServices[serviceIndex] = { name, type: 'email', config }

  console.log(`✅ Email service "${name}" updated`)
  res.json({ status: 'updated', name })
})

// Mock test Email service endpoint
app.post('/api/v1/notifications/services/:name/test/email', (req, res) => {
  const { name } = req.params
  const { smtpHost, smtpPort, username, password, from, to } = req.body

  console.log(`🧪 Testing email service: ${name || 'test'}`)
  console.log(`   Host: ${smtpHost}:${smtpPort}`)
  console.log(`   From: ${from}`)
  console.log(`   To: ${to || 'not specified'}`)

  // For the mock server, we just simulate success
  // In a real implementation, you would use a library like nodemailer
  console.log(`✅ Email configuration validated (mock - not actually sent)`)
  res.json({
    status: 'success',
    message: 'Test email configuration validated (actual sending not implemented in mock server)'
  })
})

// Mock delete notification service endpoint
app.delete('/api/v1/notifications/services/:name', (req, res) => {
  const { name } = req.params

  console.log(`🗑️  Deleting notification service: ${name}`)

  const initialLength = notificationServices.length
  notificationServices = notificationServices.filter(s => s.name !== name)

  if (notificationServices.length < initialLength) {
    console.log(`✅ Service "${name}" deleted`)
    res.json({ status: 'success', name })
  } else {
    res.status(404).json({ error: 'Service not found' })
  }
})

// Audit Trail - Mock data
const generateAuditEvents = () => {
  const users = ['admin', 'john.doe', 'jane.smith', 'system']
  const actions = [
    'application.create', 'application.update', 'application.sync', 'application.refresh', 'application.delete',
    'repository.create', 'repository.update', 'repository.delete',
    'cluster.create', 'cluster.update', 'cluster.delete',
    'project.create', 'project.update', 'project.delete',
    'rbac.grant', 'rbac.revoke', 'rbac.update',
    'account.create', 'account.update', 'account.delete',
    'notification.create', 'notification.update', 'notification.delete',
    'system.auto_sync'
  ]
  const resourceTypes = ['application', 'repository', 'cluster', 'project', 'rbac', 'account', 'notification', 'system']
  const severities = ['info', 'warning', 'error']

  const events = []
  const now = new Date()

  // Generate 50 mock audit events
  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(now - (i * 3600000)) // 1 hour apart
    const action = actions[Math.floor(Math.random() * actions.length)]
    const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)]
    const user = users[Math.floor(Math.random() * users.length)]
    const success = Math.random() > 0.1 // 90% success rate
    const severity = success ? 'info' : (Math.random() > 0.5 ? 'warning' : 'error')

    events.push({
      id: `audit-${i + 1}`,
      timestamp: timestamp.toISOString(),
      user,
      action,
      resourceType,
      resourceName: `${resourceType}-${Math.floor(Math.random() * 10)}`,
      severity,
      success,
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      details: {
        metadata: {
          triggeredBy: user === 'system' ? 'auto-sync' : 'manual',
        }
      }
    })
  }

  return events
}

let auditEvents = generateAuditEvents()

// Helper function to create real audit events
const createAuditEvent = (user, action, resourceType, resourceName, severity, success, req) => {
  const event = {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    user,
    action,
    resourceType,
    resourceName,
    severity,
    success,
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
    details: {
      metadata: {
        triggeredBy: 'manual',
      }
    }
  }

  // Prepend to keep newest first
  auditEvents.unshift(event)

  // Keep only last 1000 events
  if (auditEvents.length > 1000) {
    auditEvents = auditEvents.slice(0, 1000)
  }

  console.log(`📋 Audit event created: ${action} on ${resourceType}/${resourceName} by ${user}`)
  return event
}

// GET /api/v1/settings/audit - Get audit events
app.get('/api/v1/settings/audit', (req, res) => {
  console.log('📋 GET /api/v1/settings/audit')

  let filteredEvents = [...auditEvents]

  // Apply query parameter filters
  if (req.query.user) {
    filteredEvents = filteredEvents.filter(e => e.user === req.query.user)
  }
  if (req.query.action) {
    filteredEvents = filteredEvents.filter(e => e.action === req.query.action)
  }
  if (req.query.resourceType) {
    filteredEvents = filteredEvents.filter(e => e.resourceType === req.query.resourceType)
  }
  if (req.query.severity) {
    filteredEvents = filteredEvents.filter(e => e.severity === req.query.severity)
  }
  if (req.query.success !== undefined) {
    const success = req.query.success === 'true'
    filteredEvents = filteredEvents.filter(e => e.success === success)
  }

  console.log(`✅ Returning ${filteredEvents.length} audit events`)

  res.json({
    items: filteredEvents,
    metadata: {
      totalCount: filteredEvents.length
    }
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Mock ArgoCD API server running on http://localhost:${PORT}`)
})
