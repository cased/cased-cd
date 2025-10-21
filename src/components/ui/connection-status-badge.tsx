import { Badge } from '@/components/ui/badge'
import { getConnectionStatusIcon } from '@/lib/status-icons'

interface ConnectionStatusBadgeProps {
  status?: 'Successful' | 'Failed'
  className?: string
}

/**
 * Displays a connection status badge with icon and text
 * Used for repository and cluster connection states
 */
export function ConnectionStatusBadge({
  status,
  className = ''
}: ConnectionStatusBadgeProps) {
  if (!status) return null

  const { icon: Icon, color } = getConnectionStatusIcon(status)

  return (
    <Badge variant="outline" className={`gap-1.5 ${className}`}>
      <Icon size={12} className={color} />
      {status}
    </Badge>
  )
}
