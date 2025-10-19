import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  IconCircleCheck,
  IconCircleWarning,
  IconCircleForward,
  IconClock3,
} from 'obra-icons-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Application, ResourceStatus } from '@/types/api'

interface SyncProgressSheetProps {
  application: Application
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Helper to parse app versions from images
function parseAppVersions(images: string[] | undefined): Array<{ name: string; version: string }> {
  if (!images || images.length === 0) return []

  return images
    .map(image => {
      const parts = image.split('/')
      const lastPart = parts[parts.length - 1]
      const [name, tag] = lastPart.split(':')

      if (!tag || tag === 'latest') return null

      // If it's a commit SHA (40 hex chars), shorten it
      const isCommitSha = /^[0-9a-f]{40}$/i.test(tag)
      const version = isCommitSha ? tag.substring(0, 7) : tag

      return { name, version }
    })
    .filter((v): v is { name: string; version: string } => v !== null)
}

export function SyncProgressSheet({ application, open, onOpenChange }: SyncProgressSheetProps) {
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState<string>('')

  const operationState = application.status?.operationState
  const isRunning = operationState?.phase === 'Running'
  const resources = application.status?.resources || []
  const appVersions = parseAppVersions(application.status?.summary?.images)

  // Track start time when sync begins
  useEffect(() => {
    if (isRunning && operationState?.startedAt) {
      setStartTime(new Date(operationState.startedAt))
    } else if (!isRunning) {
      setStartTime(null)
    }
  }, [isRunning, operationState?.startedAt])

  // Update elapsed time every second
  useEffect(() => {
    if (!startTime) {
      setElapsed('')
      return
    }

    const updateElapsed = () => {
      setElapsed(formatDistanceToNow(startTime, { addSuffix: false, includeSeconds: true }))
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const getPhaseIcon = (phase?: string) => {
    switch (phase) {
      case 'Running':
        return <IconCircleForward size={20} className="animate-spin text-blue-400" />
      case 'Succeeded':
        return <IconCircleCheck size={20} className="text-grass-11" />
      case 'Failed':
      case 'Error':
        return <IconCircleWarning size={20} className="text-red-400" />
      default:
        return <IconClock3 size={20} className="text-neutral-400" />
    }
  }

  const getPhaseColor = (phase?: string) => {
    switch (phase) {
      case 'Running':
        return 'text-blue-400'
      case 'Succeeded':
        return 'text-grass-11'
      case 'Failed':
      case 'Error':
        return 'text-red-400'
      default:
        return 'text-neutral-400'
    }
  }

  const getResourceStatus = (resource: ResourceStatus) => {
    if (resource.status === 'Synced') {
      return { icon: IconCircleCheck, color: 'text-grass-11', label: 'Synced' }
    }
    if (resource.status === 'OutOfSync') {
      return { icon: IconCircleWarning, color: 'text-amber-400', label: 'Out of Sync' }
    }
    return { icon: IconClock3, color: 'text-neutral-400', label: 'Unknown' }
  }

  // Calculate sync progress
  const syncedCount = resources.filter(r => r.status === 'Synced').length
  const totalCount = resources.length
  const progressPercent = totalCount > 0 ? Math.round((syncedCount / totalCount) * 100) : 0

  // Calculate resources still rolling out
  const progressingCount = resources.filter(r => r.health?.status === 'Progressing').length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center gap-2">
            {getPhaseIcon(operationState?.phase)}
            Sync Progress
          </SheetTitle>
          <SheetDescription className="text-base">
            {application.metadata.name}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto px-4 pb-4">
          {/* Overall Status */}
          <div className="mb-8 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-black dark:text-white">Status</span>
                  <span className={`text-sm font-medium ${getPhaseColor(operationState?.phase)}`}>
                    {operationState?.phase === 'Succeeded' ? 'Sync succeeded' : operationState?.phase || 'Unknown'}
                  </span>
                </div>
                {elapsed && (
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    Elapsed: {elapsed}
                  </div>
                )}
                {operationState?.phase === 'Succeeded' && progressingCount > 0 && (
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    {progressingCount} {progressingCount === 1 ? 'resource' : 'resources'} still rolling out
                  </div>
                )}
              </div>
              {isRunning && (
                <div className="text-right">
                  <div className="text-2xl font-semibold text-black dark:text-white">{progressPercent}%</div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    {syncedCount} / {totalCount}
                  </div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {isRunning && (
              <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-blue-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* Sync Details */}
            {(operationState?.operation?.sync || appVersions.length > 0) && (
              <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
                {operationState?.operation?.sync?.revision && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">Config Revision:</span>
                    <span className="text-black dark:text-white font-mono">
                      {operationState.operation.sync.revision.substring(0, 7)}
                    </span>
                  </div>
                )}
                {appVersions.length > 0 && (
                  <div className="flex items-start justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">App Versions:</span>
                    <div className="flex flex-col items-end gap-1">
                      {appVersions.map((version, i) => (
                        <span key={i} className="text-black dark:text-white font-mono">
                          {version.name}: {version.version}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {operationState?.operation?.sync?.prune !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">Prune:</span>
                    <span className="text-black dark:text-white">
                      {operationState.operation.sync.prune ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Message */}
            {operationState?.message && (
              <div className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
                {operationState.message}
              </div>
            )}

            {/* Monitor Button */}
            {operationState?.phase === 'Succeeded' && (
              <div className="mt-4">
                <Button variant="default" size="sm" className="w-full">
                  Monitor deploy on Cased
                </Button>
              </div>
            )}
          </div>

          {/* Resource List */}
          <div>
            <h3 className="text-sm font-medium text-black dark:text-white mb-4">
              Resources ({resources.length})
            </h3>
            <div className="space-y-3">
              {resources.length === 0 ? (
                <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">No resources found</p>
                </div>
              ) : (
                resources.map((resource, i) => {
                  const status = getResourceStatus(resource)
                  const StatusIcon = status.icon

                  return (
                    <div
                      key={`${resource.kind}-${resource.name}-${i}`}
                      className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <StatusIcon size={14} className={status.color} />
                            <span className="text-sm font-medium text-black dark:text-white truncate">
                              {resource.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <span>{resource.kind}</span>
                            {resource.namespace && (
                              <>
                                <span>·</span>
                                <span>{resource.namespace}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end flex-shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {resource.status || 'Unknown'}
                          </Badge>
                          {resource.health?.status && (
                            <Badge variant="outline" className="text-xs gap-1.5">
                              {resource.health.status === 'Progressing' && (
                                <IconCircleForward size={10} className="animate-spin text-blue-400" />
                              )}
                              {resource.health.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
