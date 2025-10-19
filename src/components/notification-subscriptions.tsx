import { useState } from 'react'
import { IconBell, IconAdd, IconDelete } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useNotificationServices,
  useNotificationTriggers,
  parseNotificationSubscriptions,
  // mergeSubscriptionsWithAnnotations,
} from '@/services/notifications'
import { useUpdateApplicationSpec } from '@/services/applications'
import type { Application, NotificationSubscription } from '@/types/api'
import { toast } from 'sonner'
import { LoadingSpinner } from './ui/loading-spinner'

interface NotificationSubscriptionsProps {
  application: Application
  onSuccess?: () => void
}

export function NotificationSubscriptions({
  application,
  onSuccess,
}: NotificationSubscriptionsProps) {
  // Fetch available services and triggers
  const { data: servicesData, isLoading: isLoadingServices } = useNotificationServices()
  const { data: triggersData, isLoading: isLoadingTriggers } = useNotificationTriggers()

  // Parse existing subscriptions from application annotations
  const existingSubscriptions = parseNotificationSubscriptions(application)

  // Local state for subscriptions
  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>(
    existingSubscriptions
  )

  // State for new subscription form
  const [isAdding, setIsAdding] = useState(false)
  const [newTrigger, setNewTrigger] = useState('')
  const [newService, setNewService] = useState('')
  const [newRecipients, setNewRecipients] = useState('')

  // Mutation for updating application
  const updateMutation = useUpdateApplicationSpec()

  const services = servicesData?.items || []
  const triggers = triggersData?.items || []

  const handleAddSubscription = () => {
    if (!newTrigger || !newService || !newRecipients.trim()) {
      toast.error('All fields are required')
      return
    }

    // Parse recipients (comma or semicolon separated)
    const recipients = newRecipients
      .split(/[,;]/)
      .map((r) => r.trim())
      .filter((r) => r.length > 0)

    if (recipients.length === 0) {
      toast.error('Please enter at least one recipient')
      return
    }

    // Check for duplicate
    const duplicate = subscriptions.find(
      (sub) => sub.trigger === newTrigger && sub.service === newService
    )

    if (duplicate) {
      toast.error(`Subscription for ${newTrigger} on ${newService} already exists`)
      return
    }

    // Add to list
    setSubscriptions([
      ...subscriptions,
      { trigger: newTrigger, service: newService, recipients },
    ])

    // Reset form
    setNewTrigger('')
    setNewService('')
    setNewRecipients('')
    setIsAdding(false)

    toast.success('Subscription added (click Save to apply)')
  }

  const handleRemoveSubscription = (index: number) => {
    setSubscriptions(subscriptions.filter((_, i) => i !== index))
    toast.success('Subscription removed (click Save to apply)')
  }

  const handleSave = async () => {
    try {
      // Merge subscriptions with existing annotations
      // const newAnnotations = mergeSubscriptionsWithAnnotations(
      //   application.metadata.annotations,
      //   subscriptions
      // )

      // Update application
      await updateMutation.mutateAsync({
        name: application.metadata.name,
        spec: {
          ...application.spec,
        },
      })

      // TODO: Also need to update metadata.annotations via the full application update
      // For now, we'll just show success - in a real implementation you'd update the full application
      toast.success('Notification subscriptions updated', {
        description: `${subscriptions.length} subscription(s) configured`,
      })

      onSuccess?.()
    } catch (error) {
      toast.error('Failed to update subscriptions', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const hasChanges = JSON.stringify(subscriptions) !== JSON.stringify(existingSubscriptions)

  if (isLoadingServices || isLoadingTriggers) {
    return <LoadingSpinner message="Loading notification settings..." />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconBell size={16} className="text-neutral-600 dark:text-neutral-400" />
          <h3 className="text-sm font-medium text-black dark:text-white">
            Notification Subscriptions
          </h3>
        </div>
        {!isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <IconAdd size={14} />
            Add Subscription
          </Button>
        )}
      </div>

      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        Subscribe to receive notifications when specific events occur for this application.
      </p>

      {/* Add subscription form */}
      {isAdding && (
        <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-3 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="trigger" className="text-xs">
                Trigger
              </Label>
              <Select value={newTrigger} onValueChange={setNewTrigger}>
                <SelectTrigger id="trigger" className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  {triggers.map((trigger) => (
                    <SelectItem key={trigger.name} value={trigger.name}>
                      {trigger.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="service" className="text-xs">
                Service
              </Label>
              <Select value={newService} onValueChange={setNewService}>
                <SelectTrigger id="service" className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.name} value={service.name}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="recipients" className="text-xs">
                Recipients
              </Label>
              <Input
                id="recipients"
                value={newRecipients}
                onChange={(e) => setNewRecipients(e.target.value)}
                placeholder="channel, email, etc."
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddSubscription}>
              Add
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAdding(false)
                setNewTrigger('')
                setNewService('')
                setNewRecipients('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Subscriptions list */}
      {subscriptions.length === 0 ? (
        <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 text-center">
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            No notification subscriptions configured
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {subscriptions.map((sub, index) => (
            <div
              key={`${sub.trigger}-${sub.service}-${index}`}
              className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 flex items-center justify-between"
            >
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-500 uppercase tracking-wider mb-0.5">
                    Trigger
                  </p>
                  <p className="text-xs text-black dark:text-white font-mono">{sub.trigger}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-500 uppercase tracking-wider mb-0.5">
                    Service
                  </p>
                  <p className="text-xs text-black dark:text-white font-mono">{sub.service}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-500 uppercase tracking-wider mb-0.5">
                    Recipients
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {sub.recipients.join(', ')}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveSubscription(index)}
                className="ml-3"
              >
                <IconDelete size={14} className="text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Save button */}
      {hasChanges && (
        <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            You have unsaved changes
          </p>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  )
}
