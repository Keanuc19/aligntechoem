import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import VehicleDiagram from './VehicleDiagram.jsx'
import { emptyReadings } from '../utils/alignment.js'

// ─── Shared fixtures ──────────────────────────────────────────────

const spec = (min, max, preferred = '') => ({ min: String(min), max: String(max), preferred: String(preferred) })

const oemSpec = {
  front: {
    camber: spec(-0.75, 0.25, -0.25),
    individualToe: spec(-0.1, 0.1, 0.0),
    caster: spec(3.0, 5.0, 4.0),
    totalToe: spec(-0.2, 0.2, 0.0),
  },
  rear: {
    camber: spec(-1.0, 0.0, -0.5),
    individualToe: spec(0.0, 0.2, 0.1),
  },
  thrustAngle: spec(-0.1, 0.1, 0.0),
  steerAheadAngle: spec(-0.5, 0.5, 0.0),
}

// ─── Rendering ────────────────────────────────────────────────────

describe('VehicleDiagram', () => {
  it('renders the title when provided', () => {
    render(
      <VehicleDiagram
        title="Initial Alignment Readings"
        readings={emptyReadings()}
        oemSpec={oemSpec}
        onChange={() => {}}
      />
    )
    expect(screen.getByText('Initial Alignment Readings')).toBeInTheDocument()
  })

  it('renders without a title', () => {
    const { container } = render(
      <VehicleDiagram
        readings={emptyReadings()}
        oemSpec={oemSpec}
        onChange={() => {}}
      />
    )
    expect(container.querySelector('h3')).toBeNull()
  })

  it('renders all three status badges', () => {
    render(
      <VehicleDiagram
        title="Test"
        readings={emptyReadings()}
        oemSpec={oemSpec}
        onChange={() => {}}
      />
    )
    // Component renders badges as: {count} <span>{label}</span>
    // Use getAllByText since desktop + mobile may duplicate
    expect(screen.getAllByText('In Spec').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Minor Adj.').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Critical').length).toBeGreaterThanOrEqual(1)
  })

  it('renders wheel input labels for all four corners', () => {
    render(
      <VehicleDiagram
        readings={emptyReadings()}
        oemSpec={oemSpec}
        onChange={() => {}}
      />
    )
    // Desktop (4 corners) + Mobile (4 corners) = 8 each
    const camberLabels = screen.getAllByText('Camber')
    const toeLabels = screen.getAllByText('Toe')
    expect(camberLabels.length).toBeGreaterThanOrEqual(4)
    expect(toeLabels.length).toBeGreaterThanOrEqual(4)
  })

  it('renders caster and thrust angle cards', () => {
    render(
      <VehicleDiagram
        readings={emptyReadings()}
        oemSpec={oemSpec}
        onChange={() => {}}
      />
    )
    expect(screen.getAllByText('Left Caster').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Right Caster').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Thrust Angle').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Steer Ahead').length).toBeGreaterThanOrEqual(1)
  })

  it('renders OEM reference panel with spec labels', () => {
    render(
      <VehicleDiagram
        readings={emptyReadings()}
        oemSpec={oemSpec}
        onChange={() => {}}
      />
    )
    expect(screen.getAllByText('OEM Reference').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('FL/FR Camber').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('RL/RR Camber').length).toBeGreaterThanOrEqual(1)
  })

  it('renders OEM reference with preferred values as degrees', () => {
    render(
      <VehicleDiagram
        readings={emptyReadings()}
        oemSpec={oemSpec}
        onChange={() => {}}
      />
    )
    expect(screen.getAllByText('-0.25°').length).toBeGreaterThanOrEqual(1) // front camber
    expect(screen.getAllByText('4°').length).toBeGreaterThanOrEqual(1)     // caster
  })

  it('renders color key in OEM reference panel', () => {
    render(
      <VehicleDiagram
        readings={emptyReadings()}
        oemSpec={oemSpec}
        onChange={() => {}}
      />
    )
    expect(screen.getAllByText('Within OEM spec').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Approaching limit').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Out of spec').length).toBeGreaterThanOrEqual(1)
  })

  it('displays existing reading values in inputs', () => {
    const readings = emptyReadings()
    readings.front_left.camber = '-0.50'
    readings.front_left.toe = '0.05'

    render(
      <VehicleDiagram
        readings={readings}
        oemSpec={oemSpec}
        onChange={() => {}}
      />
    )
    const inputs = screen.getAllByDisplayValue('-0.50')
    expect(inputs.length).toBeGreaterThanOrEqual(1)
  })
})

// ─── Interaction ──────────────────────────────────────────────────

describe('VehicleDiagram interactions', () => {
  it('calls onChange when the stepper + button is clicked', () => {
    const onChange = vi.fn()
    const readings = emptyReadings()

    const { container } = render(
      <VehicleDiagram
        readings={readings}
        oemSpec={oemSpec}
        onChange={onChange}
      />
    )

    // Find all buttons and filter to only "+" increment buttons
    const allButtons = container.querySelectorAll('button')
    const plusButton = Array.from(allButtons).find(
      btn => btn.textContent.trim() === '+' && !btn.disabled
    )
    expect(plusButton).toBeTruthy()
    fireEvent.click(plusButton)
    expect(onChange).toHaveBeenCalled()
  })

  it('does not call onChange in readOnly mode when + button is clicked', () => {
    const onChange = vi.fn()
    const readings = emptyReadings()

    render(
      <VehicleDiagram
        readings={readings}
        oemSpec={oemSpec}
        onChange={onChange}
        readOnly={true}
      />
    )

    const plusButtons = screen.getAllByText('+')
    fireEvent.click(plusButtons[0])
    // readOnly mode blocks the step() function
    expect(onChange).not.toHaveBeenCalled()
  })

  it('renders non-zero status counts when readings have values', () => {
    const readings = emptyReadings()
    readings.front_left.camber = '0.00'   // green (within -0.75 to 0.25)
    readings.front_left.toe = '0.00'      // green (within -0.1 to 0.1)
    readings.front_right.camber = '2.00'  // red (well outside spec)

    const { container } = render(
      <VehicleDiagram
        readings={readings}
        oemSpec={oemSpec}
        onChange={() => {}}
      />
    )

    // The badge area should show counts > 0
    // We check the text content of the badge container
    const badgeContainer = container.querySelector('[style*="margin-bottom: 20px"]')
    expect(badgeContainer).toBeTruthy()
    expect(badgeContainer.textContent).toContain('2')  // 2 greens
    expect(badgeContainer.textContent).toContain('1')  // 1 red
  })
})

// ─── Edge cases ───────────────────────────────────────────────────

describe('VehicleDiagram edge cases', () => {
  it('renders without oemSpec (null)', () => {
    render(
      <VehicleDiagram
        readings={emptyReadings()}
        oemSpec={null}
        onChange={() => {}}
      />
    )
    expect(screen.getAllByText('In Spec').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the SVG chassis diagram', () => {
    const { container } = render(
      <VehicleDiagram
        readings={emptyReadings()}
        oemSpec={oemSpec}
        onChange={() => {}}
      />
    )
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('renders with partial readings (some wheels filled, some empty)', () => {
    const readings = emptyReadings()
    readings.front_left.camber = '-0.30'

    render(
      <VehicleDiagram
        readings={readings}
        oemSpec={oemSpec}
        onChange={() => {}}
      />
    )
    expect(screen.getAllByDisplayValue('-0.30').length).toBeGreaterThanOrEqual(1)
  })

  it('renders with no oemSpec — shows dashes for preferred values', () => {
    render(
      <VehicleDiagram
        readings={emptyReadings()}
        oemSpec={null}
        onChange={() => {}}
      />
    )
    // "nom: —" displayed for each angle card when no spec
    const dashes = screen.getAllByText(/nom: —/)
    expect(dashes.length).toBeGreaterThanOrEqual(4) // 4 angle cards
  })
})
