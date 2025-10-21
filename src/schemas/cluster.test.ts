import { describe, it, expect } from 'vitest'
import { clusterSchema } from './cluster'

describe('Cluster Schema Validation', () => {
  describe('Valid inputs', () => {
    it('should accept valid cluster with minimal fields', () => {
      const validData = {
        name: 'production-cluster',
        server: 'https://kubernetes.default.svc',
        insecure: false,
      }

      const result = clusterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept cluster with all fields', () => {
      const validData = {
        name: 'production-cluster',
        server: 'https://kubernetes.default.svc',
        namespaces: 'default, production, staging',
        bearerToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
        insecure: false,
        caData: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
        certData: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
        keyData: '-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----',
      }

      const result = clusterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept cluster with insecure flag', () => {
      const validData = {
        name: 'dev-cluster',
        server: 'https://dev.cluster.local',
        insecure: true,
      }

      const result = clusterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept cluster with bearer token', () => {
      const validData = {
        name: 'auth-cluster',
        server: 'https://cluster.example.com',
        bearerToken: 'my-bearer-token-12345',
        insecure: false,
      }

      const result = clusterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept cluster with TLS certificates', () => {
      const validData = {
        name: 'secure-cluster',
        server: 'https://secure.cluster.com',
        insecure: false,
        caData: '-----BEGIN CERTIFICATE-----\nCA DATA\n-----END CERTIFICATE-----',
        certData: '-----BEGIN CERTIFICATE-----\nCERT DATA\n-----END CERTIFICATE-----',
        keyData: '-----BEGIN RSA PRIVATE KEY-----\nKEY DATA\n-----END RSA PRIVATE KEY-----',
      }

      const result = clusterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('Required fields', () => {
    it('should fail when name is empty', () => {
      const invalidData = {
        name: '',
        server: 'https://kubernetes.default.svc',
        insecure: false,
      }

      const result = clusterSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Cluster name is required')
      }
    })

    it('should fail when name is missing', () => {
      const invalidData = {
        server: 'https://kubernetes.default.svc',
        insecure: false,
      }

      const result = clusterSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should fail when server is empty', () => {
      const invalidData = {
        name: 'my-cluster',
        server: '',
        insecure: false,
      }

      const result = clusterSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Server URL is required')
      }
    })

    it('should fail when server is missing', () => {
      const invalidData = {
        name: 'my-cluster',
        insecure: false,
      }

      const result = clusterSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Optional fields', () => {
    it('should accept empty namespaces', () => {
      const validData = {
        name: 'my-cluster',
        server: 'https://kubernetes.default.svc',
        namespaces: '',
        insecure: false,
      }

      const result = clusterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept missing namespaces', () => {
      const validData = {
        name: 'my-cluster',
        server: 'https://kubernetes.default.svc',
        insecure: false,
      }

      const result = clusterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept empty bearer token', () => {
      const validData = {
        name: 'my-cluster',
        server: 'https://kubernetes.default.svc',
        bearerToken: '',
        insecure: false,
      }

      const result = clusterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept empty TLS data', () => {
      const validData = {
        name: 'my-cluster',
        server: 'https://kubernetes.default.svc',
        insecure: false,
        caData: '',
        certData: '',
        keyData: '',
      }

      const result = clusterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('should accept cluster with special characters in name', () => {
      const validData = {
        name: 'production-us-east-1-2024',
        server: 'https://kubernetes.default.svc',
        insecure: false,
      }

      const result = clusterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept various server URL formats', () => {
      const formats = [
        'https://kubernetes.default.svc',
        'https://cluster.example.com:6443',
        'https://192.168.1.1:6443',
        'https://my-k8s-cluster.local',
      ]

      formats.forEach(server => {
        const validData = {
          name: 'test-cluster',
          server,
          insecure: false,
        }
        expect(clusterSchema.safeParse(validData).success).toBe(true)
      })
    })

    it('should accept multi-line certificate data', () => {
      const validData = {
        name: 'secure-cluster',
        server: 'https://kubernetes.default.svc',
        insecure: false,
        caData: `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKl7wV7nZvLNMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
-----END CERTIFICATE-----`,
      }

      const result = clusterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept comma-separated namespaces', () => {
      const validData = {
        name: 'my-cluster',
        server: 'https://kubernetes.default.svc',
        namespaces: 'default, kube-system, production, staging',
        insecure: false,
      }

      const result = clusterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})
