import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import api from './api-client'

interface AuthContextType {
  isAuthenticated: boolean
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('argocd_token')
    if (storedToken) {
      setToken(storedToken)
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const response = await api.post<{ token: string }>('/session', {
      username,
      password,
    })

    const newToken = response.data.token
    localStorage.setItem('argocd_token', newToken)
    setToken(newToken)
  }

  const logout = () => {
    localStorage.removeItem('argocd_token')
    setToken(null)
  }

  const value = {
    isAuthenticated: !!token,
    token,
    login,
    logout,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Loading component for auth check
export function AuthLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="text-center">
        <div className="h-8 w-8 border-2 border-neutral-600 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-400">Loading...</p>
      </div>
    </div>
  )
}
