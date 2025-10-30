import { IconClose, IconServer } from 'obra-icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateCluster } from '@/services/clusters'
import type { Cluster } from '@/types/api'

interface CreateClusterPanelProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateClusterPanel({ isOpen, onClose, onSuccess }: CreateClusterPanelProps) {
  const createMutation = useCreateCluster()
  const [formData, setFormData] = useState({
    name: '',
    server: '',
    namespaces: '',
    config: {
      bearerToken: '',
      tlsClientConfig: {
        insecure: false,
        caData: '',
        certData: '',
        keyData: '',
      },
    },
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const newErrors: Record<string, string> = {}
    if (!formData.name) newErrors.name = 'Cluster name is required'
    if (!formData.server) newErrors.server = 'Server URL is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      const cluster: Cluster = {
        name: formData.name,
        server: formData.server,
        config: {
          bearerToken: formData.config.bearerToken || undefined,
          tlsClientConfig: {
            insecure: formData.config.tlsClientConfig.insecure,
            caData: formData.config.tlsClientConfig.caData || undefined,
            certData: formData.config.tlsClientConfig.certData || undefined,
            keyData: formData.config.tlsClientConfig.keyData || undefined,
          },
        },
        connectionState: {
          status: 'Failed',
          message: 'Not yet connected',
        },
      }

      await createMutation.mutateAsync(cluster)
      onSuccess?.()
      onClose()

      // Reset form
      setFormData({
        name: '',
        server: '',
        namespaces: '',
        config: {
          bearerToken: '',
          tlsClientConfig: {
            insecure: false,
            caData: '',
            certData: '',
            keyData: '',
          },
        },
      })
      setErrors({})
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create cluster' })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-black border-l border-neutral-200 dark:border-neutral-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
              <IconServer size={16} className="text-neutral-600 dark:text-neutral-400" />
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-white">Add Cluster</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="production-cluster"
              />
              {errors.name && <p className="text-sm text-red-400 mt-1">{errors.name}</p>}
            </div>

            {/* Server URL */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Server URL *
              </label>
              <Input
                value={formData.server}
                onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                placeholder="https://kubernetes.default.svc"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-600 mt-1">
                Use "https://kubernetes.default.svc" for in-cluster access
              </p>
              {errors.server && <p className="text-sm text-red-400 mt-1">{errors.server}</p>}
            </div>

            {/* Namespaces */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Namespaces (optional)
              </label>
              <Input
                value={formData.namespaces}
                onChange={(e) => setFormData({ ...formData, namespaces: e.target.value })}
                placeholder="default, kube-system, production"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-600 mt-1">
                Comma-separated list. Leave empty for all namespaces.
              </p>
            </div>

            {/* Authentication */}
            <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Authentication
              </h3>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Bearer Token (optional)
                </label>
                <Input
                  type="password"
                  value={formData.config.bearerToken}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: { ...formData.config, bearerToken: e.target.value }
                  })}
                  placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6..."
                  autoComplete="off"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="insecure"
                  checked={formData.config.tlsClientConfig.insecure}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      tlsClientConfig: {
                        ...formData.config.tlsClientConfig,
                        insecure: e.target.checked
                      }
                    }
                  })}
                  className="rounded border-neutral-300 dark:border-neutral-700"
                />
                <label htmlFor="insecure" className="text-sm text-neutral-700 dark:text-neutral-300">
                  Skip server verification (insecure)
                </label>
              </div>
            </div>

            {/* TLS Configuration */}
            <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                TLS Configuration (optional)
              </h3>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  CA Certificate Data
                </label>
                <textarea
                  value={formData.config.tlsClientConfig.caData}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      tlsClientConfig: {
                        ...formData.config.tlsClientConfig,
                        caData: e.target.value
                      }
                    }
                  })}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  className="w-full h-24 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-black dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Client Certificate Data
                </label>
                <textarea
                  value={formData.config.tlsClientConfig.certData}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      tlsClientConfig: {
                        ...formData.config.tlsClientConfig,
                        certData: e.target.value
                      }
                    }
                  })}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  className="w-full h-24 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-black dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Client Key Data
                </label>
                <textarea
                  value={formData.config.tlsClientConfig.keyData}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      tlsClientConfig: {
                        ...formData.config.tlsClientConfig,
                        keyData: e.target.value
                      }
                    }
                  })}
                  placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                  className="w-full h-24 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-black dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Error message */}
            {errors.submit && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-sm text-red-400">{errors.submit}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Adding...' : 'Add Cluster'}
          </Button>
        </div>
      </div>
    </div>
  )
}
