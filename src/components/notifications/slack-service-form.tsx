import { useState, useEffect } from 'react'
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
import { toast } from 'sonner'

export interface SlackServiceFormData {
  name: string
  webhookUrl: string
  channel?: string
  username?: string
  icon?: string
  events?: {
    onDeployed: boolean
    onSyncFailed: boolean
    onHealthDegraded: boolean
  }
}

interface SlackServiceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SlackServiceFormData) => void
  onTest?: (data: SlackServiceFormData) => void
  isSubmitting?: boolean
  isTesting?: boolean
  isEditing?: boolean
  initialData?: SlackServiceFormData
}

export function SlackServiceForm({
  open,
  onOpenChange,
  onSubmit,
  onTest,
  isSubmitting = false,
  isTesting = false,
  isEditing = false,
  initialData,
}: SlackServiceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    reset,
  } = useForm<SlackServiceFormData>({
    defaultValues: initialData || {
      name: 'slack',
      username: 'Cased Deploy',
      icon: ':rocket:',
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
          <DialogTitle>{isEditing ? 'Edit' : 'Configure'} Slack Notification Service</DialogTitle>
          <DialogDescription>
            Send notifications to Slack channels using a webhook URL from a Slack app.
          </DialogDescription>
        </DialogHeader>

        {!isEditing && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Quick Setup: Create Slack App in 60 Seconds
                </h3>
                <p className="text-xs text-blue-800 dark:text-blue-200 mb-3">
                  Copy the manifest and create your Slack app - it's already configured with all the permissions you need
                </p>
                <div className="flex gap-2 items-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="bg-white dark:bg-neutral-900 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => window.open('https://api.slack.com/apps?new_app=1', '_blank')}
                  >
                    1. Open Slack →
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="bg-white dark:bg-neutral-900 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={async () => {
                      const manifest = JSON.stringify({
                        "display_information": {
                          "name": "Cased Deploy Notifications",
                          "description": "Receive deployment notifications from Cased Deploy (ArgoCD)",
                          "background_color": "#2c3e50"
                        },
                        "features": {
                          "bot_user": {
                            "display_name": "Cased Deploy",
                            "always_online": true
                          }
                        },
                        "oauth_config": {
                          "scopes": {
                            "bot": [
                              "incoming-webhook",
                              "chat:write",
                              "chat:write.public"
                            ]
                          }
                        },
                        "settings": {
                          "org_deploy_enabled": false,
                          "socket_mode_enabled": false,
                          "token_rotation_enabled": false
                        }
                      }, null, 2)
                      try {
                        await navigator.clipboard.writeText(manifest)
                        toast.success('Manifest copied! Now paste it in Slack when creating your app.')
                      } catch {
                        toast.error('Failed to copy manifest. Please copy it manually from the file.')
                      }
                    }}
                  >
                    2. Copy Manifest
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Service Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Service Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="slack"
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
                className="pr-16"
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
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  How to get your webhook URL
                </summary>
                <ol className="list-decimal list-inside mt-3 space-y-2 text-neutral-700 dark:text-neutral-300 pl-2">
                  <li>After creating your app, go to "Incoming Webhooks" → "Add New Webhook to Workspace"</li>
                  <li>Select the channel where you want notifications posted</li>
                  <li>Copy the webhook URL (starts with <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">https://hooks.slack.com/services/...</code>)</li>
                  <li>Paste it into the field above</li>
                </ol>
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
              Select which events should trigger notifications to this Slack service
            </p>
          </div>

          {/* Advanced Options */}
          <details className="border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
              Advanced Options
            </summary>
            <div className="px-4 pb-4 pt-2 space-y-6">
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
                  placeholder="Cased Deploy"
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
            </div>
          </details>

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
