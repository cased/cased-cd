import { LoadingSpinner } from "@/components/ui/loading-spinner"

/**
 * Loading fallback component for lazy-loaded routes.
 * Shows a centered spinner while the route component is being loaded.
 */
export function RouteLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <LoadingSpinner message="Loading..." />
    </div>
  )
}
