import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { IconLock, IconCircleCheck } from 'obra-icons-react'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature: string
  featureDescription?: string
}

export function UpgradeModal({
  open,
  onOpenChange,
  feature,
  featureDescription,
}: UpgradeModalProps) {
  const handleUpgrade = () => {
    // Redirect to app.cased.com upgrade page
    window.open('https://app.cased.com/upgrade', '_blank')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <IconLock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-center">Upgrade to Enterprise</DialogTitle>
          <DialogDescription className="text-center">
            {featureDescription || `${feature} is available on the Enterprise plan.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3">
            <IconCircleCheck className="h-5 w-5 text-grass-11 mt-0.5" />
            <div>
              <div className="font-medium">Advanced RBAC Management</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Per-app permissions, role-based access control
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <IconCircleCheck className="h-5 w-5 text-grass-11 mt-0.5" />
            <div>
              <div className="font-medium">Audit Logs</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Track all deployment and permission changes
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <IconCircleCheck className="h-5 w-5 text-grass-11 mt-0.5" />
            <div>
              <div className="font-medium">SSO Integration</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                SAML, OIDC, and enterprise authentication
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <IconCircleCheck className="h-5 w-5 text-grass-11 mt-0.5" />
            <div>
              <div className="font-medium">Priority Support</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                24/7 dedicated support team
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button onClick={handleUpgrade} className="w-full sm:w-auto">
            Upgrade to Enterprise
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
