import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import LoginPage from './LoginPage.jsx'

// ─── Mock react-router-dom ────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// ─── localStorage mock ────────────────────────────────────────────

let store = {}
const storageMock = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, value) => { store[key] = String(value) }),
  removeItem: vi.fn((key) => { delete store[key] }),
  clear: vi.fn(() => { store = {} }),
  get length() { return Object.keys(store).length },
  key: vi.fn((i) => Object.keys(store)[i] ?? null),
}

vi.stubGlobal('localStorage', storageMock)

afterEach(() => cleanup())

beforeEach(() => {
  store = {}
  vi.clearAllMocks()
})

// ─── Tests ────────────────────────────────────────────────────────

describe('LoginPage', () => {
  it('renders the sign-in form', () => {
    render(<LoginPage />)
    expect(screen.getByText('AlignSpec')).toBeInTheDocument()
    expect(screen.getByText('Sign in to continue')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
  })

  it('renders all three role options', () => {
    render(<LoginPage />)
    expect(screen.getAllByText('Technician').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Manager').length).toBeGreaterThanOrEqual(1)
  })

  it('renders role descriptions', () => {
    render(<LoginPage />)
    expect(screen.getAllByText('Create and view alignment reports').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Full access to all features').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('View reports and manage specs').length).toBeGreaterThanOrEqual(1)
  })

  it('disables submit button when name is empty', () => {
    render(<LoginPage />)
    const submitBtn = screen.getByRole('button', { name: 'Sign In' })
    expect(submitBtn).toBeDisabled()
  })

  it('enables submit button when name is entered', () => {
    render(<LoginPage />)
    const input = screen.getByPlaceholderText('Enter your name')
    fireEvent.change(input, { target: { value: 'John' } })
    const submitBtn = screen.getByRole('button', { name: 'Sign In' })
    expect(submitBtn).not.toBeDisabled()
  })

  it('does not submit when name is only whitespace', () => {
    render(<LoginPage />)
    const input = screen.getByPlaceholderText('Enter your name')
    fireEvent.change(input, { target: { value: '   ' } })
    const submitBtn = screen.getByRole('button', { name: 'Sign In' })
    expect(submitBtn).toBeDisabled()
  })

  it('saves name to localStorage on submit', () => {
    render(<LoginPage />)
    const input = screen.getByPlaceholderText('Enter your name')
    fireEvent.change(input, { target: { value: 'Mike' } })

    const form = input.closest('form')
    fireEvent.submit(form)

    expect(storageMock.setItem).toHaveBeenCalledWith('technicianName', 'Mike')
  })

  it('saves selected role to localStorage on submit', () => {
    render(<LoginPage />)
    const input = screen.getByPlaceholderText('Enter your name')
    fireEvent.change(input, { target: { value: 'Mike' } })

    const form = input.closest('form')
    fireEvent.submit(form)

    expect(storageMock.setItem).toHaveBeenCalledWith('userRole', 'technician')
  })

  it('trims whitespace from name before saving', () => {
    render(<LoginPage />)
    const input = screen.getByPlaceholderText('Enter your name')
    fireEvent.change(input, { target: { value: '  Sarah  ' } })

    const form = input.closest('form')
    fireEvent.submit(form)

    expect(storageMock.setItem).toHaveBeenCalledWith('technicianName', 'Sarah')
  })

  it('navigates to home after submit', () => {
    render(<LoginPage />)
    const input = screen.getByPlaceholderText('Enter your name')
    fireEvent.change(input, { target: { value: 'Mike' } })

    const form = input.closest('form')
    fireEvent.submit(form)

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('does not navigate when name is empty', () => {
    render(<LoginPage />)
    const input = screen.getByPlaceholderText('Enter your name')
    const form = input.closest('form')
    fireEvent.submit(form)

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('allows selecting admin role before submit', () => {
    render(<LoginPage />)
    const input = screen.getByPlaceholderText('Enter your name')
    fireEvent.change(input, { target: { value: 'Admin User' } })

    const adminDesc = screen.getAllByText('Full access to all features')[0]
    const adminBtn = adminDesc.closest('button')
    fireEvent.click(adminBtn)

    const form = input.closest('form')
    fireEvent.submit(form)

    expect(storageMock.setItem).toHaveBeenCalledWith('userRole', 'admin')
  })

  it('allows selecting manager role before submit', () => {
    render(<LoginPage />)
    const input = screen.getByPlaceholderText('Enter your name')
    fireEvent.change(input, { target: { value: 'Boss' } })

    const managerDesc = screen.getAllByText('View reports and manage specs')[0]
    const managerBtn = managerDesc.closest('button')
    fireEvent.click(managerBtn)

    const form = input.closest('form')
    fireEvent.submit(form)

    expect(storageMock.setItem).toHaveBeenCalledWith('userRole', 'manager')
  })

  it('has a link to the Spec Database', () => {
    render(<LoginPage />)
    const link = screen.getByText('Go to Spec Database →')
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toBe('/specs')
  })
})
