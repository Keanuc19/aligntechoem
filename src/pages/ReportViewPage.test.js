import { describe, it, expect } from 'vitest'

// ─── Pure functions extracted from ReportViewPage for testing ─────
// These functions are defined inline in ReportViewPage.jsx and are
// critical for report display calculations. We replicate them here
// to test independently (they're too tightly coupled to extract
// without refactoring the page).

function crossValue(l, r) {
  const a = parseFloat(l), b = parseFloat(r)
  return isNaN(a) || isNaN(b) ? '—' : (a - b).toFixed(2)
}

function totalValue(l, r, e) {
  if (e && e !== '') return e
  const a = parseFloat(l), b = parseFloat(r)
  return isNaN(a) || isNaN(b) ? '—' : (a + b).toFixed(2)
}

// ─── crossValue ───────────────────────────────────────────────────
// Calculates left minus right (e.g., cross-camber, cross-caster)

describe('crossValue', () => {
  it('returns the difference between two valid numbers', () => {
    expect(crossValue('1.50', '0.50')).toBe('1.00')
  })

  it('handles negative values', () => {
    expect(crossValue('-0.75', '0.25')).toBe('-1.00')
  })

  it('returns zero difference for equal values', () => {
    expect(crossValue('2.00', '2.00')).toBe('0.00')
  })

  it('returns em dash when left is empty', () => {
    expect(crossValue('', '1.00')).toBe('—')
  })

  it('returns em dash when right is empty', () => {
    expect(crossValue('1.00', '')).toBe('—')
  })

  it('returns em dash when both are empty', () => {
    expect(crossValue('', '')).toBe('—')
  })

  it('returns em dash when left is non-numeric', () => {
    expect(crossValue('abc', '1.00')).toBe('—')
  })

  it('returns em dash when right is non-numeric', () => {
    expect(crossValue('1.00', 'xyz')).toBe('—')
  })

  it('handles numeric zero correctly', () => {
    expect(crossValue('0', '0')).toBe('0.00')
  })

  it('handles numeric inputs (not just strings)', () => {
    expect(crossValue(1.5, 0.5)).toBe('1.00')
  })

  it('returns result with 2 decimal places', () => {
    expect(crossValue('1', '0')).toBe('1.00')
    expect(crossValue('1.123', '0.456')).toBe('0.67')
  })
})

// ─── totalValue ───────────────────────────────────────────────────
// Calculates left plus right (total toe), but uses explicit value if provided

describe('totalValue', () => {
  it('returns the sum of two valid numbers', () => {
    expect(totalValue('0.05', '0.05')).toBe('0.10')
  })

  it('handles negative values', () => {
    expect(totalValue('-0.10', '0.10')).toBe('0.00')
  })

  it('returns em dash when left is empty', () => {
    expect(totalValue('', '0.05')).toBe('—')
  })

  it('returns em dash when right is empty', () => {
    expect(totalValue('0.05', '')).toBe('—')
  })

  it('returns em dash when both are empty', () => {
    expect(totalValue('', '')).toBe('—')
  })

  it('returns em dash when values are non-numeric', () => {
    expect(totalValue('abc', 'def')).toBe('—')
  })

  it('returns result with 2 decimal places', () => {
    expect(totalValue('1', '2')).toBe('3.00')
  })

  // ─── Explicit override behavior ────────────────────────────────
  // When a user has manually entered a total toe value, it takes
  // precedence over the calculated sum. This covers the case where
  // the machine provides total toe directly.

  it('returns explicit value when provided (non-empty string)', () => {
    expect(totalValue('0.05', '0.05', '0.12')).toBe('0.12')
  })

  it('uses explicit value even if individual values are empty', () => {
    expect(totalValue('', '', '0.20')).toBe('0.20')
  })

  it('falls back to calculation when explicit value is empty string', () => {
    expect(totalValue('0.05', '0.05', '')).toBe('0.10')
  })

  it('falls back to calculation when explicit value is undefined', () => {
    expect(totalValue('0.05', '0.05', undefined)).toBe('0.10')
  })

  it('falls back to calculation when explicit value is null (falsy)', () => {
    // null is falsy, so falls through to calculation
    expect(totalValue('0.05', '0.05', null)).toBe('0.10')
  })

  it('uses explicit zero string as override', () => {
    // '0' is truthy and non-empty, so it should be returned
    expect(totalValue('0.05', '0.05', '0')).toBe('0')
  })
})
