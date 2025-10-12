import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 8080

app.use(cors())
app.use(express.json())

// Mock session/login endpoint
app.post('/api/v1/session', (req, res) => {
  const { username, password } = req.body

  // Accept admin/password or any credentials for demo
  if (username && password) {
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
        status: 'Synced',
      },
      health: {
        status: 'Healthy',
      },
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
    },
  })
})

// Mock resource tree endpoint
app.get('/api/v1/applications/:name/resource-tree', (req, res) => {
  res.json({
    nodes: [
      {
        kind: 'Deployment',
        name: 'guestbook-ui',
        namespace: 'default',
        health: { status: 'Healthy' },
        parentRefs: [],
      },
      {
        kind: 'ReplicaSet',
        name: 'guestbook-ui-85985d774c',
        namespace: 'default',
        health: { status: 'Healthy' },
        parentRefs: [{ kind: 'Deployment', name: 'guestbook-ui' }],
      },
      {
        kind: 'Pod',
        name: 'guestbook-ui-85985d774c-7nlwl',
        namespace: 'default',
        health: { status: 'Healthy' },
        parentRefs: [{ kind: 'ReplicaSet', name: 'guestbook-ui-85985d774c' }],
      },
      {
        kind: 'Service',
        name: 'guestbook-ui',
        namespace: 'default',
        health: { status: 'Healthy' },
        parentRefs: [],
      },
    ],
  })
})

// Mock sync endpoint
app.post('/api/v1/applications/:name/sync', (req, res) => {
  res.json({ status: 'success' })
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

  const deploymentTarget = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: guestbook-ui
  namespace: default
spec:
  replicas: 3
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
        image: gcr.io/heptio-images/ks-guestbook-demo:0.2
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "200m"
          limits:
            memory: "256Mi"
            cpu: "500m"`

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
        syncStatus: 'OutOfSync',
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

app.listen(PORT, () => {
  console.log(`🚀 Mock ArgoCD API server running on http://localhost:${PORT}`)
})
