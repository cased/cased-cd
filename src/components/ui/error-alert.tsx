import { IconCircleWarning, IconCircleClose } from 'obra-icons-react'
import { Button } from '@/components/ui/button'

interface ErrorAlertProps {
  /**
   * The error to display
   */
  error: Error | unknown

  /**
   * Optional callback when user clicks "Try Again"
   */
  onRetry?: () => void

  /**
   * Optional custom title (defaults to "Failed to load")
   */
  title?: string

  /**
   * Optional icon to display (defaults to IconCircleWarning)
   */
  icon?: 'warning' | 'close'

  /**
   * Size variant for padding and spacing
   */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Reusable error alert component with consistent styling
 *
 * @example
 * ```tsx
 * {error && (
 *   <ErrorAlert
 *     error={error}
 *     onRetry={() => refetch()}
 *     title="Failed to load applications"
 *   />
 * )}
 * ```
 */
export function ErrorAlert({
  error,
  onRetry,
  title = 'Failed to load',
  icon = 'warning',
  size = 'md',
}: ErrorAlertProps) {
  const errorMessage = error instanceof Error
    ? error.message
    : 'Unable to connect to ArgoCD API'

  const IconComponent = icon === 'close' ? IconCircleClose : IconCircleWarning

  const paddingClass = size === 'sm' ? 'p-3' : size === 'lg' ? 'p-6' : 'p-4'
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20
  const titleClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
  const messageClass = size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-sm' : 'text-xs'
  const gapClass = size === 'sm' ? 'gap-2' : size === 'lg' ? 'gap-3' : 'gap-2.5'

  return (
    <div className={`rounded border border-red-500/20 bg-red-500/10 ${paddingClass}`}>
      <div className={`flex items-start ${gapClass}`}>
        <IconComponent size={iconSize} className="text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium text-red-400 mb-0.5 ${titleClass}`}>
            {title}
          </h3>
          <p className={`text-red-400/80 mb-${size === 'sm' ? '2' : '3'} ${messageClass}`}>
            {errorMessage}
          </p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
