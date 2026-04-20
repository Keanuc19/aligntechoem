import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NewReportPage from './NewReportPage.jsx'

// ─── Mock react-router-dom navigate ───────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// ─── Mock supabase ────────────────────────────────────────────────

const mockInsert = vi.fn(() => ({
  select: vi.fn(() => ({
    single: vi.fn(() => ({ data: { id: 'new-id-123' }, error: null })),
  })),
}))

const mockSpecQuery = vi.fn(() => ({
  eq: vi.fn(function () { return this }),
  limit: vi.fn(() => ({ data: [], error: null })),
}))

vi.mock('../supabase.js', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === 'alignment_specs') {
        return { select: mockSpecQuery }
      }
      return { insert: mockInsert }
    }),
  },
}))

// ─── Mock VehicleDiagram (heavy SVG component) ───────────────────

vi.mock('../components/VehicleDiagram.jsx', () => ({
  default: ({ title, readings, onChange }) => (
    <div data-testid="vehicle-diagram">
      <div>{title}</div>
      <button onClick={() => onChange({ ...readings, front_left: { camber: '0.50', toe: '0.10' } })}>
        Mock Fill Readings
      </button>
    </div>
  ),
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
  store = { technicianName: 'Mike' }
  vi.clearAllMocks()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <NewReportPage />
    </MemoryRouter>
  )
}

// ─── Rendering ────────────────────────────────────────────────────

describe('NewReportPage', () => {
  it('renders the page header', () => {
    renderPage()
    expect(screen.getByText('New Alignment Report')).toBeInTheDocument()
    expect(screen.getByText('Technician: Mike')).toBeInTheDocument()
  })

  it('renders all 5 step labels', () => {
    renderPage()
    expect(screen.getByText('Customer Info')).toBeInTheDocument()
    expect(screen.getByText('Vehicle Info')).toBeInTheDocument()
    expect(screen.getByText('Before Readings')).toBeInTheDocument()
    expect(screen.getByText('After Readings')).toBeInTheDocument()
    expect(screen.getByText('Review & Save')).toBeInTheDocument()
  })

  it('starts on step 1 (Customer Info)', () => {
    renderPage()
    expect(screen.getByText('Customer Information')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument()
  })

  it('renders customer form fields', () => {
    renderPage()
    expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('(555) 123-4567')).toBeInTheDocument()
  })

  it('shows Cancel button on first step', () => {
    renderPage()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })
})

// ─── Step navigation & validation ─────────────────────────────────

describe('NewReportPage step navigation', () => {
  it('Next button is disabled when customer name is empty', () => {
    renderPage()
    const nextBtn = screen.getByText('Next →')
    // The button should have not-allowed cursor / disabled styling
    expect(nextBtn.style.cursor).toBe('not-allowed')
  })

  it('Next button enables when customer name is entered', () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'John Smith' } })
    const nextBtn = screen.getByText('Next →')
    expect(nextBtn.style.cursor).toBe('pointer')
  })

  it('advances to step 2 (Vehicle Info) when Next is clicked', () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'John' } })
    fireEvent.click(screen.getByText('Next →'))
    expect(screen.getByText('Vehicle Information')).toBeInTheDocument()
  })

  it('shows Back button on step 2', () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'John' } })
    fireEvent.click(screen.getByText('Next →'))
    expect(screen.getByText('← Back')).toBeInTheDocument()
  })

  it('goes back to step 1 when Back is clicked on step 2', () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'John' } })
    fireEvent.click(screen.getByText('Next →'))
    expect(screen.getByText('Vehicle Information')).toBeInTheDocument()

    fireEvent.click(screen.getByText('← Back'))
    expect(screen.getByText('Customer Information')).toBeInTheDocument()
  })

  it('step 2 requires make, model, and year to advance', () => {
    renderPage()
    // Fill step 1
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'John' } })
    fireEvent.click(screen.getByText('Next →'))

    // On step 2, Next should be disabled
    const nextBtn = screen.getByText('Next →')
    expect(nextBtn.style.cursor).toBe('not-allowed')
  })

  it('renders vehicle dropdown selectors on step 2', () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'John' } })
    fireEvent.click(screen.getByText('Next →'))

    // Should show Year, Make, Model, Trim selects
    expect(screen.getByText('Select Year')).toBeInTheDocument()
  })

  it('shows OEM spec status message on step 2', () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'John' } })
    fireEvent.click(screen.getByText('Next →'))

    expect(screen.getByText('Select a vehicle to look up OEM alignment specs')).toBeInTheDocument()
  })
})

// ─── Vehicle cascading dropdowns ──────────────────────────────────

describe('NewReportPage vehicle selection', () => {
  function goToStep2() {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'John' } })
    fireEvent.click(screen.getByText('Next →'))
  }

  it('populates year dropdown from vehicle data', () => {
    goToStep2()
    // The vehicle-data.json has years — at minimum 2025 and 2026 for Acura ADX
    const yearSelect = screen.getAllByRole('combobox')[0] // first select = year
    const options = Array.from(yearSelect.querySelectorAll('option'))
    // Should have "Select Year" + actual years
    expect(options.length).toBeGreaterThan(1)
    // Years should be sorted descending (newest first)
    const yearValues = options.slice(1).map(o => o.value)
    expect(Number(yearValues[0])).toBeGreaterThanOrEqual(Number(yearValues[yearValues.length - 1]))
  })

  it('make dropdown is disabled until year is selected', () => {
    goToStep2()
    const selects = screen.getAllByRole('combobox')
    const makeSelect = selects[1]
    expect(makeSelect).toBeDisabled()
  })

  it('enables make dropdown after year is selected', () => {
    goToStep2()
    const selects = screen.getAllByRole('combobox')
    const yearSelect = selects[0]

    // Select a year
    fireEvent.change(yearSelect, { target: { value: '2025' } })

    // Make should now be enabled
    const makeSelect = screen.getAllByRole('combobox')[1]
    expect(makeSelect).not.toBeDisabled()
  })

  it('shows makes available for the selected year', () => {
    goToStep2()
    const yearSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(yearSelect, { target: { value: '2025' } })

    const makeSelect = screen.getAllByRole('combobox')[1]
    const options = Array.from(makeSelect.querySelectorAll('option'))
    // Should have "Select Make" + actual makes
    expect(options.length).toBeGreaterThan(1)
    // Acura has 2025 models
    expect(options.some(o => o.value === 'Acura')).toBe(true)
  })

  it('resets model when year changes', () => {
    goToStep2()
    const yearSelect = screen.getAllByRole('combobox')[0]

    // Select year and make
    fireEvent.change(yearSelect, { target: { value: '2025' } })
    const makeSelect = screen.getAllByRole('combobox')[1]
    fireEvent.change(makeSelect, { target: { value: 'Acura' } })

    // Model should be enabled
    const modelSelect = screen.getAllByRole('combobox')[2]
    expect(modelSelect).not.toBeDisabled()

    // Change year — model should reset
    fireEvent.change(yearSelect, { target: { value: '2026' } })
    const newModelSelect = screen.getAllByRole('combobox')[2]
    expect(newModelSelect.value).toBe('')
  })
})

// ─── Full wizard flow ─────────────────────────────────────────────

describe('NewReportPage full wizard', () => {
  it('can navigate through all 5 steps', () => {
    renderPage()

    // Step 1: Customer
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'John Smith' } })
    fireEvent.click(screen.getByText('Next →'))
    expect(screen.getByText('Vehicle Information')).toBeInTheDocument()

    // Step 2: Vehicle — select year, make, model to enable Next
    const yearSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(yearSelect, { target: { value: '2025' } })
    const makeSelect = screen.getAllByRole('combobox')[1]
    fireEvent.change(makeSelect, { target: { value: 'Acura' } })
    const modelSelect = screen.getAllByRole('combobox')[2]
    const modelOptions = Array.from(modelSelect.querySelectorAll('option')).filter(o => o.value)
    if (modelOptions.length > 0) {
      fireEvent.change(modelSelect, { target: { value: modelOptions[0].value } })
    }

    fireEvent.click(screen.getByText('Next →'))

    // Step 3: Before Readings (mocked VehicleDiagram)
    expect(screen.getByText('Initial Alignment Readings')).toBeInTheDocument()
    expect(screen.getByTestId('vehicle-diagram')).toBeInTheDocument()

    fireEvent.click(screen.getByText(/Proceed to Final Readings/))

    // Step 4: After Readings
    expect(screen.getByText('Final Alignment Readings')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Next →'))

    // Step 5: Review & Save — heading + step bar both show the text
    expect(screen.getAllByText('Review & Save').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Save Report')).toBeInTheDocument()
  })

  it('step 3 shows "Proceed to Final Readings" button', () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'John' } })
    fireEvent.click(screen.getByText('Next →'))

    // Quick-fill vehicle
    const yearSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(yearSelect, { target: { value: '2025' } })
    const makeSelect = screen.getAllByRole('combobox')[1]
    fireEvent.change(makeSelect, { target: { value: 'Acura' } })
    const modelSelect = screen.getAllByRole('combobox')[2]
    const modelOptions = Array.from(modelSelect.querySelectorAll('option')).filter(o => o.value)
    if (modelOptions.length > 0) {
      fireEvent.change(modelSelect, { target: { value: modelOptions[0].value } })
    }
    fireEvent.click(screen.getByText('Next →'))

    expect(screen.getByText(/Proceed to Final Readings/)).toBeInTheDocument()
  })

  it('can go back through all steps', () => {
    renderPage()
    // Go to step 2
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'John' } })
    fireEvent.click(screen.getByText('Next →'))

    // Fill vehicle and go to step 3
    const yearSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(yearSelect, { target: { value: '2025' } })
    const makeSelect = screen.getAllByRole('combobox')[1]
    fireEvent.change(makeSelect, { target: { value: 'Acura' } })
    const modelSelect = screen.getAllByRole('combobox')[2]
    const modelOptions = Array.from(modelSelect.querySelectorAll('option')).filter(o => o.value)
    if (modelOptions.length > 0) {
      fireEvent.change(modelSelect, { target: { value: modelOptions[0].value } })
    }
    fireEvent.click(screen.getByText('Next →'))

    // Go back to step 2
    fireEvent.click(screen.getByText('← Back'))
    expect(screen.getByText('Vehicle Information')).toBeInTheDocument()

    // Go back to step 1
    fireEvent.click(screen.getByText('← Back'))
    expect(screen.getByText('Customer Information')).toBeInTheDocument()
  })
})
