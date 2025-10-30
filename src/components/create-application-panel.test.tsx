import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreateApplicationPanel } from './create-application-panel'

// Mock the services
vi.mock('@/services/applications', () => ({
  useCreateApplication: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}))

vi.mock('@/services/projects', () => ({
  useProjects: () => ({
    data: {
      items: [
        { metadata: { name: 'default' } },
        { metadata: { name: 'test-project' } },
      ],
    },
  }),
}))

describe('CreateApplicationPanel', () => {
  let queryClient: QueryClient
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const renderPanel = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CreateApplicationPanel onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </QueryClientProvider>
    )
  }

  it('should render the create application form', () => {
    renderPanel()
    expect(screen.getByRole('heading', { name: 'Create Application' })).toBeInTheDocument()
    expect(screen.getByText('Deploy a new application to your cluster')).toBeInTheDocument()
  })

  it('should mark required fields with asterisk', () => {
    renderPanel()
    expect(screen.getByText('Application Name *')).toBeInTheDocument()
    expect(screen.getByText('Repository URL *')).toBeInTheDocument()
    expect(screen.getByText('Path *')).toBeInTheDocument()
    expect(screen.getByText('Namespace *')).toBeInTheDocument()
  })

  it('should show helpful description for Path field', () => {
    renderPanel()
    expect(
      screen.getByText(/Directory path within the repository containing your manifests or Helm chart/)
    ).toBeInTheDocument()
  })

  it('should not submit form when Path is empty', async () => {
    renderPanel()

    // Fill in other required fields
    fireEvent.change(screen.getByPlaceholderText('my-app'), {
      target: { value: 'test-app' },
    })
    fireEvent.change(screen.getByPlaceholderText('https://github.com/argoproj/argocd-example-apps'), {
      target: { value: 'https://github.com/test/repo' },
    })

    // Leave Path empty - get the button and click it
    const submitButton = screen.getByRole('button', { name: /Create Application/ })
    fireEvent.click(submitButton)

    // Form should not submit due to HTML5 validation
    await waitFor(() => {
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })
  })

  it('should have required attribute on Path input', () => {
    renderPanel()
    const pathInput = screen.getByPlaceholderText('guestbook')
    expect(pathInput).toHaveAttribute('required')
  })

  it('should switch between Form and YAML modes', () => {
    renderPanel()

    // Initially in Form mode
    expect(screen.getByPlaceholderText('my-app')).toBeInTheDocument()

    // Click YAML mode button
    const yamlButton = screen.getByRole('button', { name: /YAML/ })
    fireEvent.click(yamlButton)

    // Should show YAML textarea
    expect(screen.getByPlaceholderText(/metadata:/)).toBeInTheDocument()

    // Click Form mode button
    const formButton = screen.getByRole('button', { name: /Form/ })
    fireEvent.click(formButton)

    // Should show form inputs again
    expect(screen.getByPlaceholderText('my-app')).toBeInTheDocument()
  })
})
