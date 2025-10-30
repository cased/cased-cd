import {
  IconCircleCheck,
  IconCircleWarning,
  IconCircleInfo,
  IconClock3,
  IconCircleClose,
} from 'obra-icons-react'
import type { HealthStatus } from '@/types/api'
import type { ComponentType } from 'react'

/**
 * Health status icon and color mappings for ArgoCD applications
 */
export const healthIcons: Record<
  HealthStatus,
  { icon: ComponentType<{ size?: number; className?: string }>; color: string }
> = {
  Healthy: { icon: IconCircleCheck, color: 'text-grass-11' },
  Progressing: { icon: IconClock3, color: 'text-blue-400' },
  Degraded: { icon: IconCircleWarning, color: 'text-amber-400' },
  Suspended: { icon: IconCircleWarning, color: 'text-neutral-400' },
  Missing: { icon: IconCircleWarning, color: 'text-red-400' },
  Unknown: { icon: IconCircleInfo, color: 'text-neutral-500' },
}

/**
 * Get health status icon component and color class
 */
export function getHealthIcon(status: HealthStatus | undefined) {
  return healthIcons[status || 'Unknown']
}

/**
 * Connection status icon and color mappings
 */
export const connectionStatusIcons = {
  Successful: { icon: IconCircleCheck, color: 'text-grass-11' },
  Failed: { icon: IconCircleClose, color: 'text-red-400' },
} as const

/**
 * Get connection status icon component and color class
 */
export function getConnectionStatusIcon(status: 'Successful' | 'Failed' | undefined) {
  return connectionStatusIcons[status || 'Failed']
}
