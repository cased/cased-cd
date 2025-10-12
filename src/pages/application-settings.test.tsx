import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApplicationSettingsPage } from './application-settings'

// Polyfill ResizeObserver for tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
import * as applicationsService from '@/services/applications'
import * as projectsService from '@/services/projects'
import * as repositoriesService from '@/services/repositories'
import * as clustersService from '@/services/clusters'
import type { Application } from '@/types/api'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ name: 'test-app' }),
    useNavigate: () => mockNavigate,
  }
})

// Mock the services
vi.mock('@/services/applications')
vi.mock('@/services/projects')
vi.mock('@/services/repositories')
vi.mock('@/services/clusters')

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockApplication: Application = {
  metadata: {
    name: 'test-app',
    namespace: 'argocd',
  },
  spec: {
    project: 'default',
    source: {
      repoURL: 'https://github.com/test/repo',
      targetRevision: 'main',
      path: 'manifests',
    },
    destination: {
      server: 'https://kubernetes.default.svc',
      namespace: 'test-namespace',
    },
    syncPolicy: {
      automated: {
        prune: true,
        selfHeal: false,
        allowEmpty: false,
      },
      syncOptions: ['CreateNamespace=true'],
      retry: {
        limit: 5,
        backoff: {
          duration: '5s',
          factor: 2,
          maxDuration: '3m0s',
        },
      },
    },
  },
  status: {
    sync: { status: 'Synced' },
    health: { status: 'Healthy' },
  },
}

const mockProjects = {
  items: [
    { metadata: { name: 'default' } },
    { metadata: { name: 'production' } },
  ],
}

const mockRepositories = {
  items: [
    { repo: 'https://github.com/test/repo', name: 'test-repo' },
    { repo: 'https://github.com/other/repo', name: 'other-repo' },
  ],
}

const mockClusters = {
  items: [
    { server: 'https://kubernetes.default.svc', name: 'in-cluster' },
    { server: 'https://prod-cluster.example.com', name: 'prod' },
  ],
}

function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(component, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    ),
  })
}

describe('ApplicationSettingsPage', () => {
  const mockUpdateApplicationSpec = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock service hooks
    vi.spyOn(applicationsService, 'useApplication').mockReturnValue({
      data: mockApplication,
      isLoading: false,
      error: null,
    } as any)

    vi.spyOn(applicationsService, 'useUpdateApplicationSpec').mockReturnValue({
      mutateAsync: mockUpdateApplicationSpec,
      isPending: false,
    } as any)

    vi.spyOn(projectsService, 'useProjects').mockReturnValue({
      data: mockProjects,
    } as any)

    vi.spyOn(repositoriesService, 'useRepositories').mockReturnValue({
      data: mockRepositories,
    } as any)

    vi.spyOn(clustersService, 'useClusters').mockReturnValue({
      data: mockClusters,
    } as any)
  })

  it('renders loading state initially', () => {
    vi.spyOn(applicationsService, 'useApplication').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    renderWithProviders(<ApplicationSettingsPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders not found state when application does not exist', () => {
    vi.spyOn(applicationsService, 'useApplication').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<ApplicationSettingsPage />)

    expect(screen.getByText('Application not found')).toBeInTheDocument()
  })

  it('renders settings form with application data', async () => {
    renderWithProviders(<ApplicationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Settings: test-app')).toBeInTheDocument()
    })

    // Check that form fields are populated
    expect(screen.getByDisplayValue('https://github.com/test/repo')).toBeInTheDocument()
    expect(screen.getByDisplayValue('main')).toBeInTheDocument()
    expect(screen.getByDisplayValue('manifests')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test-namespace')).toBeInTheDocument()
  })

  it('displays all settings sections', async () => {
    renderWithProviders(<ApplicationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('General')).toBeInTheDocument()
    })

    expect(screen.getByText('Source')).toBeInTheDocument()
    expect(screen.getByText('Destination')).toBeInTheDocument()
    expect(screen.getByText('Sync Policy')).toBeInTheDocument()
    expect(screen.getByText('Advanced')).toBeInTheDocument()
  })

  it('shows automated sync options when enabled', async () => {
    renderWithProviders(<ApplicationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Prune Resources')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Self Heal')).toBeInTheDocument()
    expect(screen.getByLabelText('Allow Empty')).toBeInTheDocument()
  })

  it('hides automated sync options when disabled', async () => {
    const appWithoutAutoSync = {
      ...mockApplication,
      spec: {
        ...mockApplication.spec,
        syncPolicy: undefined,
      },
    }

    vi.spyOn(applicationsService, 'useApplication').mockReturnValue({
      data: appWithoutAutoSync,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<ApplicationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Settings: test-app')).toBeInTheDocument()
    })

    expect(screen.queryByLabelText('Prune Resources')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Self Heal')).not.toBeInTheDocument()
  })

  it('navigates back when cancel button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ApplicationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Cancel'))

    expect(mockNavigate).toHaveBeenCalledWith('/applications/test-app')
  })

  it('navigates back when back button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ApplicationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Back'))

    expect(mockNavigate).toHaveBeenCalledWith('/applications/test-app')
  })

  it('submits form with updated values', async () => {
    const user = userEvent.setup()
    mockUpdateApplicationSpec.mockResolvedValue({})

    renderWithProviders(<ApplicationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('main')).toBeInTheDocument()
    })

    // Change target revision
    const revisionInput = screen.getByDisplayValue('main')
    await user.clear(revisionInput)
    await user.type(revisionInput, 'develop')

    // Submit form
    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(mockUpdateApplicationSpec).toHaveBeenCalledWith({
        name: 'test-app',
        spec: expect.objectContaining({
          source: expect.objectContaining({
            targetRevision: 'develop',
          }),
        }),
      })
    })

    expect(mockNavigate).toHaveBeenCalledWith('/applications/test-app')
  })

  it('handles form validation errors', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ApplicationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://github.com/test/repo')).toBeInTheDocument()
    })

    // Clear required field
    const repoInput = screen.getByDisplayValue('https://github.com/test/repo')
    await user.clear(repoInput)
    await user.type(repoInput, 'invalid-url')

    // Try to submit
    await user.click(screen.getByText('Save Changes'))

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Must be a valid URL')).toBeInTheDocument()
    })

    // Should not call mutation
    expect(mockUpdateApplicationSpec).not.toHaveBeenCalled()
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    mockUpdateApplicationSpec.mockRejectedValue(new Error('API Error'))

    renderWithProviders(<ApplicationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Save Changes'))

    // Should not navigate on error
    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  it('disables form while submitting', async () => {
    const user = userEvent.setup()
    mockUpdateApplicationSpec.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    )

    renderWithProviders(<ApplicationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Save Changes'))

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    // Buttons should be disabled
    expect(screen.getByText('Saving...')).toBeDisabled()
    expect(screen.getByText('Cancel')).toBeDisabled()
  })

  it('expands and collapses advanced section', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ApplicationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Advanced')).toBeInTheDocument()
    })

    // Advanced content should not be visible initially (collapsed)
    expect(screen.queryByText('Sync Options')).not.toBeVisible()

    // Click to expand
    await user.click(screen.getByText('Advanced'))

    // Content should now be visible
    await waitFor(() => {
      expect(screen.getByText('Sync Options')).toBeVisible()
    })

    expect(screen.getByLabelText('Auto-Create Namespace')).toBeInTheDocument()
    expect(screen.getByLabelText('Prune Last')).toBeInTheDocument()
  })

  it('includes sync options in submission when checked', async () => {
    const user = userEvent.setup()
    mockUpdateApplicationSpec.mockResolvedValue({})

    renderWithProviders(<ApplicationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Advanced')).toBeInTheDocument()
    })

    // Expand advanced section
    await user.click(screen.getByText('Advanced'))

    await waitFor(() => {
      expect(screen.getByLabelText('Prune Last')).toBeInTheDocument()
    })

    // Check prune last option
    await user.click(screen.getByLabelText('Prune Last'))

    // Submit form
    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(mockUpdateApplicationSpec).toHaveBeenCalledWith({
        name: 'test-app',
        spec: expect.objectContaining({
          syncPolicy: expect.objectContaining({
            syncOptions: expect.arrayContaining(['PruneLast=true', 'CreateNamespace=true']),
          }),
        }),
      })
    })
  })
})
