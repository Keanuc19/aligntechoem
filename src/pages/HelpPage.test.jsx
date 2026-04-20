import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import HelpPage from './HelpPage.jsx'

// ─── Mock supabase ────────────────────────────────────────────────

const mockInsert = vi.fn(() => ({ data: null, error: null }))

vi.mock('../supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  },
}))

// ─── Mock window.open (used for mailto) ───────────────────────────

const mockWindowOpen = vi.fn()
vi.stubGlobal('open', mockWindowOpen)

// ─── localStorage mock ────────────────────────────────────────────

let store = {}
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, value) => { store[key] = String(value) }),
  removeItem: vi.fn((key) => { delete store[key] }),
  clear: vi.fn(() => { store = {} }),
  get length() { return Object.keys(store).length },
  key: vi.fn((i) => Object.keys(store)[i] ?? null),
})

afterEach(() => cleanup())

beforeEach(() => {
  store = { technicianName: 'Mike' }
  vi.clearAllMocks()
})

// ─── Rendering ────────────────────────────────────────────────────

describe('HelpPage', () => {
  it('renders page header', () => {
    render(<HelpPage />)
    expect(screen.getByText('Help & Support')).toBeInTheDocument()
  })

  it('renders all 10 training modules', () => {
    render(<HelpPage />)
    expect(screen.getByText('Introduction to Wheel Alignment')).toBeInTheDocument()
    expect(screen.getByText('Understanding Camber')).toBeInTheDocument()
    expect(screen.getByText('Understanding Caster')).toBeInTheDocument()
    expect(screen.getByText('Understanding Toe')).toBeInTheDocument()
    expect(screen.getByText('Reading OEM Specifications')).toBeInTheDocument()
    expect(screen.getByText('Using the Aligntech Unit')).toBeInTheDocument()
    expect(screen.getByText('Calibration Procedures')).toBeInTheDocument()
    expect(screen.getByText('Field Diagnostic Workflow')).toBeInTheDocument()
    expect(screen.getByText('Interpreting Reports')).toBeInTheDocument()
    expect(screen.getByText('Advanced Troubleshooting')).toBeInTheDocument()
  })

  it('renders video training playlists section', () => {
    render(<HelpPage />)
    expect(screen.getByText('Video Training Playlists')).toBeInTheDocument()
    expect(screen.getByText('Getting Started')).toBeInTheDocument()
    expect(screen.getByText('Calibration Guide')).toBeInTheDocument()
    expect(screen.getByText('Advanced Diagnostics')).toBeInTheDocument()
    expect(screen.getByText('Report Interpretation')).toBeInTheDocument()
  })

  it('renders contact information', () => {
    render(<HelpPage />)
    expect(screen.getByText('Contact Us')).toBeInTheDocument()
    expect(screen.getByText('support@aligntechusa.com')).toBeInTheDocument()
    expect(screen.getByText('1-800-555-1234')).toBeInTheDocument()
  })

  it('renders support hours', () => {
    render(<HelpPage />)
    expect(screen.getByText(/Monday - Friday, 8:00 AM - 5:00 PM EST/)).toBeInTheDocument()
  })
})

// ─── Support Ticket Form ──────────────────────────────────────────

describe('HelpPage support ticket form', () => {
  it('renders the support ticket form', () => {
    render(<HelpPage />)
    expect(screen.getByText('Submit a Support Ticket')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('John Smith')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Brief description of your issue')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Describe your issue in detail...')).toBeInTheDocument()
  })

  it('pre-fills the name from localStorage', () => {
    render(<HelpPage />)
    const nameInput = screen.getByPlaceholderText('John Smith')
    expect(nameInput.value).toBe('Mike')
  })

  it('shows submit button', () => {
    render(<HelpPage />)
    expect(screen.getByText('Submit Ticket')).toBeInTheDocument()
  })

  it('submits ticket to Supabase and opens mailto', async () => {
    render(<HelpPage />)

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('john@example.com'), { target: { value: 'mike@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Brief description of your issue'), { target: { value: 'Sensor not calibrating' } })
    fireEvent.change(screen.getByPlaceholderText('Describe your issue in detail...'), { target: { value: 'The left sensor fails to zero after step 3.' } })

    // Submit
    const form = screen.getByPlaceholderText('john@example.com').closest('form')
    fireEvent.submit(form)

    await waitFor(() => {
      // Should insert into Supabase
      expect(mockInsert).toHaveBeenCalledWith({
        name: 'Mike',
        email: 'mike@test.com',
        subject: 'Sensor not calibrating',
        message: 'The left sensor fails to zero after step 3.',
        status: 'open',
      })
    })

    // Should open mailto link
    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalled()
      const mailtoUrl = mockWindowOpen.mock.calls[0][0]
      expect(mailtoUrl).toContain('mailto:support@aligntechusa.com')
      expect(mailtoUrl).toContain('Sensor%20not%20calibrating')
    })
  })

  it('shows success message after submission', async () => {
    render(<HelpPage />)

    fireEvent.change(screen.getByPlaceholderText('john@example.com'), { target: { value: 'mike@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Brief description of your issue'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByPlaceholderText('Describe your issue in detail...'), { target: { value: 'Test message' } })

    const form = screen.getByPlaceholderText('john@example.com').closest('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Ticket Submitted')).toBeInTheDocument()
      expect(screen.getByText('Submit Another')).toBeInTheDocument()
    })
  })

  it('allows submitting another ticket after success', async () => {
    render(<HelpPage />)

    fireEvent.change(screen.getByPlaceholderText('john@example.com'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Brief description of your issue'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByPlaceholderText('Describe your issue in detail...'), { target: { value: 'Test' } })

    const form = screen.getByPlaceholderText('john@example.com').closest('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Submit Another')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Submit Another'))

    // Form should reappear
    expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Submit Ticket')).toBeInTheDocument()
  })

  it('still opens mailto even if Supabase insert fails', async () => {
    mockInsert.mockImplementationOnce(() => { throw new Error('DB error') })

    render(<HelpPage />)

    fireEvent.change(screen.getByPlaceholderText('john@example.com'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Brief description of your issue'), { target: { value: 'Urgent' } })
    fireEvent.change(screen.getByPlaceholderText('Describe your issue in detail...'), { target: { value: 'Help' } })

    const form = screen.getByPlaceholderText('john@example.com').closest('form')
    fireEvent.submit(form)

    // Even with DB failure, mailto should still fire
    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalled()
    })
  })
})
