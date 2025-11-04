import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WelcomeModal } from './welcome-modal'

describe('WelcomeModal', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should not render modal if already shown', () => {
    localStorage.setItem('cased_cd_welcome_shown', 'submitted')
    localStorage.setItem('argocd_token', 'test-token')

    render(<WelcomeModal />)

    expect(screen.queryByText(/Welcome to Cased CD/i)).not.toBeInTheDocument()
  })

  it('should not render modal if not authenticated', () => {
    render(<WelcomeModal />)

    expect(screen.queryByText(/Welcome to Cased CD/i)).not.toBeInTheDocument()
  })

  it('should render modal for community edition when authenticated and not shown before', async () => {
    localStorage.setItem('argocd_token', 'test-token')

    render(<WelcomeModal />)

    // Wait for modal to appear (1 second delay in component)
    await waitFor(() => {
      expect(screen.getByText(/Welcome to Cased CD/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should allow skipping the modal', async () => {
    localStorage.setItem('argocd_token', 'test-token')

    render(<WelcomeModal />)

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText(/Welcome to Cased CD/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    const skipButton = screen.getByRole('button', { name: /skip/i })
    await userEvent.click(skipButton)

    expect(localStorage.getItem('cased_cd_welcome_shown')).toBe('skipped')
    expect(screen.queryByText(/Welcome to Cased CD/i)).not.toBeInTheDocument()
  })

  it('should submit form data successfully', async () => {
    localStorage.setItem('argocd_token', 'test-token')

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    })
    global.fetch = mockFetch

    render(<WelcomeModal />)

    await waitFor(() => {
      expect(screen.getByText(/Welcome to Cased CD/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    // Fill in form
    const nameInput = screen.getByLabelText(/name or organization/i)
    const emailInput = screen.getByLabelText(/email/i)

    await userEvent.type(nameInput, 'Test User')
    await userEvent.type(emailInput, 'test@example.com')

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cased.com/api/v1/community/welcome',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Community-Token': 'ccd_community_v1_public_k7m2x9p4n8',
          },
          body: JSON.stringify({
            name: 'Test User',
            email: 'test@example.com',
          }),
        })
      )
      expect(localStorage.getItem('cased_cd_welcome_shown')).toBe('submitted')
    })
  })

  it('should handle submission errors gracefully', async () => {
    localStorage.setItem('argocd_token', 'test-token')

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    global.fetch = mockFetch
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<WelcomeModal />)

    await waitFor(() => {
      expect(screen.getByText(/Welcome to Cased CD/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    const submitButton = screen.getByRole('button', { name: /submit/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(localStorage.getItem('cased_cd_welcome_shown')).toBe('error')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to submit welcome data:',
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })

  // Note: Skipping select test due to JSDOM limitations with Radix UI Select
  // The select component uses hasPointerCapture which is not available in JSDOM
  it.skip('should allow selecting use case', async () => {
    // Test skipped - Radix UI Select requires DOM APIs not available in JSDOM
  })

  it('should disable inputs while submitting', async () => {
    localStorage.setItem('argocd_token', 'test-token')

    // Mock a slow response
    const mockFetch = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ status: 'ok' }),
      }), 100))
    )
    global.fetch = mockFetch

    render(<WelcomeModal />)

    await waitFor(() => {
      expect(screen.getByText(/Welcome to Cased CD/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    const submitButton = screen.getByRole('button', { name: /submit/i })
    await userEvent.click(submitButton)

    // Check that button shows "Submitting..." and is disabled
    expect(screen.getByText(/submitting/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    // Wait for submission to complete
    await waitFor(() => {
      expect(localStorage.getItem('cased_cd_welcome_shown')).toBe('submitted')
    })
  })
})
