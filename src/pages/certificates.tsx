import { useState } from 'react'
import {
  IconShieldCheck,
  IconAdd,
  IconDelete,
  IconCircleForward,
} from 'obra-icons-react'
import { PageHeader } from '@/components/page-header'
import { useCertificates, useCreateCertificate, useDeleteCertificate } from '@/services/certificates'
import { useDeleteHandler } from '@/hooks/useDeleteHandler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Certificate {
  serverName: string
  certType: string
  certSubType: string
  certInfo?: string
}

export function CertificatesPage() {
  const { data, isLoading, error } = useCertificates()
  const createMutation = useCreateCertificate()
  const deleteMutation = useDeleteCertificate()

  const [showAddForm, setShowAddForm] = useState(false)
  const [serverName, setServerName] = useState('')
  const [certType, setCertType] = useState<'ssh' | 'https'>('ssh')
  const [certData, setCertData] = useState('')

  const deleteHandler = useDeleteHandler<Certificate, { serverName: string; certType: string; certSubType: string }>({
    deleteFn: deleteMutation.mutateAsync,
    resourceType: 'Certificate',
    getId: (cert) => ({ serverName: cert.serverName, certType: cert.certType, certSubType: cert.certSubType }),
    getDisplayName: (cert) => cert.serverName,
    isDeleting: deleteMutation.isPending,
  })

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({
        serverName,
        certType,
        certData,
      })
      setServerName('')
      setCertData('')
      setShowAddForm(false)
    } catch (error) {
      console.error('Failed to create certificate:', error)
    }
  }

  const certificates = data?.items || []

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Certificates"
        description="Manage TLS and SSH certificates for Git repositories"
      />

      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-4">
          {/* Add Certificate Button */}
          {!showAddForm && (
            <div className="mb-4">
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowAddForm(true)}
              >
                <IconAdd size={14} />
                Add Certificate
              </Button>
            </div>
          )}

          {/* Add Certificate Form */}
          {showAddForm && (
            <Card className="mb-4 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <CardHeader className="p-4">
                <CardTitle className="text-sm">Add Certificate</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div>
                  <Label htmlFor="serverName" className="text-xs">
                    Server Name
                  </Label>
                  <Input
                    id="serverName"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    placeholder="github.com or [ssh.github.com]:443"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="certType" className="text-xs">
                    Certificate Type
                  </Label>
                  <select
                    id="certType"
                    value={certType}
                    onChange={(e) => setCertType(e.target.value as 'ssh' | 'https')}
                    className="mt-1 flex h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-1 text-xs"
                  >
                    <option value="ssh">SSH</option>
                    <option value="https">HTTPS</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="certData" className="text-xs">
                    Certificate Data
                  </Label>
                  <textarea
                    id="certData"
                    value={certData}
                    onChange={(e) => setCertData(e.target.value)}
                    placeholder="Paste certificate data here..."
                    rows={4}
                    className="mt-1 flex w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={!serverName || !certData || createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Adding...' : 'Add Certificate'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false)
                      setServerName('')
                      setCertData('')
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
              <p className="text-neutral-600 dark:text-neutral-400">Loading certificates...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
              <p className="text-sm text-red-400">
                {error instanceof Error ? error.message : 'Failed to load certificates'}
              </p>
            </div>
          )}

          {/* Certificates List */}
          {!isLoading && !error && certificates.length === 0 && (
            <div className="text-center py-12 text-neutral-600 dark:text-neutral-400 text-sm">
              No certificates configured
            </div>
          )}

          {!isLoading && !error && certificates.length > 0 && (
            <div className="space-y-2">
              {certificates.map((cert, idx) => (
                <Card
                  key={`${cert.serverName}-${cert.certType}-${cert.certSubType}-${idx}`}
                  className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-none"
                >
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded bg-green-100 dark:bg-green-950 flex items-center justify-center">
                          <IconShieldCheck size={20} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-sm">{cert.serverName}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800">
                              {cert.certType}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800">
                              {cert.certSubType}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 font-mono">
                            {cert.certInfo}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteHandler.handleDeleteClick(cert)}
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
        open={deleteHandler.dialogOpen}
        onOpenChange={deleteHandler.setDialogOpen}
        title="Delete Certificate"
        description={`Are you sure you want to delete the certificate for "${deleteHandler.resourceToDelete?.serverName}"? This action cannot be undone.`}
        confirmText="Delete"
        resourceName={deleteHandler.resourceToDelete?.serverName || ''}
        resourceType="certificate"
        onConfirm={deleteHandler.handleDeleteConfirm}
        isLoading={deleteHandler.isDeleting}
      />
    </div>
  )
}
