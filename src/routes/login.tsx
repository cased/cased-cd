import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { IconSpinnerBall, IconCircleWarning } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(username, password)
      navigate({ to: '/applications' })
    } catch (err) {
      if (err instanceof Error && 'response' in err) {
        const response = err.response as { status?: number; data?: { error?: string } }

        // Handle rate limiting
        if (response?.status === 429) {
          setError('Too many login attempts. Please wait a minute and try again.')
        } else {
          setError(response?.data?.error || err.message || 'Login failed')
        }
      } else {
        setError(err instanceof Error ? err.message : 'Login failed')
      }
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 items-center justify-center p-12">
        <div className="max-w-md">
          <div className="mb-12">
            <img src="/cased-logo.svg" alt="Cased CD" className="h-18 w-auto" />
          </div>
          <p className="text-xl text-blue-100">
            Modern GitOps deployment platform powered by ArgoCD
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-white" />
              <span className="text-blue-50">Continuous Deployment</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-white" />
              <span className="text-blue-50">GitOps Automation</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-white" />
              <span className="text-blue-50">Deployment Intelligence</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Login card */}
          <div className="rounded-lg border border-neutral-200 bg-white p-8 shadow-lg">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Welcome back</h2>
              <p className="text-sm text-neutral-600">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-neutral-700 mb-2">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoComplete="username"
                  autoFocus
                  disabled={isLoading}
                  className="bg-white text-neutral-900"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="bg-white text-neutral-900"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <IconCircleWarning size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="default"
                disabled={isLoading}
                className="w-full gap-2"
              >
                {isLoading && <IconSpinnerBall size={16} className="animate-spin" />}
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-neutral-500">
              Powered by ArgoCD • Built by Cased
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              v{import.meta.env.PACKAGE_VERSION || '0.1.14'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
