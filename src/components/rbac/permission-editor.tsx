import { useState, useEffect, useRef } from 'react'
import { IconCheck } from 'obra-icons-react'
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
import { getPoliciesForSubject, policyMatchesApp } from '@/lib/casbin-parser'
import type { CasbinPolicy } from '@/types/api'

interface PermissionEditorProps {
  accounts: Array<{ name: string; enabled: boolean }>
  projects: string[]
  currentPolicies: CasbinPolicy[]
  onAddPermissions: (policies: CasbinPolicy[], replaceFor?: { subject: string; project: string }) => Promise<void>
}

interface PermissionForm {
  subject: string
  project: string // "project" or "*" for all
  canView: boolean
  canDeploy: boolean
  canRollback: boolean
  canDelete: boolean
}

export function PermissionEditor({
  accounts,
  projects,
  currentPolicies,
  onAddPermissions,
}: PermissionEditorProps) {
  const [form, setForm] = useState<PermissionForm>({
    subject: '',
    project: '',
    canView: false,
    canDeploy: false,
    canRollback: false,
    canDelete: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Track previous subject/project to only reload permissions when they actually change
  const prevSubjectRef = useRef<string>('')
  const prevProjectRef = useRef<string>('')

  // Load existing permissions when user and project are selected
  const { subject, project } = form

  // Check if user has wildcard permissions and what they grant
  const wildcardPermissions = subject ? (() => {
    const userPolicies = getPoliciesForSubject(currentPolicies, subject)
    const wildcardPolicies = userPolicies.filter(p => p.object === '*/*')

    if (wildcardPolicies.length === 0) return null

    const hasWildcardAction = wildcardPolicies.some(p =>
      p.resource === '*' || (p.resource === 'applications' && p.action === '*')
    )

    const hasAction = (action: string) => wildcardPolicies.some(p =>
      (p.action === action || p.action === '*') &&
      (p.resource === 'applications' || p.resource === '*')
    )

    return {
      canView: hasWildcardAction || hasAction('get'),
      canDeploy: hasWildcardAction || hasAction('sync'),
      canRollback: hasWildcardAction || hasAction('action/*') || hasAction('action'),
      canDelete: hasWildcardAction || hasAction('delete'),
    }
  })() : null

  useEffect(() => {
    // Only reload permissions if subject or project actually changed
    if (subject === prevSubjectRef.current && project === prevProjectRef.current) {
      return
    }

    if (!subject || !project) return

    // Get policies for this user
    const userPolicies = getPoliciesForSubject(currentPolicies, subject)

    // Helper to check if user has a specific permission
    const hasPermission = (action: string): boolean => {
      return userPolicies.some(policy => {
        if (policy.action !== action && policy.action !== '*') return false
        if (policy.resource !== 'applications' && policy.resource !== '*') return false
        // Check if policy matches the project (project/* or */*)
        return policyMatchesApp(policy, project, '*')
      })
    }

    // Update form with existing permissions
    setForm(prev => ({
      ...prev,
      canView: hasPermission('get'),
      canDeploy: hasPermission('sync'),
      canRollback: hasPermission('action/*') || hasPermission('action'),
      canDelete: hasPermission('delete'),
    }))

    // Update refs to current values
    prevSubjectRef.current = subject
    prevProjectRef.current = project
  }, [subject, project, currentPolicies])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.subject || !form.project) return

    setIsSubmitting(true)

    try {
      // Generate policies for each selected action
      const policies: CasbinPolicy[] = []

      // Format the object as project/* or */* for all projects
      const policyObject = form.project === '*' ? '*/*' : `${form.project}/*`

      // Always include view permission if any other permission is selected
      if (form.canView || hasOtherActions) {
        policies.push({
          type: 'p',
          subject: form.subject,
          resource: 'applications',
          action: 'get',
          object: policyObject,
          effect: 'allow',
        })
      }

      if (form.canDeploy) {
        policies.push({
          type: 'p',
          subject: form.subject,
          resource: 'applications',
          action: 'sync',
          object: policyObject,
          effect: 'allow',
        })
      }

      if (form.canRollback) {
        policies.push({
          type: 'p',
          subject: form.subject,
          resource: 'applications',
          action: 'action/*',
          object: policyObject,
          effect: 'allow',
        })
      }

      if (form.canDelete) {
        policies.push({
          type: 'p',
          subject: form.subject,
          resource: 'applications',
          action: 'delete',
          object: policyObject,
          effect: 'allow',
        })
      }

      console.log('Setting permissions:', policies)

      // Replace all policies for this user/project combination
      await onAddPermissions(policies, { subject: form.subject, project: form.project })

      toast.success('Permissions updated successfully')

      // Don't reset user/project - keep them selected so user can see updated permissions
      // The useEffect will reload the permissions for this user/project combination
    } catch (error) {
      console.error('Failed to set permissions:', error)
      toast.error('Failed to update permissions')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasSelectedActions = form.canView || form.canDeploy || form.canRollback || form.canDelete
  const hasOtherActions = form.canDeploy || form.canRollback || form.canDelete

  // Check if we're editing a specific project (not wildcard) and user has wildcard permissions
  const isEditingSpecificProject = form.project && form.project !== '*'
  const hasWildcardPerms = isEditingSpecificProject ? wildcardPermissions : null

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

          {/* Project Selection */}
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={form.project} onValueChange={(value) => setForm({ ...form, project: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {/* All projects */}
                <SelectItem value="*">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">All Projects</Badge>
                  </div>
                </SelectItem>

                {/* Individual projects */}
                {projects.sort().map((project) => (
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Permissions Checkboxes */}
          <div className="space-y-3">
            <Label className="block mb-3">Permissions</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canView"
                  checked={form.canView || hasOtherActions || (hasWildcardPerms?.canView ?? false)}
                  disabled={!form.subject || !form.project || hasOtherActions || (hasWildcardPerms?.canView ?? false)}
                  onCheckedChange={(checked) => setForm({ ...form, canView: checked as boolean })}
                />
                <label
                  htmlFor="canView"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Can view{hasWildcardPerms?.canView ? ' (granted by All Projects)' : ''}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canDeploy"
                  checked={form.canDeploy || (hasWildcardPerms?.canDeploy ?? false)}
                  disabled={!form.subject || !form.project || (hasWildcardPerms?.canDeploy ?? false)}
                  onCheckedChange={(checked) => setForm({ ...form, canDeploy: checked as boolean, canView: checked ? true : form.canView })}
                />
                <label
                  htmlFor="canDeploy"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Can deploy{hasWildcardPerms?.canDeploy ? ' (granted by All Projects)' : ''}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canRollback"
                  checked={form.canRollback || (hasWildcardPerms?.canRollback ?? false)}
                  disabled={!form.subject || !form.project || (hasWildcardPerms?.canRollback ?? false)}
                  onCheckedChange={(checked) => setForm({ ...form, canRollback: checked as boolean, canView: checked ? true : form.canView })}
                />
                <label
                  htmlFor="canRollback"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Can rollback{hasWildcardPerms?.canRollback ? ' (granted by All Projects)' : ''}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canDelete"
                  checked={form.canDelete || (hasWildcardPerms?.canDelete ?? false)}
                  disabled={!form.subject || !form.project || (hasWildcardPerms?.canDelete ?? false)}
                  onCheckedChange={(checked) => setForm({ ...form, canDelete: checked as boolean, canView: checked ? true : form.canView })}
                />
                <label
                  htmlFor="canDelete"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Can delete{hasWildcardPerms?.canDelete ? ' (granted by All Projects)' : ''}
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-start">
            <Button
              type="submit"
              disabled={!form.subject || !form.project || !hasSelectedActions || isSubmitting}
            >
              <IconCheck className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Permissions'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
