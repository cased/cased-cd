import { useState } from 'react'
import { useNotificationsConfig } from '@/services/notifications'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { IconCircleInfo, IconBill, IconEmail, IconWebhook } from 'obra-icons-react'
import type { NotificationService } from '@/types/notifications'

export default function NotificationsPage() {
  const { data: config, isLoading, error } = useNotificationsConfig()
  const [selectedTab, setSelectedTab] = useState('services')

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <IconCircleInfo size={16} />
          <AlertDescription>
            Failed to load notifications configuration: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold mb-1">Notifications</h1>
        <p className="text-muted-foreground">
          Configure notification services, templates, and triggers for your applications
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="services">
            Services ({config?.services.length || 0})
          </TabsTrigger>
          <TabsTrigger value="templates">
            Templates ({config?.templates.length || 0})
          </TabsTrigger>
          <TabsTrigger value="triggers">
            Triggers ({config?.triggers.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          {config?.services.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  No notification services configured
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {config?.services.map((service) => (
                <ServiceCard key={service.name} service={service} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          {config?.templates.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  No notification templates configured
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {config?.templates.map((template) => (
                <TemplateCard key={template.name} template={template} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Triggers Tab */}
        <TabsContent value="triggers" className="space-y-4">
          {config?.triggers.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  No notification triggers configured
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {config?.triggers.map((trigger) => (
                <TriggerCard key={trigger.name} trigger={trigger} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
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
            <CardTitle className="text-lg">{service.name}</CardTitle>
            <CardDescription>
              <Badge variant="secondary" className="mt-1">
                {service.type}
              </Badge>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
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
          <IconBill size={20} />
          <CardTitle className="text-lg">{template.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
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
        <CardTitle className="text-lg">{trigger.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
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
      return <IconBill size={20} />
  }
}
