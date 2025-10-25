import React, { useState } from 'react'
import {
  IconDocument,
  IconDownload,
  IconCircleForward,
  IconSearch,
  IconCircleCheck,
  IconCircleWarning,
  IconCircleClose,
  IconChevronDown,
  IconChevronRight,
} from 'obra-icons-react'
import { useAuditEvents } from '@/services/audit'
import { useDebounce } from '@/hooks/useDebounce'
import { ErrorAlert } from '@/components/ui/error-alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { PageContent } from '@/components/ui/page-content'
import type { AuditAction, AuditResourceType, AuditSeverity } from '@/types/api'

export function AuditTrailPage() {
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all')
  const [resourceTypeFilter, setResourceTypeFilter] = useState<AuditResourceType | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | 'all'>('all')
  const [successFilter, setSuccessFilter] = useState<'all' | 'true' | 'false'>('all')

  // Track expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Build filters object for API
  const filters = {
    ...(actionFilter !== 'all' && { action: actionFilter }),
    ...(resourceTypeFilter !== 'all' && { resourceType: resourceTypeFilter }),
    ...(severityFilter !== 'all' && { severity: severityFilter }),
    ...(successFilter !== 'all' && { success: successFilter === 'true' }),
  }

  const { data, isLoading, error, refetch } = useAuditEvents(filters)

  // Filter events based on search query (client-side for user/resource name)
  const filteredEvents = data?.items?.filter((event) => {
    if (!debouncedSearch) return true
    const search = debouncedSearch.toLowerCase()
    return (
      event.user.toLowerCase().includes(search) ||
      event.resourceName.toLowerCase().includes(search) ||
      event.action.toLowerCase().includes(search)
    )
  }) || []

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredEvents.length) return

    const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource Name', 'Severity', 'Success', 'IP Address']
    const rows = filteredEvents.map(event => [
      event.timestamp,
      event.user,
      event.action,
      event.resourceType,
      event.resourceName,
      event.severity,
      event.success ? 'Yes' : 'No',
      event.ipAddress || 'N/A',
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-trail-${new Date().toISOString()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Export to JSON
  const handleExportJSON = () => {
    if (!filteredEvents.length) return

    const json = JSON.stringify(filteredEvents, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-trail-${new Date().toISOString()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Toggle row expansion
  const toggleRow = (eventId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  // Get icon for severity
  const getSeverityIcon = (severity: AuditSeverity) => {
    switch (severity) {
      case 'info':
        return <IconCircleCheck size={16} className="text-blue-500" />
      case 'warning':
        return <IconCircleWarning size={16} className="text-amber-500" />
      case 'error':
        return <IconCircleClose size={16} className="text-red-500" />
    }
  }

  // Render change details
  const renderDetails = (details: Record<string, unknown> | undefined) => {
    if (!details || (!details.before && !details.after)) {
      return null
    }

    return (
      <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800">
        <div className="grid grid-cols-2 gap-4">
          {details.before && (
            <div>
              <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Before</h4>
              <pre className="text-xs font-mono text-neutral-600 dark:text-neutral-400 overflow-auto">
                {JSON.stringify(details.before, null, 2)}
              </pre>
            </div>
          )}
          {details.after && (
            <div>
              <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">After</h4>
              <pre className="text-xs font-mono text-neutral-600 dark:text-neutral-400 overflow-auto">
                {JSON.stringify(details.after, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Audit Trail"
        description="Complete history of all actions performed in the system"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <IconCircleForward
                size={16}
                className={isLoading ? 'animate-spin' : ''}
              />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <IconDownload size={16} />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportJSON}>
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <PageContent>
        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <IconSearch
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <Input
              placeholder="Search by user, resource, or action..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as AuditAction | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="application.create">App: Create</SelectItem>
              <SelectItem value="application.update">App: Update</SelectItem>
              <SelectItem value="application.sync">App: Sync</SelectItem>
              <SelectItem value="application.delete">App: Delete</SelectItem>
              <SelectItem value="repository.create">Repo: Create</SelectItem>
              <SelectItem value="repository.delete">Repo: Delete</SelectItem>
              <SelectItem value="cluster.create">Cluster: Create</SelectItem>
              <SelectItem value="cluster.delete">Cluster: Delete</SelectItem>
              <SelectItem value="rbac.grant">RBAC: Grant</SelectItem>
              <SelectItem value="rbac.revoke">RBAC: Revoke</SelectItem>
              <SelectItem value="account.create">Account: Create</SelectItem>
              <SelectItem value="account.delete">Account: Delete</SelectItem>
            </SelectContent>
          </Select>

          <Select value={resourceTypeFilter} onValueChange={(value) => setResourceTypeFilter(value as AuditResourceType | 'all')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Resources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="application">Applications</SelectItem>
              <SelectItem value="repository">Repositories</SelectItem>
              <SelectItem value="cluster">Clusters</SelectItem>
              <SelectItem value="project">Projects</SelectItem>
              <SelectItem value="rbac">RBAC</SelectItem>
              <SelectItem value="account">Accounts</SelectItem>
              <SelectItem value="notification">Notifications</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as AuditSeverity | 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>

          <Select value={successFilter} onValueChange={(value) => setSuccessFilter(value as 'all' | 'true' | 'false')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Results" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="true">Success Only</SelectItem>
              <SelectItem value="false">Failures Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <LoadingSpinner message="Loading audit events..." size="lg" />
        )}

        {/* Error State */}
        {error && (
          <ErrorAlert
            error={error}
            onRetry={() => refetch()}
            title="Failed to load audit events"
            size="lg"
          />
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredEvents.length === 0 && (
          <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
            <div className="max-w-md mx-auto">
              <div className="h-12 w-12 rounded bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-3">
                <IconDocument size={24} className="text-neutral-400" />
              </div>
              <h3 className="text-sm font-medium text-black dark:text-white mb-1">
                {searchQuery || actionFilter !== 'all' || resourceTypeFilter !== 'all'
                  ? 'No events found'
                  : 'No audit events yet'}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {searchQuery || actionFilter !== 'all' || resourceTypeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Audit events will appear here as actions are performed'}
              </p>
            </div>
          </div>
        )}

        {/* Audit Events Table */}
        {!isLoading && !error && filteredEvents.length > 0 && (
          <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-100 dark:bg-neutral-900">
                  <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider w-8">

                  </TableHead>
                  <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Timestamp
                  </TableHead>
                  <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    User
                  </TableHead>
                  <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Action
                  </TableHead>
                  <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Resource
                  </TableHead>
                  <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    IP Address
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => {
                  const isExpanded = expandedRows.has(event.id)
                  const hasDetails = event.details && (event.details.before || event.details.after)

                  return (
                    <React.Fragment key={event.id}>
                      <TableRow className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
                        <TableCell className="w-8">
                          {hasDetails && (
                            <button
                              onClick={() => toggleRow(event.id)}
                              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                            >
                              {isExpanded ? (
                                <IconChevronDown size={16} />
                              ) : (
                                <IconChevronRight size={16} />
                              )}
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                          {formatTimestamp(event.timestamp)}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {event.user}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <code className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                              {event.action}
                            </code>
                            <div className="flex items-center gap-1">
                              {getSeverityIcon(event.severity)}
                              <span className="text-xs text-neutral-500 capitalize">
                                {event.severity}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">{event.resourceName}</span>
                            <Badge variant="outline" className="text-xs w-fit">
                              {event.resourceType}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={event.success ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {event.success ? 'Success' : 'Failed'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                          {event.ipAddress || 'N/A'}
                        </TableCell>
                      </TableRow>
                      {isExpanded && hasDetails && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-neutral-50 dark:bg-neutral-900">
                            {renderDetails(event.details)}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Event Count */}
        {!isLoading && !error && filteredEvents.length > 0 && (
          <div className="mt-4 text-xs text-neutral-600 dark:text-neutral-400 text-center">
            Showing {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
          </div>
        )}
      </PageContent>
    </div>
  )
}
