import { useState } from 'react'
import {
  IconKey,
  IconAdd,
  IconDelete,
  IconCircleForward,
} from 'obra-icons-react'
import { PageHeader } from '@/components/page-header'
import { useGPGKeys, useCreateGPGKey, useDeleteGPGKey } from '@/services/gpgkeys'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function GPGKeysPage() {
  const { data, isLoading, error } = useGPGKeys()
  const createMutation = useCreateGPGKey()
  const deleteMutation = useDeleteGPGKey()

  const [showAddForm, setShowAddForm] = useState(false)
  const [keyData, setKeyData] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [keyToDelete, setKeyToDelete] = useState<{ keyID: string } | null>(null)

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({ keyData })
      setKeyData('')
      setShowAddForm(false)
    } catch (error) {
      console.error('Failed to create GPG key:', error)
    }
  }

  const handleDeleteClick = (keyID: string) => {
    setKeyToDelete({ keyID })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!keyToDelete) return

    try {
      await deleteMutation.mutateAsync(keyToDelete.keyID)
      setDeleteDialogOpen(false)
      setKeyToDelete(null)
    } catch (error) {
      console.error('Failed to delete GPG key:', error)
    }
  }

  const keys = data?.items || []

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="GPG Keys"
        description="Manage GPG keys for commit signature verification"
      />

      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-4">
          {/* Add Key Button */}
          {!showAddForm && (
            <div className="mb-4">
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowAddForm(true)}
              >
                <IconAdd size={14} />
                Add GPG Key
              </Button>
            </div>
          )}

          {/* Add Key Form */}
          {showAddForm && (
            <Card className="mb-4 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <CardHeader className="p-4">
                <CardTitle className="text-sm">Add GPG Key</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div>
                  <Label htmlFor="keyData" className="text-xs">
                    GPG Public Key
                  </Label>
                  <textarea
                    id="keyData"
                    value={keyData}
                    onChange={(e) => setKeyData(e.target.value)}
                    placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----&#10;...&#10;-----END PGP PUBLIC KEY BLOCK-----"
                    rows={8}
                    className="mt-1 flex w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-2 text-xs font-mono"
                  />
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-500 mt-1">
                    Paste your PGP public key block. Get it with: <code className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900">gpg --armor --export KEY_ID</code>
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={!keyData || createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Adding...' : 'Add Key'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false)
                      setKeyData('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <IconCircleForward size={32} className="animate-spin text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400">Loading GPG keys...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
              <p className="text-sm text-red-400">
                {error instanceof Error ? error.message : 'Failed to load GPG keys'}
              </p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && keys.length === 0 && (
            <div className="text-center py-12 text-neutral-600 dark:text-neutral-400 text-sm">
              No GPG keys configured
            </div>
          )}

          {/* Keys List */}
          {!isLoading && !error && keys.length > 0 && (
            <div className="space-y-2">
              {keys.map((key) => (
                <Card
                  key={key.keyID}
                  className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-none"
                >
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="h-10 w-10 rounded bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                          <IconKey size={20} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm">Key ID: {key.keyID}</CardTitle>
                          {key.fingerprint && (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 font-mono break-all">
                              {key.fingerprint}
                            </p>
                          )}
                          {key.owner && (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                              Owner: {key.owner}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(key.keyID)}
                      >
                        <IconDelete size={14} className="text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete GPG Key"
        description={`Are you sure you want to delete the GPG key "${keyToDelete?.keyID}"? This action cannot be undone.`}
        confirmText="Delete"
        resourceName={keyToDelete?.keyID || ''}
        resourceType="GPG key"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
