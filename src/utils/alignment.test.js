import { describe, it, expect } from 'vitest'
import {
  getReadingStatus,
  getReadingStyle,
  emptyReadings,
  getSpecForReading,
  getSpecForSummary,
  countStatuses,
  hasAnyReadings,
  statusColors,
} from './alignment.js'

// ─── Shared test fixtures ─────────────────────────────────────────

const spec = (min, max) => ({ min: String(min), max: String(max) })

// Typical OEM camber spec: -0.75° to 0.25° (range = 1.0°, 5% variance = 0.05°)
const camberSpec = spec(-0.75, 0.25)

// Small range spec (< 0.1°) — triggers fixed 0.05° tolerance
const tinySpec = spec(0.0, 0.05)

// Typical OEM spec structure for full vehicle
const oemSpec = {
  front: {
    camber: spec(-0.75, 0.25),
    individualToe: spec(-0.1, 0.1),
    caster: spec(3.0, 5.0),
    totalToe: spec(-0.2, 0.2),
  },
  rear: {
    camber: spec(-1.0, 0.0),
    individualToe: spec(0.0, 0.2),
  },
  thrustAngle: spec(-0.1, 0.1),
  steerAheadAngle: spec(-0.5, 0.5),
}

// ─── getReadingStatus ─────────────────────────────────────────────

describe('getReadingStatus', () => {
  describe('returns neutral for missing/invalid data', () => {
    it('returns neutral when spec is null', () => {
      expect(getReadingStatus(0.5, null)).toBe('neutral')
    })

    it('returns neutral when spec is undefined', () => {
      expect(getReadingStatus(0.5, undefined)).toBe('neutral')
    })

    it('returns neutral when value is empty string', () => {
      expect(getReadingStatus('', camberSpec)).toBe('neutral')
    })

    it('returns neutral when value is null', () => {
      expect(getReadingStatus(null, camberSpec)).toBe('neutral')
    })

    it('returns neutral when value is undefined', () => {
      expect(getReadingStatus(undefined, camberSpec)).toBe('neutral')
    })

    it('returns neutral when value is non-numeric string', () => {
      expect(getReadingStatus('abc', camberSpec)).toBe('neutral')
    })

    it('returns neutral when spec min is non-numeric', () => {
      expect(getReadingStatus(0.5, { min: 'abc', max: '1.0' })).toBe('neutral')
    })

    it('returns neutral when spec max is non-numeric', () => {
      expect(getReadingStatus(0.5, { min: '0.0', max: 'abc' })).toBe('neutral')
    })
  })

  describe('green — value within OEM min/max range', () => {
    it('returns green at exact min boundary', () => {
      expect(getReadingStatus(-0.75, camberSpec)).toBe('green')
    })

    it('returns green at exact max boundary', () => {
      expect(getReadingStatus(0.25, camberSpec)).toBe('green')
    })

    it('returns green for value in the middle of range', () => {
      expect(getReadingStatus(0.0, camberSpec)).toBe('green')
    })

    it('returns green for string numeric value within range', () => {
      expect(getReadingStatus('-0.5', camberSpec)).toBe('green')
    })

    it('returns green for zero value within range', () => {
      expect(getReadingStatus(0, spec(-1, 1))).toBe('green')
    })
  })

  describe('orange — within 5% variance outside range', () => {
    // camberSpec range = 1.0°, 5% variance = 0.05°
    // orange band: [-0.80, -0.75) and (0.25, 0.30]

    it('returns orange just below min (within variance)', () => {
      expect(getReadingStatus(-0.80, camberSpec)).toBe('orange')
    })

    it('returns orange just above max (within variance)', () => {
      expect(getReadingStatus(0.30, camberSpec)).toBe('orange')
    })

    it('returns orange at the outer edge of the variance band below min', () => {
      // min - variance = -0.75 - 0.05 = -0.80 (exactly on boundary → orange)
      expect(getReadingStatus(-0.80, camberSpec)).toBe('orange')
    })

    it('returns orange at the outer edge of the variance band above max', () => {
      // max + variance = 0.25 + 0.05 = 0.30 (exactly on boundary → orange)
      expect(getReadingStatus(0.30, camberSpec)).toBe('orange')
    })
  })

  describe('red — beyond 5% variance', () => {
    it('returns red well below the range', () => {
      expect(getReadingStatus(-2.0, camberSpec)).toBe('red')
    })

    it('returns red well above the range', () => {
      expect(getReadingStatus(1.0, camberSpec)).toBe('red')
    })

    it('returns red just past the variance band below', () => {
      // min - variance = -0.80, so -0.81 should be red
      expect(getReadingStatus(-0.81, camberSpec)).toBe('red')
    })

    it('returns red just past the variance band above', () => {
      // max + variance = 0.30, so 0.31 should be red
      expect(getReadingStatus(0.31, camberSpec)).toBe('red')
    })
  })

  describe('small range (< 0.1°) uses fixed 0.05° tolerance', () => {
    // tinySpec: min=0.0, max=0.05, range=0.05 (< 0.1), variance=0.05

    it('returns green within the tiny range', () => {
      expect(getReadingStatus(0.03, tinySpec)).toBe('green')
    })

    it('returns orange within fixed 0.05° tolerance below', () => {
      // min - 0.05 = -0.05
      expect(getReadingStatus(-0.04, tinySpec)).toBe('orange')
    })

    it('returns orange within fixed 0.05° tolerance above', () => {
      // max + 0.05 = 0.10
      expect(getReadingStatus(0.09, tinySpec)).toBe('orange')
    })

    it('returns red beyond fixed tolerance', () => {
      expect(getReadingStatus(-0.06, tinySpec)).toBe('red')
    })

    it('returns red beyond fixed tolerance above', () => {
      expect(getReadingStatus(0.11, tinySpec)).toBe('red')
    })
  })

  describe('edge cases', () => {
    it('handles negative spec ranges', () => {
      const negSpec = spec(-2.0, -1.0)
      // range = 1.0, variance = 0.05
      expect(getReadingStatus(-1.5, negSpec)).toBe('green')
      expect(getReadingStatus(-2.04, negSpec)).toBe('orange')
      expect(getReadingStatus(-0.5, negSpec)).toBe('red')
    })

    it('handles spec where min equals max (zero range)', () => {
      const zeroRange = spec(1.0, 1.0)
      // range = 0.0 (< 0.1), fixed variance = 0.05
      expect(getReadingStatus(1.0, zeroRange)).toBe('green')
      expect(getReadingStatus(1.04, zeroRange)).toBe('orange')
      expect(getReadingStatus(1.06, zeroRange)).toBe('red')
    })

    it('accepts numeric values directly (not just strings)', () => {
      expect(getReadingStatus(0.0, camberSpec)).toBe('green')
    })

    it('handles value of 0 correctly (falsy but valid)', () => {
      expect(getReadingStatus(0, spec(-1, 1))).toBe('green')
    })
  })
})

// ─── getReadingStyle ──────────────────────────────────────────────

describe('getReadingStyle', () => {
  it('returns green style for in-spec reading', () => {
    const style = getReadingStyle(0.0, camberSpec)
    expect(style.background).toBe(statusColors.green.bg)
    expect(style.borderColor).toBe(statusColors.green.border)
    expect(style.color).toBe(statusColors.green.text)
  })

  it('returns orange style for near-spec reading', () => {
    const style = getReadingStyle(-0.80, camberSpec)
    expect(style.background).toBe(statusColors.orange.bg)
  })

  it('returns red style for out-of-spec reading', () => {
    const style = getReadingStyle(-2.0, camberSpec)
    expect(style.background).toBe(statusColors.red.bg)
  })

  it('returns neutral style for missing data', () => {
    const style = getReadingStyle('', camberSpec)
    expect(style.background).toBe(statusColors.neutral.bg)
  })
})

// ─── emptyReadings ────────────────────────────────────────────────

describe('emptyReadings', () => {
  it('returns all four wheel positions with camber and toe', () => {
    const r = emptyReadings()
    for (const wheel of ['front_left', 'front_right', 'rear_left', 'rear_right']) {
      expect(r[wheel]).toEqual({ camber: '', toe: '' })
    }
  })

  it('returns empty summary fields', () => {
    const r = emptyReadings()
    expect(r.left_caster).toBe('')
    expect(r.right_caster).toBe('')
    expect(r.thrust_angle).toBe('')
    expect(r.steer_ahead).toBe('')
    expect(r.front_total_toe).toBe('')
    expect(r.rear_total_toe).toBe('')
  })

  it('returns a new object each time (no shared references)', () => {
    const a = emptyReadings()
    const b = emptyReadings()
    expect(a).not.toBe(b)
    a.front_left.camber = '1.0'
    expect(b.front_left.camber).toBe('')
  })
})

// ─── getSpecForReading ────────────────────────────────────────────

describe('getSpecForReading', () => {
  it('returns front camber spec for front_left', () => {
    expect(getSpecForReading(oemSpec, 'front_left', 'camber')).toEqual(oemSpec.front.camber)
  })

  it('returns front individualToe spec for front_right toe', () => {
    expect(getSpecForReading(oemSpec, 'front_right', 'toe')).toEqual(oemSpec.front.individualToe)
  })

  it('returns rear camber spec for rear_left', () => {
    expect(getSpecForReading(oemSpec, 'rear_left', 'camber')).toEqual(oemSpec.rear.camber)
  })

  it('returns rear individualToe spec for rear_right toe', () => {
    expect(getSpecForReading(oemSpec, 'rear_right', 'toe')).toEqual(oemSpec.rear.individualToe)
  })

  it('returns null for unknown measurement', () => {
    expect(getSpecForReading(oemSpec, 'front_left', 'caster')).toBeNull()
  })

  it('returns null when oemSpec is null', () => {
    expect(getSpecForReading(null, 'front_left', 'camber')).toBeNull()
  })

  it('returns null when axle spec is missing', () => {
    expect(getSpecForReading({ front: null }, 'front_left', 'camber')).toBeNull()
  })

  it('returns null when specific measurement is missing from axle', () => {
    const partial = { front: { camber: spec(0, 1) } }
    expect(getSpecForReading(partial, 'front_left', 'toe')).toBeNull()
  })
})

// ─── getSpecForSummary ────────────────────────────────────────────

describe('getSpecForSummary', () => {
  it('returns caster spec for left_caster', () => {
    expect(getSpecForSummary(oemSpec, 'left_caster')).toEqual(oemSpec.front.caster)
  })

  it('returns caster spec for right_caster', () => {
    expect(getSpecForSummary(oemSpec, 'right_caster')).toEqual(oemSpec.front.caster)
  })

  it('returns thrust angle spec', () => {
    expect(getSpecForSummary(oemSpec, 'thrust_angle')).toEqual(oemSpec.thrustAngle)
  })

  it('returns steer ahead spec', () => {
    expect(getSpecForSummary(oemSpec, 'steer_ahead')).toEqual(oemSpec.steerAheadAngle)
  })

  it('returns front total toe spec', () => {
    expect(getSpecForSummary(oemSpec, 'front_total_toe')).toEqual(oemSpec.front.totalToe)
  })

  it('returns rear total toe spec', () => {
    expect(getSpecForSummary(oemSpec, 'rear_total_toe')).toBeNull() // rear has no totalToe in fixture
  })

  it('returns null for unknown measurement', () => {
    expect(getSpecForSummary(oemSpec, 'unknown_field')).toBeNull()
  })

  it('returns null when oemSpec is null', () => {
    expect(getSpecForSummary(null, 'left_caster')).toBeNull()
  })

  it('returns null when front spec is missing', () => {
    expect(getSpecForSummary({}, 'left_caster')).toBeNull()
  })
})

// ─── countStatuses ────────────────────────────────────────────────

describe('countStatuses', () => {
  it('returns zero counts for null readings', () => {
    expect(countStatuses(null, oemSpec)).toEqual({ green: 0, orange: 0, red: 0 })
  })

  it('returns zero counts for null oemSpec', () => {
    const readings = emptyReadings()
    readings.front_left.camber = '0.0'
    expect(countStatuses(readings, null)).toEqual({ green: 0, orange: 0, red: 0 })
  })

  it('returns zero counts for empty readings', () => {
    expect(countStatuses(emptyReadings(), oemSpec)).toEqual({ green: 0, orange: 0, red: 0 })
  })

  it('counts a single green wheel reading', () => {
    const readings = emptyReadings()
    readings.front_left.camber = '0.0' // within front camber spec
    const counts = countStatuses(readings, oemSpec)
    expect(counts.green).toBe(1)
    expect(counts.orange).toBe(0)
    expect(counts.red).toBe(0)
  })

  it('counts multiple wheel readings across statuses', () => {
    const readings = emptyReadings()
    readings.front_left.camber = '0.0'   // green (within -0.75 to 0.25)
    readings.front_right.camber = '0.29' // orange (0.25 + 0.05 variance band)
    readings.rear_left.camber = '1.0'    // red (well outside -1.0 to 0.0)
    const counts = countStatuses(readings, oemSpec)
    expect(counts.green).toBe(1)
    expect(counts.orange).toBe(1)
    expect(counts.red).toBe(1)
  })

  it('counts summary fields (caster, thrust angle)', () => {
    const readings = emptyReadings()
    readings.left_caster = '4.0'   // green (within 3.0 to 5.0)
    readings.right_caster = '2.9'  // orange (within variance of 3.0)
    readings.thrust_angle = '0.5'  // red (outside -0.1 to 0.1 + variance)
    const counts = countStatuses(readings, oemSpec)
    expect(counts.green).toBe(1)
    expect(counts.orange).toBe(1)
    expect(counts.red).toBe(1)
  })

  it('handles value of 0 correctly (falsy but should be counted)', () => {
    const readings = emptyReadings()
    readings.front_left.camber = 0 // numeric zero, within spec
    const counts = countStatuses(readings, oemSpec)
    expect(counts.green).toBe(1)
  })

  it('counts all readings when fully populated', () => {
    const readings = emptyReadings()
    // 4 wheels x 2 measurements = 8 wheel readings
    readings.front_left = { camber: '0.0', toe: '0.0' }
    readings.front_right = { camber: '0.0', toe: '0.0' }
    readings.rear_left = { camber: '-0.5', toe: '0.1' }
    readings.rear_right = { camber: '-0.5', toe: '0.1' }
    // 3 summary readings counted by countStatuses
    readings.left_caster = '4.0'
    readings.right_caster = '4.0'
    readings.thrust_angle = '0.0'
    const counts = countStatuses(readings, oemSpec)
    expect(counts.green + counts.orange + counts.red).toBe(11)
  })
})

// ─── hasAnyReadings ───────────────────────────────────────────────

describe('hasAnyReadings', () => {
  it('returns false for null', () => {
    expect(hasAnyReadings(null)).toBe(false)
  })

  it('returns false for empty readings', () => {
    expect(hasAnyReadings(emptyReadings())).toBe(false)
  })

  it('returns true when a wheel field has a value', () => {
    const r = emptyReadings()
    r.front_left.camber = '0.5'
    expect(hasAnyReadings(r)).toBe(true)
  })

  it('returns true when a summary field has a value', () => {
    const r = emptyReadings()
    r.left_caster = '3.5'
    expect(hasAnyReadings(r)).toBe(true)
  })

  it('returns true for numeric zero (falsy but valid)', () => {
    const r = emptyReadings()
    r.front_left.camber = 0
    expect(hasAnyReadings(r)).toBe(true)
  })

  it('returns true for summary numeric zero', () => {
    const r = emptyReadings()
    r.thrust_angle = 0
    expect(hasAnyReadings(r)).toBe(true)
  })

  it('returns false when wheel objects are missing', () => {
    const r = emptyReadings()
    r.front_left = undefined
    expect(hasAnyReadings(r)).toBe(false)
  })
})
