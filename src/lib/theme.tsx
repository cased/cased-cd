import { type ReactNode, useEffect, createContext, useContext, useState } from 'react'

export type Appearance = 'dark' | 'light' | 'system'

// Create context for appearance
const AppearanceContext = createContext<{
  appearance: Appearance
  setAppearance: (appearance: Appearance) => void
  isDark: boolean
} | null>(null)

export const useAppearance = () => {
  const context = useContext(AppearanceContext)
  if (!context) {
    throw new Error('useAppearance must be used within ThemeProvider')
  }
  return context
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>(() => {
    const stored = localStorage.getItem('appearance')
    return (stored as Appearance) || 'dark'
  })
  const [isDark, setIsDark] = useState<boolean>(false)

  const setAppearance = (value: Appearance) => {
    setAppearanceState(value)
    localStorage.setItem('appearance', value)
  }

  useEffect(() => {
    const mediaQuery = matchMedia('(prefers-color-scheme: dark)')
    
    const updateTheme = (dark: boolean) => {
      setIsDark(dark)
      if (dark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    const handleSystemChange = ({ matches }: { matches: boolean }) => {
      if (appearance === 'system') {
        updateTheme(matches)
      }
    }

    if (appearance === 'system') {
      updateTheme(mediaQuery.matches)
      mediaQuery.addEventListener('change', handleSystemChange)
      return () => mediaQuery.removeEventListener('change', handleSystemChange)
    } else {
      updateTheme(appearance === 'dark')
    }
  }, [appearance])

  return (
    <AppearanceContext.Provider value={{ appearance, setAppearance, isDark }}>
      {children}
    </AppearanceContext.Provider>
  )
}
