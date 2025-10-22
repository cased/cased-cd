import { useState } from 'react'
import { IconLock, IconUser, IconClose } from 'obra-icons-react'
import { PageHeader } from '@/components/page-header'
import { useAccounts, useRBACConfig, useUpdateRBACConfig } from '@/services/accounts'
import { useApplications } from '@/services/applications'
import { useHasFeature } from '@/services/license'
import { parseRBACConfig, getPoliciesForSubject, policyMatchesApp, generatePolicyCsv } from '@/lib/casbin-parser'
import { PermissionEditor } from '@/components/rbac/permission-editor'
import { ErrorAlert } from '@/components/ui/error-alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UpgradeModal } from '@/components/upgrade-modal'
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

  if (loadingAccounts || loadingRBAC || loadingApps) {
    return <LoadingSpinner />
  }

  if (accountsError) {
    return <ErrorAlert error={accountsError} message="Failed to load accounts" />
  }

  if (rbacError) {
    return <ErrorAlert error={rbacError} message="Failed to load RBAC configuration" />
  }

  const accounts = accountsData?.items || []
  const applications = appsData?.items || []
  const parsedRBAC = rbacData ? parseRBACConfig(rbacData) : { policies: [], raw: '' }

  // Get unique apps for the table
  const apps = applications.map(app => ({
    name: app.metadata.name,
    project: app.spec.project || 'default',
  }))

  // Function to check if user has specific permission for an app
  const hasPermission = (subject: string, action: string, project: string, appName: string): boolean => {
    const policies = getPoliciesForSubject(parsedRBAC.policies, subject)

    return policies.some(policy => {
      if (policy.action !== action && policy.action !== '*') return false
      if (policy.resource !== 'applications' && policy.resource !== '*') return false
      return policyMatchesApp(policy, project, appName)
    })
  }

  // Get user-facing capabilities for an app
  const getCapabilities = (subject: string, project: string, appName: string): AppCapabilities => {
    const policies = getPoliciesForSubject(parsedRBAC.policies, subject)

    // Check for wildcards (full access)
    const hasWildcard = policies.some(p =>
      p.resource === '*' || (p.resource === 'applications' && p.action === '*' && policyMatchesApp(p, project, appName))
    )

    if (hasWildcard) {
      return {
        canView: true,
        canDeploy: true,
        canRollback: true,
        canDelete: true,
        isFullAccess: true,
      }
    }

    return {
      canView: hasPermission(subject, 'get', project, appName),
      canDeploy: hasPermission(subject, 'sync', project, appName),
      canRollback: hasPermission(subject, 'action/*', project, appName) || hasPermission(subject, 'action', project, appName),
      canDelete: hasPermission(subject, 'delete', project, appName),
      isFullAccess: false,
    }
  }

  // Get all policies for selected user
  const selectedUserPolicies = selectedUser
    ? getPoliciesForSubject(parsedRBAC.policies, selectedUser)
    : []

  // Handler to add new permissions (batch)
  const handleAddPermissions = async (policies: CasbinPolicy[]) => {
    if (!rbacData) {
      console.error('No RBAC data available')
      return
    }

    console.log('handleAddPermissions called with:', policies)
    console.log('Current policies count:', parsedRBAC.policies.length)

    // Add all new policies to existing policies
    const updatedPolicies = [...parsedRBAC.policies, ...policies]
    const updatedPolicyCsv = generatePolicyCsv(updatedPolicies)

    console.log('Updated policies count:', updatedPolicies.length)
    console.log('Calling mutation...')

    await updateRBACMutation.mutateAsync({
      ...rbacData,
      policy: updatedPolicyCsv,
    })

    console.log('Mutation complete')
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={IconLock}
        title="RBAC Permissions"
        subtitle="View role-based access control permissions for users"
      />

      <div
        className="flex-1 overflow-auto p-6"
        onClick={(e) => {
          // Deselect user when clicking outside the table
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.deselect-area')) {
            setSelectedUser(null)
          }
        }}
      >
        <div className="max-w-7xl mx-auto space-y-6 deselect-area">
          {/* Summary Card */}
          <Card onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Permission Summary</CardTitle>
              <CardDescription>
                Overview of RBAC policies and user permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold">{accounts.length}</div>
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
            apps={apps}
            onAddPermissions={handleAddPermissions}
          />

          {/* Permission Matrix */}
          <Card onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
              <CardDescription>
                Click a user to view detailed permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-100 dark:bg-neutral-900">
                      <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider sticky left-0 bg-neutral-100 dark:bg-neutral-900">
                        User
                      </TableHead>
                      {apps.slice(0, 5).map((app, i) => (
                        <TableHead key={i} className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                          {app.name}
                        </TableHead>
                      ))}
                      <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                        Summary
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => {
                      const isSelected = selectedUser === account.name

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
                          <TableCell className={`sticky left-0 ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950'
                              : 'bg-white dark:bg-black'
                          }`}>
                            <div className="flex items-center gap-2">
                              <IconUser size={16} className={isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500'} />
                              <span className={`font-medium ${isSelected ? 'text-blue-900 dark:text-blue-100' : ''}`}>
                                {account.name}
                              </span>
                            </div>
                          </TableCell>
                        {apps.slice(0, 5).map((app, i) => {
                          const caps = getCapabilities(account.name, app.project, app.name)
                          const hasAnyAccess = caps.canView || caps.canDeploy || caps.canRollback || caps.canDelete

                          return (
                            <TableCell key={i}>
                              {caps.isFullAccess ? (
                                <Badge className="text-xs">Full Access</Badge>
                              ) : hasAnyAccess ? (
                                <div className="flex flex-col gap-0.5 text-xs">
                                  {caps.canView && !caps.canDeploy && !caps.canRollback && !caps.canDelete && (
                                    <span className="text-neutral-600 dark:text-neutral-400">View only</span>
                                  )}
                                  {caps.canDeploy && <span className="text-grass-11">Can deploy</span>}
                                  {caps.canRollback && <span className="text-amber-600">Can rollback</span>}
                                  {caps.canDelete && <span className="text-red-600">Can delete</span>}
                                </div>
                              ) : (
                                <span className="text-neutral-400 text-xs">No access</span>
                              )}
                            </TableCell>
                          )
                        })}
                        <TableCell className="text-center">
                          <div className="text-xs text-neutral-600">
                            {getPoliciesForSubject(parsedRBAC.policies, account.name).length} policies
                          </div>
                        </TableCell>
                      </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* User Permissions Detail */}
          {selectedUser && (
            <Card onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Permissions for {selectedUser}</CardTitle>
                    <CardDescription>
                      What this user can do across applications
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUser(null)}
                    className="h-8 w-8 p-0"
                  >
                    <IconClose className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Capabilities summary */}
                  <div className="grid gap-3">
                    {apps.map((app, i) => {
                      const caps = getCapabilities(selectedUser, app.project, app.name)
                      const hasAnyAccess = caps.canView || caps.canDeploy || caps.canRollback || caps.canDelete

                      if (!hasAnyAccess) return null

                      return (
                        <div key={i} className="flex items-start justify-between p-3 rounded border border-neutral-200 dark:border-neutral-800">
                          <div className="flex-1">
                            <div className="font-medium text-sm mb-1">{app.name}</div>
                            <div className="flex flex-wrap gap-2">
                              {caps.isFullAccess ? (
                                <Badge>Full Access</Badge>
                              ) : (
                                <>
                                  {caps.canView && !caps.canDeploy && !caps.canRollback && !caps.canDelete && (
                                    <Badge variant="outline">View only</Badge>
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

                  {/* Casbin policy details (expandable) */}
                  {selectedUserPolicies.length > 0 && (
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
