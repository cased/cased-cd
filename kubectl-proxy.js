// Simple kubectl proxy for ArgoCD notifications ConfigMap access
import express from 'express'
import cors from 'cors'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const app = express()
const PORT = 9001

app.use(cors())
app.use(express.json())

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Get notifications ConfigMap
app.get('/api/v1/notifications/config', async (req, res) => {
  try {
    const { stdout } = await execAsync(
      'kubectl get configmap argocd-notifications-cm -n argocd -o json'
    )
    const configMap = JSON.parse(stdout)
    res.json(configMap)
  } catch (error) {
    console.error('Error fetching ConfigMap:', error)
    res.status(500).json({ error: error.message })
  }
})

// Update notifications ConfigMap
app.put('/api/v1/notifications/config', async (req, res) => {
  try {
    const config = req.body

    // First get the current ConfigMap
    const { stdout } = await execAsync(
      'kubectl get configmap argocd-notifications-cm -n argocd -o json'
    )
    const configMap = JSON.parse(stdout)

    // Rebuild data object from structured config
    const data = {}

    config.services.forEach((service) => {
      data[`service.${service.name}`] = service.config
    })

    config.templates.forEach((template) => {
      data[`template.${template.name}`] = template.config
    })

    config.triggers.forEach((trigger) => {
      data[`trigger.${trigger.name}`] = trigger.config
    })

    // Update ConfigMap data
    configMap.data = data

    // Apply the updated ConfigMap
    const configMapJson = JSON.stringify(configMap)
    await execAsync(
      `echo '${configMapJson}' | kubectl apply -f -`
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error updating ConfigMap:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Kubectl proxy server running on http://localhost:${PORT}`)
})
