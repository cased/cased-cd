import { useState, useEffect } from 'react'
import { IconCircleWarning } from 'obra-icons-react'
import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { Input } from './input'
import { Label } from './label'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  resourceName: string
  resourceType: string
  onConfirm: () => void
  isLoading?: boolean
  requireTyping?: boolean // If false, user just needs to click confirm without typing
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Delete',
  resourceName,
  resourceType,
  onConfirm,
  isLoading = false,
  requireTyping = true,
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('')
  const isValid = !requireTyping || inputValue === resourceName

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setInputValue('')
    }
  }, [open])

  const handleConfirm = () => {
    if (isValid && !isLoading) {
      onConfirm()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && !isLoading) {
      handleConfirm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
              <IconCircleWarning size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-base">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        {requireTyping && (
          <div className="py-4">
            <Label htmlFor="confirm-input" className="text-xs">
              Type <span className="font-semibold text-black dark:text-white">{resourceName}</span> to confirm
            </Label>
            <Input
              id="confirm-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={resourceName}
              className="mt-2"
              autoFocus
            />
            <p className="text-[10px] text-neutral-500 dark:text-neutral-500 mt-1">
              This action cannot be undone. This will permanently delete the {resourceType}.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
          >
            {isLoading ? 'Deleting...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
