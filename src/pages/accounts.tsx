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
import { useAccounts, useUpdatePassword, useCreateToken, useDeleteToken, useCreateAccount, useDeleteAccount } from '@/services/accounts'
import { useDeleteHandler } from '@/hooks/useDeleteHandler'
import { useHasFeature } from '@/services/license'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ErrorAlert } from '@/components/ui/error-alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface TokenToDelete {
  accountName: string
  tokenId: string
}

// Username validation helper
const validateUsername = (username: string): string => {
  if (!username) return 'Username is required'
  if (username.length < 3) return 'Username must be at least 3 characters'
  if (username.length > 63) return 'Username must be less than 63 characters'

  const validPattern = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/
  if (!validPattern.test(username)) {
    return 'Username must start and end with alphanumeric, and contain only letters, numbers, hyphens, underscores, or periods'
  }

  return ''
}

export function AccountsPage() {
  const hasUserManagement = useHasFeature('rbac') // User management requires enterprise (same as RBAC)
  const { data, isLoading, error } = useAccounts()
  const updatePasswordMutation = useUpdatePassword()
  const createTokenMutation = useCreateToken()
  const deleteTokenMutation = useDeleteToken()
  const createAccountMutation = useCreateAccount()
  const deleteAccountMutation = useDeleteAccount()

  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [tokenAccountName, setTokenAccountName] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [newUsername, setNewUsername] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [usernameError, setUsernameError] = useState('')

  const deleteHandler = useDeleteHandler<TokenToDelete, { name: string; tokenId: string }>({
    deleteFn: deleteTokenMutation.mutateAsync,
    resourceType: 'API token',
    getId: (token) => ({ name: token.accountName, tokenId: token.tokenId }),
    getDisplayName: (token) => token.tokenId.substring(0, 8),
    isDeleting: deleteTokenMutation.isPending,
  })

  const handleUpdatePassword = async () => {
    if (!selectedAccount || !newPassword) return

    try {
      await updatePasswordMutation.mutateAsync({
        newPassword,
        currentPassword: currentPassword || undefined,
      })
      setNewPassword('')
      setCurrentPassword('')
      setShowPasswordDialog(false)
      setSelectedAccount(null)
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
      setTokenAccountName(accountName)
    } catch (error) {
      console.error('Failed to create token:', error)
      const message = error instanceof Error && 'response' in error
        ? (error.response as { data?: { message?: string } })?.data?.message
        : undefined
      alert(message || 'Failed to create token. Account may not have apiKey capability.')
    }
  }

  const handleUsernameChange = (value: string) => {
    setNewUsername(value)
    const error = validateUsername(value)
    setUsernameError(error)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    const error = validateUsername(newUsername)
    if (error) {
      setUsernameError(error)
      return
    }

    try {
      await createAccountMutation.mutateAsync({
        name: newUsername,
        password: newUserPassword,
        enabled: true,
      })

      toast.success('User created successfully', {
        description: `Account "${newUsername}" has been created`,
      })

      setShowCreateDialog(false)
      setNewUsername('')
      setNewUserPassword('')
      setUsernameError('')
    } catch (error) {
      console.error('Failed to create account:', error)
      let errorMessage = 'Unknown error occurred'
      if (typeof error === 'object' && error !== null) {
        if ('response' in error && typeof error.response === 'object' && error.response !== null) {
          const response = error.response as { data?: unknown }
          errorMessage = typeof response.data === 'string' ? response.data : 'Failed to create account'
        } else if ('message' in error) {
          errorMessage = String(error.message)
        }
      }

      toast.error('Failed to create user', {
        description: errorMessage,
      })
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      await deleteAccountMutation.mutateAsync(userToDelete)

      toast.success('User deleted successfully', {
        description: `Account "${userToDelete}" has been deleted`,
      })

      setShowDeleteDialog(false)
      setUserToDelete(null)
    } catch (error) {
      console.error('Failed to delete user:', error)
      let errorMessage = 'Unknown error occurred'
      if (typeof error === 'object' && error !== null) {
        if ('response' in error && typeof error.response === 'object' && error.response !== null) {
          const response = error.response as { data?: unknown }
          errorMessage = typeof response.data === 'string' ? response.data : 'Failed to delete user'
        } else if ('message' in error) {
          errorMessage = String(error.message)
        }
      }

      toast.error('Failed to delete user', {
        description: errorMessage,
      })
    }
  }

  const accounts = data?.items || []

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Accounts"
        description="Manage user accounts and permissions"
        action={
          hasUserManagement ? (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <IconAdd size={16} />
                  Create User
                </Button>
              </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateUser}>
                <DialogHeader>
                  <DialogTitle>Create User</DialogTitle>
                  <DialogDescription>
                    Create a new user account for ArgoCD
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={newUsername}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder="Enter username"
                      className="mt-1"
                    />
                    {usernameError && (
                      <p className="text-xs text-red-500 mt-1">{usernameError}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Enter password"
                      className="mt-1"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false)
                      setNewUsername('')
                      setNewUserPassword('')
                      setUsernameError('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!newUsername || !newUserPassword || !!usernameError || createAccountMutation.isPending}
                  >
                    {createAccountMutation.isPending ? 'Creating...' : 'Create User'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          ) : undefined
        }
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

          {/* Accounts Table */}
          {!isLoading && !error && (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-100 dark:bg-neutral-900">
                    <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      User
                    </TableHead>
                    <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Capabilities
                    </TableHead>
                    <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <IconUsers size={16} className="text-neutral-500" />
                          <span className="font-medium">{account.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.enabled ? 'default' : 'outline'} className="text-xs">
                          {account.enabled ? (
                            <>
                              <IconCircleCheck size={12} className="mr-1" />
                              Enabled
                            </>
                          ) : (
                            <>
                              <IconCircleWarning size={12} className="mr-1" />
                              Disabled
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {account.capabilities?.map((cap) => (
                            <span
                              key={cap}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAccount(account.name)
                              setShowPasswordDialog(true)
                            }}
                          >
                            <IconKey size={14} className="mr-1" />
                            Password
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAccount(account.name)
                              setShowTokenDialog(true)
                            }}
                            disabled={!account.capabilities?.includes('apiKey')}
                          >
                            Tokens
                          </Button>
                          {hasUserManagement && account.name !== 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUserToDelete(account.name)
                                setShowDeleteDialog(true)
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                            >
                              <IconDelete size={14} className="mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>

      {/* Confirm Delete Token Dialog */}
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
        requireTyping={false}
      />

      {/* Update Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Password</DialogTitle>
            <DialogDescription>
              Update the password for user "{selectedAccount}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">Current Password (optional)</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false)
                setNewPassword('')
                setCurrentPassword('')
                setSelectedAccount(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={!newPassword || updatePasswordMutation.isPending}
            >
              {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token Management Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>API Tokens - {selectedAccount}</DialogTitle>
            <DialogDescription>
              Manage API tokens for this account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Generate and manage API tokens for authentication
              </p>
              <Button
                size="sm"
                onClick={() => selectedAccount && handleCreateToken(selectedAccount)}
                disabled={createTokenMutation.isPending}
              >
                <IconAdd size={14} className="mr-1" />
                Generate Token
              </Button>
            </div>

            {generatedToken && tokenAccountName === selectedAccount && (
              <div className="p-3 rounded bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
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
                      toast.success('Token copied to clipboard')
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setGeneratedToken(null)
                    setTokenAccountName(null)
                  }}
                  className="mt-2"
                >
                  Dismiss
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Existing Tokens</h4>
              {(() => {
                const account = accounts.find(a => a.name === selectedAccount)
                const tokens = account?.tokens || []

                if (tokens.length === 0) {
                  return (
                    <p className="text-sm text-neutral-500 dark:text-neutral-500 py-4 text-center">
                      No tokens created yet
                    </p>
                  )
                }

                return tokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-3 rounded border border-neutral-200 dark:border-neutral-800"
                  >
                    <div className="text-sm">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        Token {token.id.substring(0, 8)}...
                      </p>
                      <p className="text-neutral-500 dark:text-neutral-500 text-xs">
                        Expires: {token.expiresAt ? new Date(token.expiresAt * 1000).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (selectedAccount) {
                          deleteHandler.handleDeleteClick({ accountName: selectedAccount, tokenId: token.id })
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                    >
                      <IconDelete size={14} className="mr-1" />
                      Delete
                    </Button>
                  </div>
                ))
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTokenDialog(false)
                setSelectedAccount(null)
                setGeneratedToken(null)
                setTokenAccountName(null)
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user "{userToDelete}"? This will permanently remove the user account and all their permissions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setUserToDelete(null)
              }}
              disabled={deleteAccountMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
