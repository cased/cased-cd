import { X, FolderGit2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateRepository } from '@/services/repositories'
import type { Repository } from '@/types/api'

interface CreateRepositoryPanelProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateRepositoryPanel({ isOpen, onClose, onSuccess }: CreateRepositoryPanelProps) {
  const createMutation = useCreateRepository()
  const [formData, setFormData] = useState({
    type: 'git' as 'git' | 'helm' | 'oci',
    name: '',
    repo: '',
    username: '',
    password: '',
    insecure: false,
    project: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const newErrors: Record<string, string> = {}
    if (!formData.repo) newErrors.repo = 'Repository URL is required'
    if (formData.type === 'helm' && !formData.name) newErrors.name = 'Name is required for Helm repositories'
    if (formData.username && !formData.password) newErrors.password = 'Password is required if username is given'
    if (formData.password && !formData.username) newErrors.username = 'Username is required if password is given'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      const repository: Repository = {
        repo: formData.repo,
        type: formData.type,
        name: formData.name || undefined,
        username: formData.username || undefined,
        password: formData.password || undefined,
        insecure: formData.insecure,
        project: formData.project || undefined,
        connectionState: {
          status: 'Unknown',
        },
      }

      await createMutation.mutateAsync(repository)
      onSuccess?.()
      onClose()

      // Reset form
      setFormData({
        type: 'git',
        name: '',
        repo: '',
        username: '',
        password: '',
        insecure: false,
        project: '',
      })
      setErrors({})
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create repository' })
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
              <FolderGit2 className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-white">Connect Repository</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'git' | 'helm' | 'oci' })}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="git">Git</option>
                <option value="helm">Helm</option>
                <option value="oci">OCI</option>
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Name {formData.type === 'helm' ? '' : '(optional)'}
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="my-repository"
              />
              {errors.name && <p className="text-sm text-red-400 mt-1">{errors.name}</p>}
            </div>

            {/* Repository URL */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Repository URL *
              </label>
              <Input
                value={formData.repo}
                onChange={(e) => setFormData({ ...formData, repo: e.target.value })}
                placeholder="https://github.com/org/repo.git"
              />
              {errors.repo && <p className="text-sm text-red-400 mt-1">{errors.repo}</p>}
            </div>

            {/* Project */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Project (optional)
              </label>
              <Input
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                placeholder="default"
              />
            </div>

            {/* Authentication */}
            <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Authentication (optional)
              </h3>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Username
                </label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="username"
                  autoComplete="off"
                />
                {errors.username && <p className="text-sm text-red-400 mt-1">{errors.username}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="password or token"
                  autoComplete="off"
                />
                {errors.password && <p className="text-sm text-red-400 mt-1">{errors.password}</p>}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="insecure"
                  checked={formData.insecure}
                  onChange={(e) => setFormData({ ...formData, insecure: e.target.checked })}
                  className="rounded border-neutral-300 dark:border-neutral-700"
                />
                <label htmlFor="insecure" className="text-sm text-neutral-700 dark:text-neutral-300">
                  Skip server verification (insecure)
                </label>
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
            variant="primary"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Connecting...' : 'Connect Repository'}
          </Button>
        </div>
      </div>
    </div>
  )
}
