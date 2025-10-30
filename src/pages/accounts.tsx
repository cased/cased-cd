import {
  IconUsers,
  IconCircleCheck,
  IconCircleWarning,
} from 'obra-icons-react'
import { PageHeader } from '@/components/page-header'
import { useAccounts } from '@/services/accounts'
import { ErrorAlert } from '@/components/ui/error-alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
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

export function AccountsPage() {
  const { data, isLoading, error } = useAccounts()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorAlert error={error} />
      </div>
    )
  }

  const accounts = data?.items || []

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Accounts"
        subtitle="View ArgoCD accounts"
        icon={IconUsers}
      />

      <div className="flex-1 overflow-auto p-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Capabilities</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.name}>
                  <TableCell className="font-medium">
                    {account.name}
                  </TableCell>
                  <TableCell>
                    {account.enabled ? (
                      <Badge variant="success" className="flex w-fit items-center gap-1">
                        <IconCircleCheck className="h-3 w-3" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex w-fit items-center gap-1">
                        <IconCircleWarning className="h-3 w-3" />
                        Disabled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {account.capabilities?.join(', ') || 'None'}
                  </TableCell>
                </TableRow>
              ))}
              {accounts.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No accounts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Community Edition:</strong> Account management is view-only.
            For user creation, deletion, and advanced RBAC features, upgrade to{' '}
            <a
              href="mailto:enterprise@cased.com"
              className="text-primary hover:underline"
            >
              Cased CD Enterprise
            </a>.
          </p>
        </div>
      </div>
    </div>
  )
}
