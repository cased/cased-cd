import { useState } from 'react'
import {
  IconUsers,
  IconKey,
  IconCircleCheck,
  IconCircleWarning,
  IconAdd,
  IconDelete,
} from 'obra-icons-react'
import { PageHeader } from '@/components/page-header'
import { useAccounts, useUpdatePassword, useCreateToken, useDeleteToken } from '@/services/accounts'
import { useDeleteHandler } from '@/hooks/useDeleteHandler'
import { ErrorAlert } from '@/components/ui/error-alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface TokenToDelete {
  accountName: string
  tokenId: string
}

export function AccountsPage() {
  const { data, isLoading, error } = useAccounts()
  const updatePasswordMutation = useUpdatePassword()
  const createTokenMutation = useCreateToken()
  const deleteTokenMutation = useDeleteToken()

  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)

  const deleteHandler = useDeleteHandler<TokenToDelete, { name: string; tokenId: string }>({
    deleteFn: deleteTokenMutation.mutateAsync,
    resourceType: 'API token',
    getId: (token) => ({ name: token.accountName, tokenId: token.tokenId }),
    getDisplayName: (token) => token.tokenId.substring(0, 8),
    isDeleting: deleteTokenMutation.isPending,
  })

  const handleUpdatePassword = async () => {
    try {
      await updatePasswordMutation.mutateAsync({
        newPassword,
        currentPassword: currentPassword || undefined,
      })
      setNewPassword('')
      setCurrentPassword('')
      setShowPasswordForm(false)
    } catch (error) {
      console.error('Failed to update password:', error)
    }
  }

  const handleCreateToken = async (accountName: string) => {
    try {
      const result = await createTokenMutation.mutateAsync({
        name: accountName,
        expiresIn: 2592000, // 30 days in seconds
      })
      setGeneratedToken(result.token)
    } catch (error) {
      console.error('Failed to create token:', error)
      const message = error instanceof Error && 'response' in error
        ? (error.response as { data?: { message?: string } })?.data?.message
        : undefined
      alert(message || 'Failed to create token. Account may not have apiKey capability.')
    }
  }

  const accounts = data?.items || []

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Accounts"
        description="Manage user accounts and permissions"
      />

      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-4">
          {/* Loading State */}
          {isLoading && (
            <LoadingSpinner message="Loading accounts..." containerHeight="py-12" />
          )}

          {/* Error State */}
          {error && (
            <ErrorAlert
              error={error}
              title="Failed to load accounts"
              size="lg"
            />
          )}

          {/* Accounts List */}
          {!isLoading && !error && (
            <div className="space-y-3">
              {accounts.map((account) => (
                <Card
                  key={account.name}
                  className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-none"
                >
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                          <IconUsers size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{account.name}</CardTitle>
                          <CardDescription className="text-xs mt-0.5 flex items-center gap-2">
                            {account.enabled ? (
                              <>
                                <IconCircleCheck size={12} className="text-grass-11" />
                                <span>Enabled</span>
                              </>
                            ) : (
                              <>
                                <IconCircleWarning size={12} className="text-red-400" />
                                <span>Disabled</span>
                              </>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {account.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardHeader>

                  <Separator />

                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Password Management */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-medium text-black dark:text-white">
                            Password
                          </h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAccount(account.name)
                              setShowPasswordForm(!showPasswordForm)
                            }}
                          >
                            <IconKey size={14} />
                            Update Password
                          </Button>
                        </div>

                        {showPasswordForm && selectedAccount === account.name && (
                          <div className="mt-3 p-3 rounded bg-neutral-50 dark:bg-neutral-900 space-y-3">
                            <div>
                              <Label htmlFor="current-password" className="text-xs">
                                Current Password
                              </Label>
                              <Input
                                id="current-password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="new-password" className="text-xs">
                                New Password
                              </Label>
                              <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="mt-1"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleUpdatePassword()}
                                disabled={!newPassword || updatePasswordMutation.isPending}
                              >
                                {updatePasswordMutation.isPending ? 'Updating...' : 'Update'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setShowPasswordForm(false)
                                  setNewPassword('')
                                  setCurrentPassword('')
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Token Management */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-medium text-black dark:text-white">
                            API Tokens
                          </h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateToken(account.name)}
                            disabled={createTokenMutation.isPending || !account.capabilities.includes('apiKey')}
                          >
                            <IconAdd size={14} />
                            Generate Token
                          </Button>
                        </div>

                        {!account.capabilities.includes('apiKey') && (
                          <div className="mt-2 p-3 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                            <p className="text-xs text-amber-800 dark:text-amber-300 mb-1 font-medium">
                              API token generation unavailable
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                              This account doesn't have the <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900">apiKey</code> capability.
                              To enable, add it to your ArgoCD ConfigMap: <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900">accounts.{account.name}: apiKey, login</code>
                            </p>
                          </div>
                        )}

                        {account.capabilities.includes('apiKey') && (
                          <>

                        {generatedToken && (
                          <div className="mt-3 p-3 rounded bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                            <p className="text-xs text-green-700 dark:text-green-400 mb-2 font-medium">
                              Token generated! Copy it now - it won't be shown again.
                            </p>
                            <div className="flex gap-2">
                              <Input
                                value={generatedToken}
                                readOnly
                                className="font-mono text-xs"
                              />
                              <Button
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(generatedToken)
                                }}
                              >
                                Copy
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setGeneratedToken(null)}
                              className="mt-2"
                            >
                              Dismiss
                            </Button>
                          </div>
                        )}

                          {account.tokens && account.tokens.length > 0 ? (
                            <div className="mt-2 space-y-2">
                              {account.tokens.map((token) => (
                                <div
                                  key={token.id}
                                  className="flex items-center justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-900"
                                >
                                  <div className="text-xs">
                                    <p className="text-neutral-900 dark:text-neutral-100">
                                      Token {token.id.substring(0, 8)}...
                                    </p>
                                    <p className="text-neutral-500 dark:text-neutral-500 text-[10px]">
                                      Expires: {new Date(token.expiresAt * 1000).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteHandler.handleDeleteClick({ accountName: account.name, tokenId: token.id })}
                                  >
                                    <IconDelete size={14} className="text-red-500" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">
                              No tokens created yet
                            </p>
                          )}
                        </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteHandler.dialogOpen}
        onOpenChange={deleteHandler.setDialogOpen}
        title="Delete API Token"
        description={`Are you sure you want to delete this API token? This action cannot be undone and may break integrations using this token.`}
        confirmText="Delete"
        resourceName={deleteHandler.resourceToDelete?.tokenId.substring(0, 8) || ''}
        resourceType="API token"
        onConfirm={deleteHandler.handleDeleteConfirm}
        isLoading={deleteHandler.isDeleting}
      />
    </div>
  )
}

export default AccountsPage
