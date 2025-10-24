import { useState } from 'react'
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

export interface SlackServiceFormData {
  name: string
  webhookUrl: string
  channel?: string
  username?: string
  icon?: string
}

interface SlackServiceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SlackServiceFormData) => void
  onTest?: (data: SlackServiceFormData) => void
  isSubmitting?: boolean
  isTesting?: boolean
}

export function SlackServiceForm({
  open,
  onOpenChange,
  onSubmit,
  onTest,
  isSubmitting = false,
  isTesting = false,
}: SlackServiceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<SlackServiceFormData>({
    defaultValues: {
      name: 'slack',
      username: 'ArgoCD',
      icon: ':rocket:',
    },
  })

  const [showWebhookUrl, setShowWebhookUrl] = useState(false)

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
          <DialogTitle>Configure Slack Notification Service</DialogTitle>
          <DialogDescription>
            Send notifications to Slack channels using an incoming webhook.{' '}
            <a
              href="https://api.slack.com/messaging/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Learn how to create a webhook →
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
              placeholder="slack"
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
              A unique identifier for this service (e.g., team-slack, prod-slack)
            </p>
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">
              Webhook URL <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="webhookUrl"
                type={showWebhookUrl ? 'text' : 'password'}
                placeholder="https://hooks.slack.com/services/..."
                {...register('webhookUrl', {
                  required: 'Webhook URL is required',
                  pattern: {
                    value: /^https:\/\/hooks\.slack\.com\/services\/.+/,
                    message: 'Must be a valid Slack webhook URL',
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowWebhookUrl(!showWebhookUrl)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                {showWebhookUrl ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.webhookUrl && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <IconCircleWarning size={12} />
                {errors.webhookUrl.message}
              </p>
            )}
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Create an Incoming Webhook in Slack (no bot required): <strong>Workspace Settings → Apps → Incoming Webhooks</strong>
            </p>
          </div>

          {/* Default Channel */}
          <div className="space-y-2">
            <Label htmlFor="channel">Default Channel (optional)</Label>
            <Input
              id="channel"
              placeholder="#deployments"
              {...register('channel', {
                pattern: {
                  value: /^#[a-z0-9-_]+$/,
                  message: 'Channel must start with # and contain only lowercase letters, numbers, hyphens, and underscores',
                },
              })}
            />
            {errors.channel && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <IconCircleWarning size={12} />
                {errors.channel.message}
              </p>
            )}
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Override the webhook's default channel
            </p>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Bot Username (optional)</Label>
            <Input
              id="username"
              placeholder="ArgoCD"
              {...register('username')}
            />
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Display name for the bot in Slack
            </p>
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label htmlFor="icon">Bot Icon (optional)</Label>
            <Input
              id="icon"
              placeholder=":rocket:"
              {...register('icon', {
                pattern: {
                  value: /^:[a-z0-9_+-]+:$/,
                  message: 'Icon must be in emoji format (e.g., :rocket:)',
                },
              })}
            />
            {errors.icon && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <IconCircleWarning size={12} />
                {errors.icon.message}
              </p>
            )}
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Slack emoji code (e.g., :rocket:, :white_check_mark:)
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
