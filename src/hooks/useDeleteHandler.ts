import { useState } from 'react'
import { toast } from 'sonner'

interface UseDeleteHandlerOptions<T, TId = string> {
  /**
   * The mutation function that performs the delete operation
   */
  deleteFn: (id: TId) => Promise<void>

  /**
   * Resource type name (e.g., "Repository", "Project", "Application")
   * Used in toast messages
   */
  resourceType: string

  /**
   * Function to extract the ID from the resource (can be string or object)
   */
  getId: (resource: T) => TId

  /**
   * Function to get the display name for the resource
   */
  getDisplayName: (resource: T) => string

  /**
   * Optional callback to run after successful deletion
   */
  onSuccess?: () => void

  /**
   * Optional flag to indicate if the delete is in progress
   */
  isDeleting?: boolean
}

interface DeleteHandlerReturn<T> {
  /**
   * Whether the delete confirmation dialog is open
   */
  dialogOpen: boolean

  /**
   * Set the dialog open state
   */
  setDialogOpen: (open: boolean) => void

  /**
   * The resource currently being deleted
   */
  resourceToDelete: T | null

  /**
   * Opens the delete confirmation dialog for a resource
   */
  handleDeleteClick: (resource: T) => void

  /**
   * Confirms and executes the delete operation
   */
  handleDeleteConfirm: () => Promise<void>

  /**
   * Whether a delete operation is in progress
   */
  isDeleting: boolean
}

/**
 * Reusable hook for handling delete operations with confirmation dialogs
 *
 * @example
 * ```tsx
 * const deleteHandler = useDeleteHandler({
 *   deleteFn: deleteMutation.mutateAsync,
 *   resourceType: 'Repository',
 *   getId: (repo) => repo.repo,
 *   getDisplayName: (repo) => repo.name || repo.repo,
 *   onSuccess: () => refetch(),
 *   isDeleting: deleteMutation.isPending,
 * })
 *
 * // In your component:
 * <Button onClick={() => deleteHandler.handleDeleteClick(repo)}>Delete</Button>
 *
 * <ConfirmDialog
 *   open={deleteHandler.dialogOpen}
 *   onOpenChange={deleteHandler.setDialogOpen}
 *   onConfirm={deleteHandler.handleDeleteConfirm}
 *   isLoading={deleteHandler.isDeleting}
 * />
 * ```
 */
export function useDeleteHandler<T, TId = string>({
  deleteFn,
  resourceType,
  getId,
  getDisplayName,
  onSuccess,
  isDeleting = false,
}: UseDeleteHandlerOptions<T, TId>): DeleteHandlerReturn<T> {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [resourceToDelete, setResourceToDelete] = useState<T | null>(null)

  const handleDeleteClick = (resource: T) => {
    setResourceToDelete(resource)
    setDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!resourceToDelete) return

    try {
      const id = getId(resourceToDelete)
      const displayName = getDisplayName(resourceToDelete)

      await deleteFn(id)

      toast.success(`${resourceType} deleted`, {
        description: `Successfully deleted ${resourceType.toLowerCase()} "${displayName}"`,
      })

      setDialogOpen(false)
      setResourceToDelete(null)

      // Call optional success callback (e.g., refetch)
      onSuccess?.()
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error(`Failed to delete ${resourceType.toLowerCase()}`, {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    dialogOpen,
    setDialogOpen,
    resourceToDelete,
    handleDeleteClick,
    handleDeleteConfirm,
    isDeleting,
  }
}
