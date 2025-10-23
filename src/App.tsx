import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './lib/theme'
import { QueryProvider } from './lib/query-client'
import { AuthProvider, ProtectedRoute } from './lib/auth'
import { Layout } from './components/layout/layout'
import { Toaster } from './components/ui/sonner'
import { LoginPage } from './pages/login'
import { ApplicationsPage } from './pages/applications'
import { ApplicationDetailPage } from './pages/application-detail'
import { ApplicationSettingsPage } from './pages/application-settings'
import { SettingsPage } from './pages/settings'
import { AccountsPage } from './pages/accounts'
import { CertificatesPage } from './pages/certificates'
import { GPGKeysPage } from './pages/gpgkeys'
import { RepositoriesPage } from './pages/repositories'
import { ClustersPage } from './pages/clusters'
import { ProjectsPage } from './pages/projects'
import { UserInfoPage } from './pages/user-info'
import { HelpPage } from './pages/help'
import { RBACPage } from './pages/rbac'

function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/applications" replace />} />
                <Route path="applications" element={<ApplicationsPage />} />
                <Route path="applications/:name" element={<ApplicationDetailPage />} />
                <Route path="applications/:name/settings" element={<ApplicationSettingsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="rbac" element={<RBACPage />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="certificates" element={<CertificatesPage />} />
                <Route path="gpgkeys" element={<GPGKeysPage />} />
                <Route path="repositories" element={<RepositoriesPage />} />
                <Route path="clusters" element={<ClustersPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="user-info" element={<UserInfoPage />} />
                <Route path="help" element={<HelpPage />} />
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
