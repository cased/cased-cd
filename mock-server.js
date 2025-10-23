import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 8080

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

  // Return the updated config
  res.json(rbacConfig)
})

app.listen(PORT, () => {
  console.log(`🚀 Mock ArgoCD API server running on http://localhost:${PORT}`)
})
