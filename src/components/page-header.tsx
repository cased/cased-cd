import { IconCircleForward } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import type { ReactNode, ComponentType } from 'react'

interface ActionButton {
  label: string
  onClick: () => void
  icon?: ComponentType<{ size?: number; className?: string }>
  variant?: 'default' | 'outline'
}

interface PageHeaderProps {
  title: string
  description?: string
  onRefresh?: () => void
  isRefreshing?: boolean
  action?: ActionButton
  children?: ReactNode
}

export function PageHeader({
  title,
  description,
  onRefresh,
  isRefreshing = false,
  action,
  children
}: PageHeaderProps) {
  const hasActions = onRefresh || action

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
      <div className="px-6 py-3">
        <div className={hasActions ? "flex items-center justify-between mb-3" : ""}>
          <div>
            <h1 className="text-lg font-semibold text-black dark:text-white tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>

          {hasActions && (
            <div className="flex gap-2">
              {onRefresh && (
                <Button
                  variant="outline"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                >
                  <IconCircleForward
                    size={16}
                    className={isRefreshing ? 'animate-spin' : ''}
                  />
                  Refresh
                </Button>
              )}
              {action && (
                <Button
                  variant={action.variant || 'default'}
                  onClick={action.onClick}
                >
                  {action.icon && <action.icon size={16} />}
                  {action.label}
                </Button>
              )}
            </div>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}
