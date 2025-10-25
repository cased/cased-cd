import { useState } from 'react'
import { IconMessage, IconWebhook, IconEmail } from 'obra-icons-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export type ServiceType = 'slack' | 'webhook' | 'email'

interface CreateServicePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onServiceTypeSelected: (type: ServiceType) => void
}

export function CreateServicePanel({
  open,
  onOpenChange,
  onServiceTypeSelected,
}: CreateServicePanelProps) {
  const [selectedType, setSelectedType] = useState<ServiceType | null>(null)

  const serviceTypes = [
    {
      type: 'slack' as ServiceType,
      name: 'Slack',
      description: 'Send notifications to Slack channels',
      icon: IconMessage,
      color: 'text-purple-600',
    },
    {
      type: 'webhook' as ServiceType,
      name: 'Webhook',
      description: 'Send HTTP requests to custom endpoints',
      icon: IconWebhook,
      color: 'text-blue-600',
    },
    {
      type: 'email' as ServiceType,
      name: 'Email',
      description: 'Send notifications via SMTP',
      icon: IconEmail,
      color: 'text-red-600',
    },
  ]

  const handleSelectType = (type: ServiceType) => {
    setSelectedType(type)
    onServiceTypeSelected(type)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Notification Service</DialogTitle>
          <DialogDescription>
            Choose a service type to configure notifications for your applications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {serviceTypes.map((service) => {
              const Icon = service.icon
              const isSelected = selectedType === service.type

              return (
                <Card
                  key={service.type}
                  className={`cursor-pointer transition-all hover:border-neutral-400 dark:hover:border-neutral-600 ${
                    isSelected
                      ? 'border-blue-500 dark:border-blue-500 ring-1 ring-blue-500'
                      : ''
                  }`}
                  onClick={() => handleSelectType(service.type)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div
                        className={`p-3 rounded-lg bg-neutral-100 dark:bg-neutral-900 ${service.color}`}
                      >
                        <Icon size={24} />
                      </div>
                      <CardTitle className="text-sm">{service.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-xs text-center">
                      {service.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
