import { useState } from 'react'
import { IconCircleForward, IconMessage, IconEmail, IconWebhook, IconAdd, IconEdit, IconDelete, IconFlask } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorAlert } from '@/components/ui/error-alert'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  useNotificationsConfig,
  useCreateSlackService,
  useTestSlackService,
  useDeleteNotificationService,
  useUpdateSlackService,
  useCreateWebhookService,
  useUpdateWebhookService,
  useTestWebhookService,
  useCreateEmailService,
  useUpdateEmailService,
  useTestEmailService
} from '@/services/notifications'
import type { NotificationService } from '@/types/notifications'
import { CreateServicePanel, type ServiceType } from '@/components/notifications/create-service-panel'
import { SlackServiceForm, type SlackServiceFormData } from '@/components/notifications/slack-service-form'
import { WebhookServiceForm, type WebhookServiceFormData } from '@/components/notifications/webhook-service-form'
import { EmailServiceForm, type EmailServiceFormData } from '@/components/notifications/email-service-form'
import { useDeleteHandler } from '@/hooks/useDeleteHandler'
import { toast } from 'sonner'

export default function NotificationsPage() {
  const { data: config, isLoading, error, refetch } = useNotificationsConfig()
  const [createPanelOpen, setCreatePanelOpen] = useState(false)
  const [slackFormOpen, setSlackFormOpen] = useState(false)
  const [webhookFormOpen, setWebhookFormOpen] = useState(false)
  const [emailFormOpen, setEmailFormOpen] = useState(false)
  const [editingService, setEditingService] = useState<NotificationService | null>(null)
  const [testingService, setTestingService] = useState<string | null>(null)

  const createSlackService = useCreateSlackService()
  const updateSlackService = useUpdateSlackService()
  const testSlackService = useTestSlackService()
  const createWebhookService = useCreateWebhookService()
  const updateWebhookService = useUpdateWebhookService()
  const testWebhookService = useTestWebhookService()
  const createEmailService = useCreateEmailService()
  const updateEmailService = useUpdateEmailService()
  const testEmailService = useTestEmailService()
  const deleteNotificationService = useDeleteNotificationService()

  const deleteHandler = useDeleteHandler({
    deleteFn: async (name: string) => {
      await deleteNotificationService.mutateAsync(name)
    },
    resourceType: 'Service',
    getId: (service: NotificationService) => service.name,
    getDisplayName: (service: NotificationService) => service.name,
    onSuccess: () => refetch(),
    isDeleting: deleteNotificationService.isPending,
  })

  const handleServiceTypeSelected = (type: ServiceType) => {
    setCreatePanelOpen(false)

    // Show the appropriate form based on service type
    if (type === 'slack') {
      setSlackFormOpen(true)
    } else if (type === 'webhook') {
      setWebhookFormOpen(true)
    } else if (type === 'email') {
      setEmailFormOpen(true)
    } else {
      // TODO: Handle other service types
      toast.info(`${type} service form not yet implemented`)
    }
  }

  const handleSlackSubmit = async (data: SlackServiceFormData) => {
    try {
      if (editingService) {
        await updateSlackService.mutateAsync(data)
        toast.success(`Slack service "${data.name}" updated successfully`)
      } else {
        await createSlackService.mutateAsync(data)
        toast.success(`Slack service "${data.name}" created successfully`)
      }
      setSlackFormOpen(false)
      setEditingService(null)
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save service'
      toast.error(errorMessage)
    }
  }

  const handleSlackTest = async (data: SlackServiceFormData) => {
    try {
      await testSlackService.mutateAsync(data)
      toast.success('Test notification sent successfully')
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send test notification'
      toast.error(errorMessage)
    }
  }

  const handleWebhookSubmit = async (data: WebhookServiceFormData) => {
    try {
      if (editingService) {
        await updateWebhookService.mutateAsync(data)
        toast.success(`Webhook service "${data.name}" updated successfully`)
      } else {
        await createWebhookService.mutateAsync(data)
        toast.success(`Webhook service "${data.name}" created successfully`)
      }
      setWebhookFormOpen(false)
      setEditingService(null)
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save service'
      toast.error(errorMessage)
    }
  }

  const handleWebhookTest = async (data: WebhookServiceFormData) => {
    try {
      await testWebhookService.mutateAsync(data)
      toast.success('Test webhook sent successfully')
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send test'
      toast.error(errorMessage)
    }
  }

  const handleEmailSubmit = async (data: EmailServiceFormData) => {
    try {
      if (editingService) {
        await updateEmailService.mutateAsync(data)
        toast.success(`Email service "${data.name}" updated successfully`)
      } else {
        await createEmailService.mutateAsync(data)
        toast.success(`Email service "${data.name}" created successfully`)
      }
      setEmailFormOpen(false)
      setEditingService(null)
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save service'
      toast.error(errorMessage)
    }
  }

  const handleEmailTest = async (data: EmailServiceFormData) => {
    try {
      await testEmailService.mutateAsync(data)
      toast.success('Test email sent successfully')
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send test email'
      toast.error(errorMessage)
    }
  }

  const handleEditService = (service: NotificationService) => {
    setEditingService(service)

    // Open the appropriate form based on service type
    if (service.type === 'slack') {
      setSlackFormOpen(true)
    } else if (service.type === 'webhook') {
      setWebhookFormOpen(true)
    } else if (service.type === 'email') {
      setEmailFormOpen(true)
    } else {
      toast.info(`Edit functionality for "${service.type}" services not yet implemented`)
    }
  }

  const handleTestService = async (service: NotificationService) => {
    setTestingService(service.name)
    try {
      if (service.type === 'slack') {
        const data = parseSlackConfig(service.config, service.name)
        await testSlackService.mutateAsync(data)
        toast.success('Test notification sent successfully')
      } else if (service.type === 'webhook') {
        const data = parseWebhookConfig(service.config, service.name)
        await testWebhookService.mutateAsync(data)
        toast.success('Test webhook sent successfully')
      } else if (service.type === 'email') {
        const data = parseEmailConfig(service.config, service.name)
        await testEmailService.mutateAsync(data)
        toast.success('Test email sent successfully')
      } else {
        toast.info(`Test functionality for "${service.type}" services not yet implemented`)
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send test'
      toast.error(errorMessage)
    } finally {
      setTestingService(null)
    }
  }

  const parseSlackConfig = (config: string, name: string): SlackServiceFormData => {
    const lines = config.split('\n')
    const data: SlackServiceFormData = {
      name,
      webhookUrl: '',
      events: {
        onDeployed: true,
        onSyncFailed: true,
        onHealthDegraded: true,
      },
    }

    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':')
      const value = valueParts.join(':').trim()

      if (key.trim() === 'webhookUrl') data.webhookUrl = value
      else if (key.trim() === 'channel') data.channel = value
      else if (key.trim() === 'username') data.username = value
      else if (key.trim() === 'icon') data.icon = value
    })

    return data
  }

  const parseWebhookConfig = (config: string, name: string): WebhookServiceFormData => {
    const lines = config.split('\n')
    const data: WebhookServiceFormData = {
      name,
      url: '',
      events: {
        onDeployed: true,
        onSyncFailed: true,
        onHealthDegraded: true,
      },
    }

    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':')
      const value = valueParts.join(':').trim()

      if (key.trim() === 'url') data.url = value
    })

    return data
  }

  const parseEmailConfig = (config: string, name: string): EmailServiceFormData => {
    const lines = config.split('\n')
    const data: EmailServiceFormData = {
      name,
      smtpHost: '',
      smtpPort: '587',
      username: '',
      password: '',
      from: '',
      events: {
        onDeployed: true,
        onSyncFailed: true,
        onHealthDegraded: true,
      },
    }

    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':')
      const value = valueParts.join(':').trim()

      if (key.trim() === 'host') data.smtpHost = value
      else if (key.trim() === 'port') data.smtpPort = value
      else if (key.trim() === 'username') data.username = value
      else if (key.trim() === 'password') data.password = value
      else if (key.trim() === 'from') data.from = value
      else if (key.trim() === 'to') data.to = value
    })

    return data
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-black dark:text-white tracking-tight">Notifications</h1>
              <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                Configure notification services to receive alerts about your deployments
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <IconCircleForward size={16} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </Button>
              <Button onClick={() => setCreatePanelOpen(true)}>
                <IconAdd size={16} />
                Add Service
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-4">
          {/* Loading State */}
          {isLoading && (
            <LoadingSpinner message="Loading notifications configuration..." />
          )}

          {/* Error State */}
          {error && (
            <ErrorAlert
              error={error}
              onRetry={() => refetch()}
              title="Failed to load notifications configuration"
              icon="close"
              size="sm"
            />
          )}

          {/* Notifications Content */}
          {!isLoading && !error && config && (
            <div className="space-y-4">
              {config.services.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-neutral-600 dark:text-neutral-400 text-center text-sm">
                      No notification services configured. Click "Add Service" to get started.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {config.services.map((service) => (
                    <ServiceCard
                      key={service.name}
                      service={service}
                      onTest={() => handleTestService(service)}
                      onEdit={() => handleEditService(service)}
                      onDelete={() => deleteHandler.handleDeleteClick(service)}
                      isTesting={testingService === service.name}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Service Panel */}
      <CreateServicePanel
        open={createPanelOpen}
        onOpenChange={setCreatePanelOpen}
        onServiceTypeSelected={handleServiceTypeSelected}
      />

      {/* Slack Service Form */}
      <SlackServiceForm
        open={slackFormOpen}
        onOpenChange={(open) => {
          setSlackFormOpen(open)
          if (!open) setEditingService(null)
        }}
        onSubmit={handleSlackSubmit}
        onTest={handleSlackTest}
        isSubmitting={editingService ? updateSlackService.isPending : createSlackService.isPending}
        isTesting={testSlackService.isPending}
        isEditing={!!editingService && editingService.type === 'slack'}
        initialData={editingService && editingService.type === 'slack' ? parseSlackConfig(editingService.config, editingService.name) : undefined}
      />

      {/* Webhook Service Form */}
      <WebhookServiceForm
        open={webhookFormOpen}
        onOpenChange={(open) => {
          setWebhookFormOpen(open)
          if (!open) setEditingService(null)
        }}
        onSubmit={handleWebhookSubmit}
        onTest={handleWebhookTest}
        isSubmitting={editingService ? updateWebhookService.isPending : createWebhookService.isPending}
        isTesting={testWebhookService.isPending}
        isEditing={!!editingService && editingService.type === 'webhook'}
        initialData={editingService && editingService.type === 'webhook' ? parseWebhookConfig(editingService.config, editingService.name) : undefined}
      />

      {/* Email Service Form */}
      <EmailServiceForm
        open={emailFormOpen}
        onOpenChange={(open) => {
          setEmailFormOpen(open)
          if (!open) setEditingService(null)
        }}
        onSubmit={handleEmailSubmit}
        onTest={handleEmailTest}
        isSubmitting={editingService ? updateEmailService.isPending : createEmailService.isPending}
        isTesting={testEmailService.isPending}
        isEditing={!!editingService && editingService.type === 'email'}
        initialData={editingService && editingService.type === 'email' ? parseEmailConfig(editingService.config, editingService.name) : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteHandler.dialogOpen}
        onOpenChange={deleteHandler.setDialogOpen}
        title="Delete notification service"
        description={`Are you sure you want to delete "${deleteHandler.resourceToDelete?.name}"? This will remove the service configuration.`}
        resourceName={deleteHandler.resourceToDelete?.name || ''}
        resourceType="notification service"
        onConfirm={deleteHandler.handleDeleteConfirm}
        isLoading={deleteHandler.isDeleting}
        requireTyping={false}
      />
    </div>
  )
}

// Service card component
function ServiceCard({
  service,
  onTest,
  onEdit,
  onDelete,
  isTesting,
}: {
  service: NotificationService
  onTest: () => void
  onEdit: () => void
  onDelete: () => void
  isTesting: boolean
}) {
  const icon = getServiceIcon(service.type)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {icon}
          <div className="flex-1">
            <CardTitle className="text-base">{service.name}</CardTitle>
            <CardDescription>
              <Badge variant="secondary" className="mt-1">
                {service.type}
              </Badge>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onTest}
              disabled={isTesting}
              className="h-8"
            >
              <IconFlask size={14} className={isTesting ? 'animate-pulse' : ''} />
              Test
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-8 px-2"
            >
              <IconEdit size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="h-8 px-2 text-red-600 hover:text-red-700 hover:border-red-600"
            >
              <IconDelete size={14} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="text-xs bg-neutral-50 dark:bg-neutral-900 p-3 rounded border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          <code>{service.config}</code>
        </pre>
      </CardContent>
    </Card>
  )
}

// Helper to get icon for service type
function getServiceIcon(type: NotificationService['type']) {
  switch (type) {
    case 'email':
      return <IconEmail size={20} />
    case 'webhook':
      return <IconWebhook size={20} />
    default:
      return <IconMessage size={20} />
  }
}
