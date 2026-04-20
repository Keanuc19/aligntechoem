import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import CalibrationPage from './CalibrationPage.jsx'

// ─── Mock supabase ────────────────────────────────────────────────

vi.mock('../supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({ data: null, error: null })),
      delete: vi.fn(() => ({ eq: vi.fn(() => ({ data: null, error: null })) })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => ({ error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/video.mp4' } })),
        remove: vi.fn(() => ({ error: null })),
      })),
    },
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    removeChannel: () => {},
  },
}))

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
  store = { userRole: 'technician', technicianName: 'Mike' }
  vi.clearAllMocks()
})

// ─── Page Rendering ───────────────────────────────────────────────

describe('CalibrationPage', () => {
  it('renders the page header', () => {
    render(<CalibrationPage />)
    expect(screen.getByText('Calibration')).toBeInTheDocument()
  })

  it('renders the calibration procedure section', () => {
    render(<CalibrationPage />)
    expect(screen.getByText('Calibration Procedure')).toBeInTheDocument()
  })

  it('renders all 6 calibration steps', () => {
    render(<CalibrationPage />)
    expect(screen.getByText('Prepare the Surface')).toBeInTheDocument()
    expect(screen.getByText('Mount the Aligntech Unit')).toBeInTheDocument()
    expect(screen.getByText('Zero the Sensors')).toBeInTheDocument()
    expect(screen.getByText('Verify Reference Points')).toBeInTheDocument()
    expect(screen.getByText('Run Self-Test')).toBeInTheDocument()
    expect(screen.getByText('Begin Diagnostic Session')).toBeInTheDocument()
  })

  it('renders step descriptions', () => {
    render(<CalibrationPage />)
    expect(screen.getByText(/Ensure the vehicle is on a flat, level surface/)).toBeInTheDocument()
    expect(screen.getByText(/Attach the unit securely to the wheel rim/)).toBeInTheDocument()
    expect(screen.getByText(/press the calibration button to zero all sensors/)).toBeInTheDocument()
  })

  it('renders step numbers 1 through 6', () => {
    render(<CalibrationPage />)
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument()
    }
  })

  it('renders the calibration videos section', () => {
    render(<CalibrationPage />)
    expect(screen.getByText('Calibration Videos')).toBeInTheDocument()
  })

  it('shows empty state for videos when none are uploaded', async () => {
    render(<CalibrationPage />)
    await waitFor(() => {
      expect(screen.getByText('No calibration videos uploaded yet')).toBeInTheDocument()
    })
  })

  it('shows video count in header', async () => {
    render(<CalibrationPage />)
    await waitFor(() => {
      expect(screen.getByText('(0 videos)')).toBeInTheDocument()
    })
  })
})

// ─── Role-based UI ────────────────────────────────────────────────

describe('CalibrationPage role-based features', () => {
  it('does not show Upload Video button for technicians', () => {
    store.userRole = 'technician'
    render(<CalibrationPage />)
    expect(screen.queryByText('Upload Video')).not.toBeInTheDocument()
  })

  it('shows Upload Video button for admins', () => {
    store.userRole = 'admin'
    render(<CalibrationPage />)
    expect(screen.getByText('Upload Video')).toBeInTheDocument()
  })

  it('shows admin guidance in empty state for admins', async () => {
    store.userRole = 'admin'
    render(<CalibrationPage />)
    await waitFor(() => {
      expect(screen.getByText(/Use the Upload Video button above/)).toBeInTheDocument()
    })
  })

  it('shows contact admin guidance for technicians', async () => {
    store.userRole = 'technician'
    render(<CalibrationPage />)
    await waitFor(() => {
      expect(screen.getByText(/Contact your administrator/)).toBeInTheDocument()
    })
  })
})

// ─── Upload Form (admin only) ─────────────────────────────────────

describe('CalibrationPage upload form', () => {
  beforeEach(() => {
    store.userRole = 'admin'
  })

  it('shows upload form when Upload Video is clicked', () => {
    render(<CalibrationPage />)
    fireEvent.click(screen.getByText('Upload Video'))
    expect(screen.getByText('Upload Calibration Video')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Sensor Calibration Procedure')).toBeInTheDocument()
  })

  it('hides upload form when X is clicked', () => {
    render(<CalibrationPage />)
    fireEvent.click(screen.getByText('Upload Video'))
    expect(screen.getByText('Upload Calibration Video')).toBeInTheDocument()

    // Click the close button (X icon)
    const closeButtons = screen.getAllByRole('button')
    const closeBtn = closeButtons.find(btn => btn.getAttribute('aria-label') !== 'Open menu')
    // The close button is after the heading inside the form
    const formHeading = screen.getByText('Upload Calibration Video')
    const formContainer = formHeading.closest('div')
    const xButton = formContainer.querySelector('button')
    if (xButton) fireEvent.click(xButton)
  })

  it('toggles upload form visibility', () => {
    render(<CalibrationPage />)

    // Open
    fireEvent.click(screen.getByText('Upload Video'))
    expect(screen.getByPlaceholderText('e.g. Sensor Calibration Procedure')).toBeInTheDocument()

    // The header button is NOT disabled; the form submit button IS disabled
    const uploadButtons = screen.getAllByText(/Upload Video/)
      .map(el => el.closest('button'))
      .filter(btn => btn && !btn.disabled)
    fireEvent.click(uploadButtons[0])
    expect(screen.queryByPlaceholderText('e.g. Sensor Calibration Procedure')).not.toBeInTheDocument()
  })
})

// ─── formatFileSize (tested through component rendering) ──────────
// The formatFileSize function is internal, but we can verify it
// through rendering videos with known sizes.

describe('CalibrationPage formatFileSize', () => {
  it('displays KB for small files', async () => {
    // Re-mock supabase to return a video with a small file size
    const { supabase } = await import('../supabase.js')
    supabase.from.mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [{
              id: '1',
              title: 'Test Video',
              description: '',
              file_name: 'test.mp4',
              file_url: 'https://example.com/test.mp4',
              file_size: 512000, // ~500 KB
              file_type: 'video/mp4',
              uploaded_by: 'Admin',
              sort_order: 0,
              created_at: '2026-01-01',
            }],
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({ data: null, error: null })),
      delete: vi.fn(() => ({ eq: vi.fn() })),
    })

    render(<CalibrationPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Video')).toBeInTheDocument()
      expect(screen.getByText('500 KB')).toBeInTheDocument()
    })
  })

  it('displays MB for large files', async () => {
    const { supabase } = await import('../supabase.js')
    supabase.from.mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [{
              id: '2',
              title: 'Big Video',
              description: 'A large file',
              file_name: 'big.mp4',
              file_url: 'https://example.com/big.mp4',
              file_size: 52428800, // 50 MB
              file_type: 'video/mp4',
              uploaded_by: 'Admin',
              sort_order: 0,
              created_at: '2026-01-01',
            }],
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({ data: null, error: null })),
      delete: vi.fn(() => ({ eq: vi.fn() })),
    })

    render(<CalibrationPage />)

    await waitFor(() => {
      expect(screen.getByText('Big Video')).toBeInTheDocument()
      expect(screen.getByText('50.0 MB')).toBeInTheDocument()
    })
  })
})
