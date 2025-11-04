import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STORAGE_KEY = 'cased_cd_welcome_shown'

interface WelcomeData {
  name?: string
  email?: string
  useCase?: string
}

export function WelcomeModal() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [useCase, setUseCase] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Only show for community edition
  const isCommunity = import.meta.env.VITE_IS_ENTERPRISE !== 'true'

  useEffect(() => {
    // Only show if:
    // 1. It's the community edition
    // 2. User hasn't seen the modal before
    // 3. User is authenticated (has a token)
    const hasSeenWelcome = localStorage.getItem(STORAGE_KEY)
    const hasToken = localStorage.getItem('argocd_token')

    if (isCommunity && !hasSeenWelcome && hasToken) {
      // Show modal after a short delay for better UX
      const timer = setTimeout(() => {
        setOpen(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isCommunity])

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'skipped')
    setOpen(false)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    const data: WelcomeData = {
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      useCase: useCase || undefined,
    }

    try {
      // Send to Cased backend at api.cased.com
      // Note: The community token below is PUBLIC (not a secret). It's embedded in all
      // community edition builds and just ensures requests come from Cased CD installs.
      await fetch('https://api.cased.com/api/v1/community/welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Community-Token': 'ccd_community_v1_public_k7m2x9p4n8', // Public token
        },
        body: JSON.stringify(data),
      })
      localStorage.setItem(STORAGE_KEY, 'submitted')
      setOpen(false)
    } catch (error) {
      // If it fails, just mark as shown and close
      // We don't want to block the user if the endpoint fails
      console.error('Failed to submit welcome data:', error)
      localStorage.setItem(STORAGE_KEY, 'error')
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isCommunity) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to Cased CD! 👋</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Thanks for trying out Cased CD Community Edition! We'd love to know a bit about
            how you're using it. This is completely optional and helps us improve the project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name or Organization (optional)</Label>
            <Input
              id="name"
              placeholder="e.g., John Doe or Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              We'll only use this to send occasional product updates (you can unsubscribe anytime)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="useCase">How are you planning to use Cased CD? (optional)</Label>
            <Select value={useCase} onValueChange={setUseCase} disabled={isSubmitting}>
              <SelectTrigger id="useCase">
                <SelectValue placeholder="Select a use case..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal Project</SelectItem>
                <SelectItem value="startup">Startup</SelectItem>
                <SelectItem value="small-business">Small Business</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
                <SelectItem value="evaluation">Evaluating for Work</SelectItem>
                <SelectItem value="learning">Learning/Education</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              ℹ️ Your privacy matters. We don't collect any data from your ArgoCD deployments or
              applications. This is just to understand our community better.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={isSubmitting}
          >
            Skip
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
