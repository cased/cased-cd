import { type ReactNode, useEffect, createContext, useContext, useState } from 'react'

export type Appearance = 'dark' | 'light' | 'system'

// Create context for appearance
const AppearanceContext = createContext<{
  appearance: Appearance
  setAppearance: (appearance: Appearance) => void
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

  const setAppearance = (value: Appearance) => {
    setAppearanceState(value)
    localStorage.setItem('appearance', value)
  }

  useEffect(() => {
    const mediaQuery = matchMedia('(prefers-color-scheme: dark)')
    const switchAppearance = ({ matches }: { matches: boolean }) => {
      if (matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    if (appearance === 'system') {
      switchAppearance(mediaQuery)
      mediaQuery.addEventListener('change', switchAppearance)
      return () => mediaQuery.removeEventListener('change', switchAppearance)
    } else {
      switchAppearance({ matches: appearance === 'dark' })
    }
  }, [appearance])

  return (
    <AppearanceContext.Provider value={{ appearance, setAppearance }}>
      {children}
    </AppearanceContext.Provider>
  )
}
