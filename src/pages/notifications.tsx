import { useState } from 'react'
import { IconCircleForward, IconMessage, IconEmail, IconWebhook } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorAlert } from '@/components/ui/error-alert'
import { useNotificationsConfig } from '@/services/notifications'
import type { NotificationService } from '@/types/notifications'

export default function NotificationsPage() {
  const { data: config, isLoading, error, refetch } = useNotificationsConfig()
  const [selectedTab, setSelectedTab] = useState('services')

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
                      <ServiceCard key={service.name} service={service} />
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
    </div>
  )
}

// Service card component
function ServiceCard({ service }: { service: NotificationService }) {
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
