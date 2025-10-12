import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { IconClock3, IconUser, IconCodeBranch, IconRotate } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useRollbackApplication } from '@/services/applications'
import type { Application, RevisionHistory } from '@/types/api'

interface ApplicationHistoryProps {
  application: Application
}

export function ApplicationHistory({ application }: ApplicationHistoryProps) {
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false)
  const [selectedRevision, setSelectedRevision] = useState<RevisionHistory | null>(null)
  const rollbackMutation = useRollbackApplication()

  const history = application.status?.history || []
  const currentRevisionId = history.length > 0 ? history[0]?.id : undefined

  const handleRollbackClick = (revision: RevisionHistory) => {
    setSelectedRevision(revision)
    setRollbackDialogOpen(true)
  }

  const handleRollbackConfirm = async () => {
    if (!selectedRevision) return

    try {
      await rollbackMutation.mutateAsync({
        name: application.metadata.name,
        request: {
          id: selectedRevision.id,
          prune: false, // Simplified - no checkbox for now
          appNamespace: application.metadata.namespace,
        },
      })
      setRollbackDialogOpen(false)
      setSelectedRevision(null)
    } catch (error) {
      // Error toast handled by mutation
      console.error('Rollback failed:', error)
    }
  }

  // Check if auto-sync is enabled
  const hasAutoSync = !!application.spec?.syncPolicy?.automated

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <IconClock3 size={48} className="text-neutral-400 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">
            No deployment history available
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {history.map((revision) => {
          const isCurrent = revision.id === currentRevisionId
          const deployedAt = new Date(revision.deployedAt)
          const isAutomated = revision.initiatedBy?.automated

          return (
            <div
              key={revision.id}
              className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <IconClock3 size={16} className="text-neutral-500" />
                      <span className="text-sm font-medium text-black dark:text-white">
                        Revision #{revision.id}
                      </span>
                    </div>
                    {isCurrent && (
                      <Badge variant="default">Current</Badge>
                    )}
                    {isAutomated && (
                      <Badge variant="secondary">Automated</Badge>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {/* Deployed At */}
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-500">Deployed:</span>{' '}
                      <span className="text-neutral-900 dark:text-neutral-100">
                        {formatDistanceToNow(deployedAt, { addSuffix: true })}
                      </span>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {deployedAt.toLocaleString()}
                      </div>
                    </div>

                    {/* Initiator */}
                    {revision.initiatedBy && (
                      <div>
                        <span className="text-neutral-500 dark:text-neutral-500">Initiated by:</span>{' '}
                        <span className="text-neutral-900 dark:text-neutral-100 flex items-center gap-1 inline-flex">
                          <IconUser size={12} />
                          {revision.initiatedBy.username}
                        </span>
                      </div>
                    )}

                    {/* Git Revision */}
                    <div className="col-span-2">
                      <span className="text-neutral-500 dark:text-neutral-500">Revision:</span>{' '}
                      <span className="text-neutral-900 dark:text-neutral-100 font-mono text-xs inline-flex items-center gap-1">
                        <IconCodeBranch size={12} />
                        {revision.revision.substring(0, 8)}
                      </span>
                    </div>

                    {/* Deploy Duration */}
                    {revision.deployStartedAt && (
                      <div>
                        <span className="text-neutral-500 dark:text-neutral-500">Duration:</span>{' '}
                        <span className="text-neutral-900 dark:text-neutral-100">
                          {Math.round(
                            (new Date(revision.deployedAt).getTime() -
                              new Date(revision.deployStartedAt).getTime()) /
                              1000
                          )}s
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="ml-4">
                  {!isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRollbackClick(revision)}
                      disabled={rollbackMutation.isPending || hasAutoSync}
                      title={hasAutoSync ? 'Disable auto-sync to rollback' : 'Rollback to this revision'}
                    >
                      <IconRotate size={16} />
                      Rollback
                    </Button>
                  )}
                  {isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRollbackClick(revision)}
                      disabled={rollbackMutation.isPending}
                    >
                      <IconRotate size={16} />
                      Redeploy
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Auto-sync Warning */}
      {hasAutoSync && (
        <div className="mt-4 rounded border border-amber-500/20 bg-amber-500/10 p-3">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            <strong>Note:</strong> Automated sync is enabled. Disable it before performing rollbacks to prevent
            automatic re-syncing to the latest revision.
          </p>
        </div>
      )}

      {/* Rollback Confirmation Dialog */}
      {selectedRevision && (
        <ConfirmDialog
          open={rollbackDialogOpen}
          onOpenChange={setRollbackDialogOpen}
          title={selectedRevision.id === currentRevisionId ? 'Redeploy Revision' : 'Rollback Application'}
          description={
            selectedRevision.id === currentRevisionId
              ? `Re-deploy the current revision #${selectedRevision.id} (${selectedRevision.revision.substring(0, 8)})?`
              : `Rollback application "${application.metadata.name}" to revision #${selectedRevision.id} (${selectedRevision.revision.substring(0, 8)})? This will trigger a new sync to the selected revision.`
          }
          confirmText={selectedRevision.id === currentRevisionId ? 'Redeploy' : 'Rollback'}
          resourceName={`revision-${selectedRevision.id}`}
          resourceType="revision"
          onConfirm={handleRollbackConfirm}
          isLoading={rollbackMutation.isPending}
        />
      )}
    </>
  )
}
