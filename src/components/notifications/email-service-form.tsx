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

export interface EmailServiceFormData {
  name: string
  smtpHost: string
  smtpPort: string
  username: string
  password: string
  from: string
  to?: string
  events?: {
    onDeployed: boolean
    onSyncFailed: boolean
    onHealthDegraded: boolean
  }
}

interface EmailServiceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EmailServiceFormData) => void
  onTest?: (data: EmailServiceFormData) => void
  isSubmitting?: boolean
  isTesting?: boolean
  isEditing?: boolean
  initialData?: EmailServiceFormData
}

export function EmailServiceForm({
  open,
  onOpenChange,
  onSubmit,
  onTest,
  isSubmitting = false,
  isTesting = false,
  isEditing = false,
  initialData,
}: EmailServiceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    reset,
  } = useForm<EmailServiceFormData>({
    defaultValues: initialData || {
      name: 'email',
      smtpPort: '587',
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
          <DialogTitle>{isEditing ? 'Edit' : 'Configure'} Email Notification Service</DialogTitle>
          <DialogDescription>
            Send email notifications via SMTP when deployment events occur.
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
              placeholder="email"
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
              A unique identifier for this service (e.g., my-email, prod-email)
            </p>
          </div>

          {/* SMTP Host */}
          <div className="space-y-2">
            <Label htmlFor="smtpHost">
              SMTP Host <span className="text-red-500">*</span>
            </Label>
            <Input
              id="smtpHost"
              placeholder="smtp.gmail.com"
              {...register('smtpHost', {
                required: 'SMTP host is required',
              })}
            />
            {errors.smtpHost && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <IconCircleWarning size={12} />
                {errors.smtpHost.message}
              </p>
            )}
          </div>

          {/* SMTP Port */}
          <div className="space-y-2">
            <Label htmlFor="smtpPort">
              SMTP Port <span className="text-red-500">*</span>
            </Label>
            <Input
              id="smtpPort"
              placeholder="587"
              {...register('smtpPort', {
                required: 'SMTP port is required',
                pattern: {
                  value: /^\d+$/,
                  message: 'Must be a valid port number',
                },
              })}
            />
            {errors.smtpPort && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <IconCircleWarning size={12} />
                {errors.smtpPort.message}
              </p>
            )}
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Common ports: 587 (TLS), 465 (SSL), 25 (non-encrypted)
            </p>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">
              SMTP Username <span className="text-red-500">*</span>
            </Label>
            <Input
              id="username"
              placeholder="user@example.com"
              {...register('username', {
                required: 'Username is required',
              })}
            />
            {errors.username && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <IconCircleWarning size={12} />
                {errors.username.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              SMTP Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password', {
                required: 'Password is required',
              })}
            />
            {errors.password && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <IconCircleWarning size={12} />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* From Address */}
          <div className="space-y-2">
            <Label htmlFor="from">
              From Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="from"
              type="email"
              placeholder="notifications@example.com"
              {...register('from', {
                required: 'From address is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Must be a valid email address',
                },
              })}
            />
            {errors.from && (
              <p className="text-xs text-red-red-500 flex items-center gap-1">
                <IconCircleWarning size={12} />
                {errors.from.message}
              </p>
            )}
          </div>

          {/* To Address (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="to">
              To Address (Optional)
            </Label>
            <Input
              id="to"
              type="email"
              placeholder="team@example.com"
              {...register('to', {
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Must be a valid email address',
                },
              })}
            />
            {errors.to && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <IconCircleWarning size={12} />
                {errors.to.message}
              </p>
            )}
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Default recipient for test emails. Can be overridden per application.
            </p>
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
              Select which events should trigger email notifications
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
