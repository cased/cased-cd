import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IconCheck, IconCircleWarning } from 'obra-icons-react'

export interface GitHubServiceFormData {
  name: string
  installationId: string
  repositories?: string
}

interface GitHubServiceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: GitHubServiceFormData) => void
  onTest?: (data: GitHubServiceFormData) => void
  isSubmitting?: boolean
  isTesting?: boolean
}

export function GitHubServiceForm({
  open,
  onOpenChange,
  onSubmit,
  onTest,
  isSubmitting = false,
  isTesting = false,
}: GitHubServiceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<GitHubServiceFormData>({
    defaultValues: {
      name: 'github',
    },
  })

  const handleTestClick = () => {
    if (onTest) {
      const values = getValues()
      onTest(values)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure GitHub Notification Service</DialogTitle>
          <DialogDescription>
            Update commit statuses and create comments on PRs based on deployment status.{' '}
            <a
              href="https://docs.github.com/en/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Learn more about GitHub Apps →
            </a>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Service Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Service Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="github"
              {...register('name', {
                required: 'Service name is required',
                pattern: {
                  value: /^[a-z0-9-]+$/,
                  message: 'Only lowercase letters, numbers, and hyphens allowed',
                },
              })}
            />
            {errors.name && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <IconCircleWarning size={12} />
                {errors.name.message}
              </p>
            )}
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              A unique identifier for this service (e.g., github-main, github-prod)
            </p>
          </div>

          {/* Installation ID */}
          <div className="space-y-2">
            <Label htmlFor="installationId">
              Installation ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="installationId"
              placeholder="12345678"
              {...register('installationId', {
                required: 'Installation ID is required',
                pattern: {
                  value: /^\d+$/,
                  message: 'Must be a numeric installation ID',
                },
              })}
            />
            {errors.installationId && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <IconCircleWarning size={12} />
                {errors.installationId.message}
              </p>
            )}
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              <p className="mb-2">
                Install the Cased GitHub App to your organization and get your installation ID.{' '}
                <a
                  href="https://github.com/apps/cased/installations/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Install Cased GitHub App →
                </a>
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
                  How to find your installation ID
                </summary>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-neutral-700 dark:text-neutral-300 pl-2">
                  <li>Install the Cased GitHub App to your organization</li>
                  <li>After installation, you'll be redirected to a URL</li>
                  <li>The URL will contain <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">/installations/XXXXXXX</code></li>
                  <li>The number after <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">/installations/</code> is your installation ID</li>
                  <li>Alternatively, visit GitHub Settings → Installed GitHub Apps to find it</li>
                  <li>Paste the installation ID into the field above</li>
                </ol>
              </details>
            </div>
          </div>

          {/* Repository Filter */}
          <div className="space-y-2">
            <Label htmlFor="repositories">Repository Filter (optional)</Label>
            <Input
              id="repositories"
              placeholder="owner/repo1,owner/repo2"
              {...register('repositories')}
            />
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Comma-separated list of repositories to send notifications for. Leave empty for all repositories.
            </p>
          </div>

          <DialogFooter className="gap-2">
            {onTest && (
              <Button
                type="button"
                variant="outline"
                onClick={handleTestClick}
                disabled={isTesting || isSubmitting}
              >
                {isTesting ? 'Testing...' : 'Test'}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                'Saving...'
              ) : (
                <>
                  <IconCheck size={16} />
                  Save Service
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
