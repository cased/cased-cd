import { useState } from 'react'
import { IconLock, IconUser, IconClose } from 'obra-icons-react'
import { useAccounts, useRBACConfig, useUpdateRBACConfig } from '@/services/accounts'
import { useApplications } from '@/services/applications'
import { useProjects } from '@/services/projects'
import { useHasFeature } from '@/services/license'
import { parseRBACConfig, getPoliciesForSubject, policyMatchesApp, generatePolicyCsv } from '@/lib/casbin-parser'
import { PermissionEditor } from '@/components/rbac/permission-editor'
import { ErrorAlert } from '@/components/ui/error-alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UpgradeModal } from '@/components/upgrade-modal'
import { PageHeader } from '@/components/page-header'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import type { CasbinPolicy } from '@/types/api'

// User-facing capabilities mapped from low-level permissions
interface AppCapabilities {
  canView: boolean
  canDeploy: boolean
  canRollback: boolean
  canDelete: boolean
  isFullAccess: boolean
}

export function RBACPage() {
  const hasRBAC = useHasFeature('rbac')
  const [showUpgrade, setShowUpgrade] = useState(!hasRBAC)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const { data: accountsData, isLoading: loadingAccounts, error: accountsError } = useAccounts()
  const { data: rbacData, isLoading: loadingRBAC, error: rbacError } = useRBACConfig()
  const { data: appsData, isLoading: loadingApps } = useApplications()
  const { data: projectsData, isLoading: loadingProjects } = useProjects()
  const updateRBACMutation = useUpdateRBACConfig()

  // If user doesn't have RBAC feature, show upgrade modal
  if (!hasRBAC) {
    return (
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature="RBAC"
        featureDescription="Advanced role-based access control is available on the Enterprise plan. Manage per-app permissions, granular access policies, and more."
      />
    )
  }

  if (loadingAccounts || loadingRBAC || loadingApps || loadingProjects) {
    return <LoadingSpinner />
  }

  if (accountsError) {
    return <ErrorAlert error={accountsError} title="Failed to load accounts" />
  }

  if (rbacError) {
    return <ErrorAlert error={rbacError} title="Failed to load RBAC configuration" />
  }

  const accounts = accountsData?.items || []
  const applications = appsData?.items || []
  const parsedRBAC = rbacData ? parseRBACConfig(rbacData) : { policies: [], raw: '' }

  // Get all project names
  const projects = (projectsData?.items || []).map(project => project.metadata.name)

  // Function to check if user has specific permission for a project
  const hasPermission = (subject: string, action: string, project: string): boolean => {
    const policies = getPoliciesForSubject(parsedRBAC.policies, subject)

    return policies.some(policy => {
      if (policy.action !== action && policy.action !== '*') return false
      if (policy.resource !== 'applications' && policy.resource !== '*') return false
      return policyMatchesApp(policy, project, '*')
    })
  }

  // Get user-facing capabilities for a project
  const getCapabilities = (subject: string, project: string): AppCapabilities => {
    const policies = getPoliciesForSubject(parsedRBAC.policies, subject)

    // Check for wildcards (full access) - only if action is truly '*' or resource is '*'
    const hasWildcard = policies.some(p =>
      (p.resource === '*' || (p.resource === 'applications' && p.action === '*')) && policyMatchesApp(p, project, '*')
    )

    const canView = hasWildcard || hasPermission(subject, 'get', project)
    const canDeploy = hasWildcard || hasPermission(subject, 'sync', project)
    const canRollback = hasWildcard || hasPermission(subject, 'action/*', project) || hasPermission(subject, 'action', project)
    const canDelete = hasWildcard || hasPermission(subject, 'delete', project)

    // Only mark as full access if they have ALL permissions
    const isFullAccess = canView && canDeploy && canRollback && canDelete

    return {
      canView,
      canDeploy,
      canRollback,
      canDelete,
      isFullAccess,
    }
  }

  // Get capabilities from ONLY the wildcard (*/*) policies
  const getWildcardOnlyCapabilities = (subject: string): AppCapabilities => {
    const policies = getPoliciesForSubject(parsedRBAC.policies, subject)

    // Only consider policies with object = '*/*'
    const wildcardPolicies = policies.filter(p => p.object === '*/*')

    const hasWildcardAction = wildcardPolicies.some(p =>
      p.resource === '*' || (p.resource === 'applications' && p.action === '*')
    )

    const hasAction = (action: string) => wildcardPolicies.some(p =>
      (p.action === action || p.action === '*') &&
      (p.resource === 'applications' || p.resource === '*')
    )

    const canView = hasWildcardAction || hasAction('get')
    const canDeploy = hasWildcardAction || hasAction('sync')
    const canRollback = hasWildcardAction || hasAction('action/*') || hasAction('action')
    const canDelete = hasWildcardAction || hasAction('delete')

    const isFullAccess = canView && canDeploy && canRollback && canDelete

    return {
      canView,
      canDeploy,
      canRollback,
      canDelete,
      isFullAccess,
    }
  }

  // Get all policies for selected user
  const selectedUserPolicies = selectedUser
    ? getPoliciesForSubject(parsedRBAC.policies, selectedUser)
    : []

  // Handler to add new permissions (batch)
  const handleAddPermissions = async (policies: CasbinPolicy[], replaceFor?: { subject: string; project: string }) => {
    if (!rbacData) {
      console.error('No RBAC data available')
      return
    }

    console.log('handleAddPermissions called with:', policies)
    console.log('Current policies count:', parsedRBAC.policies.length)

    let updatedPolicies: CasbinPolicy[]

    if (replaceFor) {
      // Remove existing policies for this user/project combination
      const policyObject = replaceFor.project === '*' ? '*/*' : `${replaceFor.project}/*`

      console.log(`Replacing policies for subject=${replaceFor.subject}, object=${policyObject}`)

      // Filter out policies that match this subject and project
      updatedPolicies = parsedRBAC.policies.filter(policy => {
        const isMatchingSubject = policy.subject === replaceFor.subject
        const isMatchingObject = policy.object === policyObject

        // Keep policy if it doesn't match both subject and object
        return !(isMatchingSubject && isMatchingObject)
      })

      console.log(`Filtered out ${parsedRBAC.policies.length - updatedPolicies.length} existing policies`)

      // Add new policies
      updatedPolicies = [...updatedPolicies, ...policies]
    } else {
      // Just append new policies (legacy behavior)
      updatedPolicies = [...parsedRBAC.policies, ...policies]
    }

    const updatedPolicyCsv = generatePolicyCsv(updatedPolicies)

    console.log('Updated policies count:', updatedPolicies.length)
    console.log('Calling mutation...')

    await updateRBACMutation.mutateAsync({
      ...rbacData,
      policy: updatedPolicyCsv,
    })

    console.log('Mutation complete')
  }

  // Handler to clear all permissions for a user
  const handleClearPermissions = async (subject: string) => {
    if (!rbacData) {
      console.error('No RBAC data available')
      return
    }

    try {
      // Filter out all policies for this user
      const updatedPolicies = parsedRBAC.policies.filter(policy => policy.subject !== subject)
      const updatedPolicyCsv = generatePolicyCsv(updatedPolicies)

      await updateRBACMutation.mutateAsync({
        ...rbacData,
        policy: updatedPolicyCsv,
      })

      toast.success('Permissions cleared', {
        description: `All permissions for ${subject} have been removed`,
      })

      // Close the panel
      setSelectedUser(null)
    } catch (error) {
      console.error('Failed to clear permissions:', error)
      toast.error('Failed to clear permissions')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="RBAC Permissions"
        description="Manage role-based access control permissions for users"
      />

      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-4 space-y-4">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Permission Summary</CardTitle>
              <CardDescription>
                Overview of RBAC policies and user permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold">{accounts.filter(a => a.name !== 'admin').length}</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">Total Users</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{parsedRBAC.policies.filter(p => p.type === 'p').length}</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">Active Policies</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{applications.length}</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">Applications</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permission Editor */}
          <PermissionEditor
            accounts={accounts}
            projects={projects}
            currentPolicies={parsedRBAC.policies}
            onAddPermissions={handleAddPermissions}
          />

          {/* Users List */}
          <Card onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Click a user to view their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-100 dark:bg-neutral-900">
                    <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      User
                    </TableHead>
                    <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider text-right">
                      Permissions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts
                    .filter(account => account.name !== 'admin') // Filter out built-in admin account
                    .map((account) => {
                      const isSelected = selectedUser === account.name
                      const policyCount = getPoliciesForSubject(parsedRBAC.policies, account.name).length

                      return (
                        <TableRow
                          key={account.name}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900'
                              : 'hover:bg-neutral-50 dark:hover:bg-neutral-900'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedUser(isSelected ? null : account.name)
                          }}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <IconUser size={16} className={isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500'} />
                              <span className={`font-medium ${isSelected ? 'text-blue-900 dark:text-blue-100' : ''}`}>
                                {account.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={account.enabled ? 'default' : 'outline'} className="text-xs">
                              {account.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`text-sm ${isSelected ? 'text-blue-900 dark:text-blue-100 font-medium' : 'text-neutral-600 dark:text-neutral-400'}`}>
                              {policyCount} {policyCount === 1 ? 'policy' : 'policies'}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* User Permissions Panel */}
          {selectedUser && (
            <div className="fixed inset-0 z-50">
              {/* Backdrop */}
              <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedUser(null)} />

              {/* Panel */}
              <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-black border-l border-neutral-200 dark:border-neutral-800 flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                      <IconUser size={16} className="text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-black dark:text-white">Permissions for {selectedUser}</h2>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">What this user can do across projects</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedUser !== 'admin' && selectedUserPolicies.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClearPermissions(selectedUser)}
                        disabled={updateRBACMutation.isPending}
                      >
                        Clear Permissions
                      </Button>
                    )}
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                    >
                      <IconClose size={20} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                  <div className="space-y-4">
                    {/* Special handling for admin user */}
                    {selectedUser === 'admin' ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                          <IconLock size={32} className="text-blue-500" />
                        </div>
                        <h3 className="text-lg font-medium text-black dark:text-white mb-2">Full Administrator</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mb-4">
                          The admin account has unrestricted access to all resources and cannot be limited by RBAC policies.
                        </p>
                        <div className="rounded-md border border-blue-500/20 bg-blue-500/10 p-3 max-w-md">
                          <p className="text-xs text-blue-400">
                            Admin is a built-in ArgoCD account with full administrative privileges across all applications, projects, clusters, and settings.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Check if user has any project permissions */}
                        {(() => {
                          // Check for all projects wildcard
                          const hasAllProjects = selectedUserPolicies.some(p => p.object === '*/*')

                          // Get capabilities from ONLY wildcard policies
                          const wildcardCaps = hasAllProjects ? getWildcardOnlyCapabilities(selectedUser) : null

                          // Get projects with permissions
                          let projectsWithPermissions: string[] = []

                          if (hasAllProjects) {
                            // Always show "All Projects"
                            projectsWithPermissions.push('*')

                            // Also show individual projects if they have ADDITIONAL permissions beyond wildcard
                            projects.forEach(project => {
                              const projectCaps = getCapabilities(selectedUser, project)
                              const hasAdditionalPerms = wildcardCaps && (
                                (!wildcardCaps.canView && projectCaps.canView) ||
                                (!wildcardCaps.canDeploy && projectCaps.canDeploy) ||
                                (!wildcardCaps.canRollback && projectCaps.canRollback) ||
                                (!wildcardCaps.canDelete && projectCaps.canDelete)
                              )
                              if (hasAdditionalPerms) {
                                projectsWithPermissions.push(project)
                              }
                            })
                          } else {
                            // No wildcard, show all projects with any permissions
                            projectsWithPermissions = projects.filter(project => {
                              const caps = getCapabilities(selectedUser, project)
                              return caps.canView || caps.canDeploy || caps.canRollback || caps.canDelete
                            })
                          }

                          if (projectsWithPermissions.length === 0) {
                            return (
                              /* Blank state */
                              <div className="flex flex-col items-center justify-center py-12 text-center">
                                <IconLock size={48} className="text-neutral-300 dark:text-neutral-700 mb-4" />
                                <h3 className="text-lg font-medium text-black dark:text-white mb-2">No permissions set</h3>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm">
                                  This user doesn't have permissions for any projects yet. Use "Set Permissions" above to grant access.
                                </p>
                              </div>
                            )
                          }

                          return (
                            /* Capabilities summary */
                            <div className="grid gap-3">
                              {projectsWithPermissions.map((project, i) => {
                                const isAllProjects = project === '*'
                                const caps = getCapabilities(selectedUser, project)
                                const hasAnyAccess = caps.canView || caps.canDeploy || caps.canRollback || caps.canDelete

                                if (!hasAnyAccess) return null

                                return (
                                  <div key={i} className="flex items-start justify-between p-3 rounded border border-neutral-200 dark:border-neutral-800">
                                    <div className="flex-1">
                                      <div className="font-medium text-sm mb-1">
                                        {isAllProjects ? 'All Projects' : project}
                                      </div>
                                      {isAllProjects && (
                                        <div className="text-xs text-neutral-500 mb-2">Applies to all current and future projects</div>
                                      )}
                                      <div className="flex flex-wrap gap-2">
                                        {caps.isFullAccess ? (
                                          <Badge>Full Access</Badge>
                                        ) : (
                                          <>
                                            {caps.canView && !caps.canDeploy && !caps.canRollback && !caps.canDelete && (
                                              <Badge variant="outline">Can view</Badge>
                                            )}
                                            {caps.canDeploy && <Badge variant="outline" className="border-grass-11 text-grass-11">Can deploy</Badge>}
                                            {caps.canRollback && <Badge variant="outline" className="border-amber-600 text-amber-600">Can rollback</Badge>}
                                            {caps.canDelete && <Badge variant="outline" className="border-red-600 text-red-600">Can delete</Badge>}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </>
                    )}

                    {/* Casbin policy details (expandable) - hidden for admin */}
                    {selectedUser !== 'admin' && selectedUserPolicies.length > 0 && (
                      <Accordion type="single" collapsible>
                        <AccordionItem value="casbin">
                          <AccordionTrigger className="text-sm">
                            Casbin Policies ({selectedUserPolicies.length})
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 pt-2">
                              {selectedUserPolicies.map((policy, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-neutral-50 dark:bg-neutral-900">
                                  <Badge variant={policy.effect === 'allow' ? 'default' : 'destructive'} className="text-xs">
                                    {policy.effect}
                                  </Badge>
                                  <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                                    {policy.resource}/{policy.action} on {policy.object}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
