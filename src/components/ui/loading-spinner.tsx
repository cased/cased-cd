import { IconCircleForward } from 'obra-icons-react'

interface LoadingSpinnerProps {
  /**
   * Loading message to display
   */
  message?: string

  /**
   * Size of the spinner icon
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Minimum height of the container
   */
  containerHeight?: string
}

/**
 * Reusable loading spinner component with consistent styling
 *
 * @example
 * ```tsx
 * {isLoading && (
 *   <LoadingSpinner message="Loading applications..." />
 * )}
 * ```
 */
export function LoadingSpinner({
  message = 'Loading...',
  size = 'md',
  containerHeight = 'min-h-[400px]',
}: LoadingSpinnerProps) {
  const iconSize = size === 'sm' ? 20 : size === 'lg' ? 32 : 24
  const textClass = size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-sm' : 'text-xs'
  const marginClass = size === 'sm' ? 'mb-1.5' : size === 'lg' ? 'mb-4' : 'mb-2'

  return (
    <div className={`flex items-center justify-center ${containerHeight}`}>
      <div className="text-center">
        <IconCircleForward
          size={iconSize}
          className={`animate-spin text-neutral-400 mx-auto ${marginClass}`}
        />
        {message && (
          <p className={`text-neutral-600 dark:text-neutral-400 ${textClass}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
