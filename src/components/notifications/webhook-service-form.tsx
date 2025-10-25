import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IconCheck, IconCircleWarning } from 'obra-icons-react'

export interface WebhookServiceFormData {
  name: string
  url: string
  events?: {
    onDeployed: boolean
    onSyncFailed: boolean
    onHealthDegraded: boolean
  }
}

interface WebhookServiceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: WebhookServiceFormData) => void
  onTest?: (data: WebhookServiceFormData) => void
  isSubmitting?: boolean
  isTesting?: boolean
  isEditing?: boolean
  initialData?: WebhookServiceFormData
}

export function WebhookServiceForm({
  open,
  onOpenChange,
  onSubmit,
  onTest,
  isSubmitting = false,
  isTesting = false,
  isEditing = false,
  initialData,
}: WebhookServiceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    reset,
  } = useForm<WebhookServiceFormData>({
    defaultValues: initialData || {
      name: 'webhook',
      events: {
        onDeployed: true,
        onSyncFailed: true,
        onHealthDegraded: true,
      },
    },
  })

  useEffect(() => {
    if (initialData) {
      reset(initialData)
    }
  }, [initialData, reset])

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
          <DialogTitle>{isEditing ? 'Edit' : 'Configure'} Webhook Notification Service</DialogTitle>
          <DialogDescription>
            Send HTTP POST requests to a custom endpoint when deployment events occur.
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
              placeholder="webhook"
              disabled={isEditing}
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
              A unique identifier for this service (e.g., my-webhook, prod-webhook)
            </p>
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="url">
              Webhook URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/webhook"
              {...register('url', {
                required: 'Webhook URL is required',
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: 'Must be a valid HTTP or HTTPS URL',
                },
              })}
            />
            {errors.url && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <IconCircleWarning size={12} />
                {errors.url.message}
              </p>
            )}
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              <p className="mb-2">
                The endpoint will receive a JSON payload with deployment details.
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Example webhook payload
                </summary>
                <pre className="mt-3 text-xs bg-neutral-100 dark:bg-neutral-800 p-3 rounded overflow-x-auto">
{`{
  "app": {
    "name": "my-app",
    "namespace": "default"
  },
  "status": {
    "health": "Healthy",
    "sync": "Synced"
  },
  "revision": "abc123",
  "message": "Deployment succeeded"
}`}
                </pre>
              </details>
            </div>
          </div>

          {/* Notification Events */}
          <div className="space-y-2">
            <Label>Notification Events</Label>
            <div className="space-y-3 bg-neutral-50 dark:bg-neutral-900 p-4 rounded border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="events.onDeployed"
                  {...register('events.onDeployed')}
                />
                <label
                  htmlFor="events.onDeployed"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Deployment succeeded
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="events.onSyncFailed"
                  {...register('events.onSyncFailed')}
                />
                <label
                  htmlFor="events.onSyncFailed"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Deployment failed
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="events.onHealthDegraded"
                  {...register('events.onHealthDegraded')}
                />
                <label
                  htmlFor="events.onHealthDegraded"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Health degraded
                </label>
              </div>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Select which events should trigger webhook calls
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestClick}
              disabled={isTesting || isSubmitting}
            >
              {isTesting ? 'Testing...' : 'Test'}
            </Button>
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
                  {isEditing ? 'Update Service' : 'Save Service'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
