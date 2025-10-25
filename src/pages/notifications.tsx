import { useState } from 'react'
import { IconCircleForward, IconMessage, IconEmail, IconWebhook, IconAdd, IconEdit, IconDelete } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorAlert } from '@/components/ui/error-alert'
import {
  useNotificationsConfig,
  useCreateSlackService,
  useTestSlackService,
  useDeleteNotificationService,
  useCreateGitHubService,
  useTestGitHubService,
  useUpdateSlackService,
  useUpdateGitHubService
} from '@/services/notifications'
import type { NotificationService } from '@/types/notifications'
import { CreateServicePanel, type ServiceType } from '@/components/notifications/create-service-panel'
import { SlackServiceForm, type SlackServiceFormData } from '@/components/notifications/slack-service-form'
import { GitHubServiceForm, type GitHubServiceFormData } from '@/components/notifications/github-service-form'
import { toast } from 'sonner'

export default function NotificationsPage() {
  const { data: config, isLoading, error, refetch } = useNotificationsConfig()
  const [selectedTab, setSelectedTab] = useState('services')
  const [createPanelOpen, setCreatePanelOpen] = useState(false)
  const [slackFormOpen, setSlackFormOpen] = useState(false)
  const [githubFormOpen, setGithubFormOpen] = useState(false)
  const [editingService, setEditingService] = useState<NotificationService | null>(null)

  const createSlackService = useCreateSlackService()
  const updateSlackService = useUpdateSlackService()
  const testSlackService = useTestSlackService()
  const deleteNotificationService = useDeleteNotificationService()
  const createGitHubService = useCreateGitHubService()
  const updateGitHubService = useUpdateGitHubService()
  const testGitHubService = useTestGitHubService()

  const handleServiceTypeSelected = (type: ServiceType) => {
    setCreatePanelOpen(false)

    // Show the appropriate form based on service type
    if (type === 'slack') {
      setSlackFormOpen(true)
    } else if (type === 'github') {
      setGithubFormOpen(true)
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

  const handleDeleteService = (serviceName: string) => {
    toast(`Delete service "${serviceName}"?`, {
      description: 'This action cannot be undone.',
      action: {
        label: 'Delete',
        onClick: async () => {
          toast.promise(
            deleteNotificationService.mutateAsync(serviceName),
            {
              loading: `Deleting service "${serviceName}"...`,
              success: `Service "${serviceName}" deleted successfully`,
              error: (err) => {
                const error = err as { response?: { data?: { message?: string } }; message?: string }
                return error.response?.data?.message || error.message || 'Failed to delete service'
              },
            }
          )
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {},
      },
    })
  }

  const handleEditService = (service: NotificationService) => {
    setEditingService(service)

    // Open the appropriate form based on service type
    if (service.type === 'slack') {
      setSlackFormOpen(true)
    } else if (service.type === 'github') {
      setGithubFormOpen(true)
    } else {
      toast.info(`Edit functionality for "${service.type}" services not yet implemented`)
    }
  }

  const parseSlackConfig = (config: string, name: string): SlackServiceFormData => {
    const lines = config.split('\n')
    const data: SlackServiceFormData = { name, webhookUrl: '' }

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

  const parseGitHubConfig = (config: string, name: string): GitHubServiceFormData => {
    const lines = config.split('\n')
    const data: GitHubServiceFormData = { name, installationId: '' }

    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':')
      const value = valueParts.join(':').trim()

      if (key.trim() === 'installationId') data.installationId = value
      else if (key.trim() === 'repositories') data.repositories = value
    })

    return data
  }

  const handleGitHubSubmit = async (data: GitHubServiceFormData) => {
    try {
      if (editingService) {
        await updateGitHubService.mutateAsync(data)
        toast.success(`GitHub service "${data.name}" updated successfully`)
      } else {
        await createGitHubService.mutateAsync(data)
        toast.success(`GitHub service "${data.name}" created successfully`)
      }
      setGithubFormOpen(false)
      setEditingService(null)
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save service'
      toast.error(errorMessage)
    }
  }

  const handleGitHubTest = async (data: GitHubServiceFormData) => {
    try {
      await testGitHubService.mutateAsync(data)
      toast.success('Test commit status sent successfully')
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send test'
      toast.error(errorMessage)
    }
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
                Configure notification services, templates, and triggers for your applications
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
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList>
                <TabsTrigger value="services">
                  Services ({config.services.length})
                </TabsTrigger>
                <TabsTrigger value="templates">
                  Templates ({config.templates.length})
                </TabsTrigger>
                <TabsTrigger value="triggers">
                  Triggers ({config.triggers.length})
                </TabsTrigger>
              </TabsList>

              {/* Services Tab */}
              <TabsContent value="services" className="space-y-4 mt-4">
                {config.services.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-neutral-600 dark:text-neutral-400 text-center text-sm">
                        No notification services configured
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {config.services.map((service) => (
                      <ServiceCard
                        key={service.name}
                        service={service}
                        onEdit={() => handleEditService(service)}
                        onDelete={() => handleDeleteService(service.name)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Templates Tab */}
              <TabsContent value="templates" className="space-y-4 mt-4">
                {config.templates.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-neutral-600 dark:text-neutral-400 text-center text-sm">
                        No notification templates configured
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {config.templates.map((template) => (
                      <TemplateCard key={template.name} template={template} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Triggers Tab */}
              <TabsContent value="triggers" className="space-y-4 mt-4">
                {config.triggers.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-neutral-600 dark:text-neutral-400 text-center text-sm">
                        No notification triggers configured
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {config.triggers.map((trigger) => (
                      <TriggerCard key={trigger.name} trigger={trigger} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
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

      {/* GitHub Service Form */}
      <GitHubServiceForm
        open={githubFormOpen}
        onOpenChange={(open) => {
          setGithubFormOpen(open)
          if (!open) setEditingService(null)
        }}
        onSubmit={handleGitHubSubmit}
        onTest={handleGitHubTest}
        isSubmitting={editingService ? updateGitHubService.isPending : createGitHubService.isPending}
        isTesting={testGitHubService.isPending}
        isEditing={!!editingService && editingService.type === 'github'}
        initialData={editingService && editingService.type === 'github' ? parseGitHubConfig(editingService.config, editingService.name) : undefined}
      />
    </div>
  )
}

// Service card component
function ServiceCard({
  service,
  onEdit,
  onDelete,
}: {
  service: NotificationService
  onEdit: () => void
  onDelete: () => void
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

// Template card component
function TemplateCard({ template }: { template: { name: string; config: string } }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <IconMessage size={20} />
          <CardTitle className="text-base">{template.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="text-xs bg-neutral-50 dark:bg-neutral-900 p-3 rounded border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          <code>{template.config}</code>
        </pre>
      </CardContent>
    </Card>
  )
}

// Trigger card component
function TriggerCard({ trigger }: { trigger: { name: string; config: string } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{trigger.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-xs bg-neutral-50 dark:bg-neutral-900 p-3 rounded border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          <code>{trigger.config}</code>
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
