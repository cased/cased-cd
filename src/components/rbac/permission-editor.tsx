import { useState } from 'react'
import { IconAdd } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { CasbinPolicy } from '@/types/api'

interface PermissionEditorProps {
  accounts: Array<{ name: string; enabled: boolean }>
  apps: Array<{ name: string; project: string }>
  projects: string[]
  onAddPermissions: (policies: CasbinPolicy[]) => Promise<void>
}

interface PermissionForm {
  subject: string
  app: string // "project/app" or "*/*" for all
  canView: boolean
  canDeploy: boolean
  canRollback: boolean
  canDelete: boolean
}

export function PermissionEditor({
  accounts,
  apps,
  projects,
  onAddPermissions,
}: PermissionEditorProps) {
  const [form, setForm] = useState<PermissionForm>({
    subject: '',
    app: '',
    canView: false,
    canDeploy: false,
    canRollback: false,
    canDelete: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.subject || !form.app) return

    setIsSubmitting(true)

    try {
      // Generate policies for each selected action
      const policies: CasbinPolicy[] = []

      if (form.canView) {
        policies.push({
          type: 'p',
          subject: form.subject,
          resource: 'applications',
          action: 'get',
          object: form.app,
          effect: 'allow',
        })
      }

      if (form.canDeploy) {
        policies.push({
          type: 'p',
          subject: form.subject,
          resource: 'applications',
          action: 'sync',
          object: form.app,
          effect: 'allow',
        })
      }

      if (form.canRollback) {
        policies.push({
          type: 'p',
          subject: form.subject,
          resource: 'applications',
          action: 'action/*',
          object: form.app,
          effect: 'allow',
        })
      }

      if (form.canDelete) {
        policies.push({
          type: 'p',
          subject: form.subject,
          resource: 'applications',
          action: 'delete',
          object: form.app,
          effect: 'allow',
        })
      }

      console.log('Setting permissions:', policies)

      // Add all policies in a single batch
      await onAddPermissions(policies)

      toast.success('Permissions updated successfully')

      // Reset form
      setForm({
        subject: '',
        app: '',
        canView: false,
        canDeploy: false,
        canRollback: false,
        canDelete: false,
      })
    } catch (error) {
      console.error('Failed to set permissions:', error)
      toast.error('Failed to update permissions')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasSelectedActions = form.canView || form.canDeploy || form.canRollback || form.canDelete

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Permissions</CardTitle>
        <CardDescription>
          Configure what users can do with applications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label>User</Label>
            <Select value={form.subject} onValueChange={(value) => setForm({ ...form, subject: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter(account => account.name !== 'admin') // Filter out built-in admin account
                  .map((account) => (
                    <SelectItem key={account.name} value={account.name}>
                      {account.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* App Selection */}
          <div className="space-y-2">
            <Label>Scope</Label>
            <Select value={form.app} onValueChange={(value) => setForm({ ...form, app: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select scope (project or app)" />
              </SelectTrigger>
              <SelectContent>
                {/* Global wildcard */}
                <SelectItem value="*/*">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">All Projects</Badge>
                    <span className="text-xs text-neutral-500">All apps in all projects</span>
                  </div>
                </SelectItem>

                {/* Project-level wildcards */}
                {projects.sort().map((project) => (
                  <SelectItem key={`${project}/*`} value={`${project}/*`}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{project}/*</Badge>
                      <span className="text-xs text-neutral-500">All apps in {project}</span>
                    </div>
                  </SelectItem>
                ))}

                {/* Individual apps */}
                {apps.map((app) => (
                  <SelectItem key={`${app.project}/${app.name}`} value={`${app.project}/${app.name}`}>
                    {app.name}
                    <span className="text-xs text-neutral-500 ml-2">({app.project})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Permissions Checkboxes */}
          <div className="space-y-3">
            <Label>Permissions</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canView"
                  checked={form.canView}
                  onCheckedChange={(checked) => setForm({ ...form, canView: checked as boolean })}
                />
                <label
                  htmlFor="canView"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Can view
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canDeploy"
                  checked={form.canDeploy}
                  onCheckedChange={(checked) => setForm({ ...form, canDeploy: checked as boolean })}
                />
                <label
                  htmlFor="canDeploy"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Can deploy
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canRollback"
                  checked={form.canRollback}
                  onCheckedChange={(checked) => setForm({ ...form, canRollback: checked as boolean })}
                />
                <label
                  htmlFor="canRollback"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Can rollback
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canDelete"
                  checked={form.canDelete}
                  onCheckedChange={(checked) => setForm({ ...form, canDelete: checked as boolean })}
                />
                <label
                  htmlFor="canDelete"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Can delete
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!form.subject || !form.app || !hasSelectedActions || isSubmitting}
            >
              <IconAdd className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Setting...' : 'Set Permissions'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
