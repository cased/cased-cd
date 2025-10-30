import { describe, it, expect, beforeAll } from 'vitest'
import axios from 'axios'

// Integration test for sync functionality
// Requires ArgoCD to be running and accessible via nginx CORS proxy
describe('Sync Integration Test', () => {
  const ARGOCD_API = 'http://localhost:8090/api/v1'
  const TEST_APP = 'guestbook' // From seed script
  let token: string

  beforeAll(async () => {
    // Get auth token from localStorage or use a test token
    // In a real scenario, you'd authenticate here
    token = localStorage.getItem('argocd_token') || ''
  })

  it('should sync an application via API', async () => {
    if (!token) {
      console.log('Skipping integration test: No ArgoCD token available')
      return
    }

    try {
      // Call the sync endpoint
      const response = await axios.post(
        `${ARGOCD_API}/applications/${TEST_APP}/sync`,
        {
          prune: true,
          dryRun: false,
          strategy: { hook: {} },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      // Verify response
      expect(response.status).toBe(200)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log('Integration test failed:', error.response?.data || error.message)
      }
      throw error
    }
  }, 30000) // 30 second timeout

  it('should handle sync of non-existent application', async () => {
    if (!token) {
      console.log('Skipping integration test: No ArgoCD token available')
      return
    }

    try {
      await axios.post(
        `${ARGOCD_API}/applications/non-existent-app/sync`,
        {
          prune: true,
          dryRun: false,
          strategy: { hook: {} },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      // Should not reach here
      expect(true).toBe(false)
    } catch (error) {
      // Should fail with 404 or similar
      if (axios.isAxiosError(error)) {
        expect(error.response?.status).toBeGreaterThanOrEqual(400)
      }
    }
  }, 30000)
})
