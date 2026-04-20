import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ReportsPage from './ReportsPage.jsx'

// ─── Mock supabase ────────────────────────────────────────────────

const mockReports = [
  {
    id: '1',
    created_at: '2026-04-15T10:00:00Z',
    updated_at: '2026-04-15T10:30:00Z',
    status: 'completed',
    technician_name: 'Mike',
    notes: '',
    vehicles: { year: '2024', make: 'Toyota', model: 'Camry', trim: 'SE', vin: '1HGBH41JXMN109186', license_plate: 'ABC123' },
    customers: { name: 'John Smith', email: 'john@example.com', phone: '555-1234' },
  },
  {
    id: '2',
    created_at: '2026-04-14T09:00:00Z',
    updated_at: '2026-04-14T09:30:00Z',
    status: 'in_progress',
    technician_name: 'Sarah',
    notes: '',
    vehicles: { year: '2023', make: 'Honda', model: 'Civic', trim: 'LX', vin: '2HGFB2F59CH308765', license_plate: 'XYZ789' },
    customers: { name: 'Jane Doe', email: 'jane@example.com', phone: '555-5678' },
  },
  {
    id: '3',
    created_at: '2026-04-13T08:00:00Z',
    updated_at: '2026-04-13T08:30:00Z',
    status: 'completed',
    technician_name: 'Mike',
    notes: '',
    vehicles: { year: '2022', make: 'BMW', model: 'X3', trim: '', vin: '', license_plate: '' },
    customers: { name: 'Bob Wilson', email: '', phone: '' },
  },
]

const mockSelect = vi.fn()
const mockOrder = vi.fn()

vi.mock('../supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: mockReports,
          error: null,
        })),
      })),
    })),
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
  store = {}
  vi.clearAllMocks()
})

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <ReportsPage />
    </MemoryRouter>
  )
}

// ─── Tests ────────────────────────────────────────────────────────

describe('ReportsPage', () => {
  it('renders page title', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('All Reports')).toBeInTheDocument()
    })
  })

  it('shows total report count', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('3 total reports')).toBeInTheDocument()
    })
  })

  it('renders all reports from the database', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
      expect(screen.getByText('2023 Honda Civic')).toBeInTheDocument()
      expect(screen.getByText('2022 BMW X3')).toBeInTheDocument()
    })
  })

  it('shows customer names and technician names', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText(/John Smith/)).toBeInTheDocument()
      expect(screen.getByText(/Jane Doe/)).toBeInTheDocument()
      expect(screen.getByText(/Bob Wilson/)).toBeInTheDocument()
    })
  })

  it('shows status badges (Done vs Active)', async () => {
    renderWithRouter()
    await waitFor(() => {
      const doneBadges = screen.getAllByText('Done')
      const activeBadges = screen.getAllByText('Active')
      expect(doneBadges.length).toBe(2)   // 2 completed
      expect(activeBadges.length).toBe(1)  // 1 in_progress
    })
  })

  it('renders filter buttons (All, Completed, In Progress)', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })
  })

  it('renders search input', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
    })
  })

  it('report links point to individual report pages', async () => {
    renderWithRouter()
    await waitFor(() => {
      const link = screen.getByText('2024 Toyota Camry').closest('a')
      expect(link.getAttribute('href')).toBe('/reports/1')
    })
  })
})

// ─── Filtering ────────────────────────────────────────────────────

describe('ReportsPage filtering', () => {
  it('filters to completed reports only', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Completed'))

    expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()   // completed
    expect(screen.getByText('2022 BMW X3')).toBeInTheDocument()          // completed
    expect(screen.queryByText('2023 Honda Civic')).not.toBeInTheDocument() // in_progress
  })

  it('filters to in-progress reports only', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('2023 Honda Civic')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('In Progress'))

    expect(screen.getByText('2023 Honda Civic')).toBeInTheDocument()       // in_progress
    expect(screen.queryByText('2024 Toyota Camry')).not.toBeInTheDocument() // completed
    expect(screen.queryByText('2022 BMW X3')).not.toBeInTheDocument()       // completed
  })

  it('shows all reports when All filter is clicked', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
    })

    // Filter to completed first
    fireEvent.click(screen.getByText('Completed'))
    expect(screen.queryByText('2023 Honda Civic')).not.toBeInTheDocument()

    // Then back to all
    fireEvent.click(screen.getByText('All'))
    expect(screen.getByText('2023 Honda Civic')).toBeInTheDocument()
    expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
  })
})

// ─── Search ───────────────────────────────────────────────────────

describe('ReportsPage search', () => {
  it('filters by customer name', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'John' } })

    expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
    expect(screen.queryByText('2023 Honda Civic')).not.toBeInTheDocument()
    expect(screen.queryByText('2022 BMW X3')).not.toBeInTheDocument()
  })

  it('filters by vehicle make', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'Honda' } })

    expect(screen.getByText('2023 Honda Civic')).toBeInTheDocument()
    expect(screen.queryByText('2024 Toyota Camry')).not.toBeInTheDocument()
  })

  it('filters by technician name', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'Sarah' } })

    expect(screen.getByText('2023 Honda Civic')).toBeInTheDocument()
    expect(screen.queryByText('2024 Toyota Camry')).not.toBeInTheDocument()
  })

  it('search is case-insensitive', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'bmw' } })

    expect(screen.getByText('2022 BMW X3')).toBeInTheDocument()
  })

  it('shows no results message when search has no matches', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'NONEXISTENT' } })

    expect(screen.getByText('No reports match your search.')).toBeInTheDocument()
  })

  it('search and filter work together', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
    })

    // Search for Mike (technician of reports 1 and 3)
    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'Mike' } })

    // Both Mike's reports should show
    expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
    expect(screen.getByText('2022 BMW X3')).toBeInTheDocument()

    // Filter to completed — both of Mike's are completed, so both still show
    fireEvent.click(screen.getByText('Completed'))
    expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
    expect(screen.getByText('2022 BMW X3')).toBeInTheDocument()
  })

  it('filters by VIN', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: '1HGBH41' } })

    expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
    expect(screen.queryByText('2023 Honda Civic')).not.toBeInTheDocument()
  })

  it('filters by license plate', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'XYZ789' } })

    expect(screen.getByText('2023 Honda Civic')).toBeInTheDocument()
    expect(screen.queryByText('2024 Toyota Camry')).not.toBeInTheDocument()
  })
})
