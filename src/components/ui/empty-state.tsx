import { type ComponentType } from 'react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  /**
   * Icon component to display
   */
  icon: ComponentType<{ size?: number; className?: string }>

  /**
   * Title of the empty state
   */
  title: string

  /**
   * Description text
   */
  description: string

  /**
   * Optional action button configuration
   */
  action?: {
    label: string
    onClick: () => void
    icon?: ComponentType<{ size?: number }>
  }
}

/**
 * Reusable empty state component with consistent styling
 *
 * @example
 * ```tsx
 * {!isLoading && !error && items.length === 0 && (
 *   <EmptyState
 *     icon={IconFolder}
 *     title="No repositories yet"
 *     description="Connect your first Git, Helm, or OCI repository to get started"
 *     action={{
 *       label: 'Connect Repository',
 *       onClick: () => setShowCreatePanel(true),
 *       icon: IconAdd,
 *     }}
 *   />
 * )}
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
      <div className="max-w-md mx-auto">
        <div className="h-9 w-9 rounded bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-2">
          <Icon size={24} className="text-neutral-400" />
        </div>
        <h3 className="font-medium text-sm text-black dark:text-white mb-1">
          {title}
        </h3>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
          {description}
        </p>
        {action && (
          <Button variant="default" onClick={action.onClick}>
            {action.icon && <action.icon size={16} />}
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}
