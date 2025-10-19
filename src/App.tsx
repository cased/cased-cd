import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { ThemeProvider } from './lib/theme'
import { QueryProvider } from './lib/query-client'
import { AuthProvider, ProtectedRoute } from './lib/auth'
import { Layout } from './components/layout/layout'
import { Toaster } from './components/ui/sonner'
import { RouteLoading } from './components/route-loading'

// Eagerly load login page (first page users see)
import { LoginPage } from './pages/login'

// Lazy load all other pages for code splitting
const ApplicationsPage = lazy(() => import('./pages/applications'))
const ApplicationDetailPage = lazy(() => import('./pages/application-detail'))
const ApplicationSettingsPage = lazy(() => import('./pages/application-settings'))
const SettingsPage = lazy(() => import('./pages/settings'))
const AccountsPage = lazy(() => import('./pages/accounts'))
const CertificatesPage = lazy(() => import('./pages/certificates'))
const GPGKeysPage = lazy(() => import('./pages/gpgkeys'))
const RepositoriesPage = lazy(() => import('./pages/repositories'))
const ClustersPage = lazy(() => import('./pages/clusters'))
const ProjectsPage = lazy(() => import('./pages/projects'))
const UserInfoPage = lazy(() => import('./pages/user-info'))
const HelpPage = lazy(() => import('./pages/help'))

function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected routes with lazy loading */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/applications" replace />} />
                <Route
                  path="applications"
                  element={
                    <Suspense fallback={<RouteLoading />}>
                      <ApplicationsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="applications/:name"
                  element={
                    <Suspense fallback={<RouteLoading />}>
                      <ApplicationDetailPage />
                    </Suspense>
                  }
                />
                <Route
                  path="applications/:name/settings"
                  element={
                    <Suspense fallback={<RouteLoading />}>
                      <ApplicationSettingsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <Suspense fallback={<RouteLoading />}>
                      <SettingsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="accounts"
                  element={
                    <Suspense fallback={<RouteLoading />}>
                      <AccountsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="certificates"
                  element={
                    <Suspense fallback={<RouteLoading />}>
                      <CertificatesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="gpgkeys"
                  element={
                    <Suspense fallback={<RouteLoading />}>
                      <GPGKeysPage />
                    </Suspense>
                  }
                />
                <Route
                  path="repositories"
                  element={
                    <Suspense fallback={<RouteLoading />}>
                      <RepositoriesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="clusters"
                  element={
                    <Suspense fallback={<RouteLoading />}>
                      <ClustersPage />
                    </Suspense>
                  }
                />
                <Route
                  path="projects"
                  element={
                    <Suspense fallback={<RouteLoading />}>
                      <ProjectsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="user-info"
                  element={
                    <Suspense fallback={<RouteLoading />}>
                      <UserInfoPage />
                    </Suspense>
                  }
                />
                <Route
                  path="help"
                  element={
                    <Suspense fallback={<RouteLoading />}>
                      <HelpPage />
                    </Suspense>
                  }
                />
              </Route>
            </Routes>
            <Toaster />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryProvider>
  )
}

export default App
