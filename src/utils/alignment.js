// ─── Alignment color coding and helper utilities ───

/**
 * Determines the color status of an alignment reading vs OEM spec
 * using a fixed-percentage variance model (per Aligntech spec):
 *
 * - 'green'   → Within the OEM-defined Min/Max range (in-spec)
 * - 'orange'  → Within a 5% variance outside the OEM range (minor adjustment)
 * - 'red'     → Beyond the 5% variance threshold (critical)
 * - 'neutral' → Missing data, can't evaluate
 *
 * The 5% variance is calculated from the full OEM range span (max - min).
 * For very small ranges (< 0.1°), a fixed 0.05° tolerance is used instead.
 */
export function getReadingStatus(value, spec) {
  if (!spec || value === '' || value === null || value === undefined) return 'neutral'

  const v = parseFloat(value)
  if (isNaN(v)) return 'neutral'

  const min = parseFloat(spec.min)
  const max = parseFloat(spec.max)

  if (isNaN(min) || isNaN(max)) return 'neutral'

  // Within OEM Min/Max range → green (in-spec)
  if (v >= min && v <= max) return 'green'

  // Calculate the 5% variance band outside the OEM range
  const range = Math.abs(max - min)
  const variance = range >= 0.1 ? range * 0.05 : 0.05

  // Within 5% variance outside range → orange (minor adjustment needed)
  if (v >= min - variance && v <= max + variance) return 'orange'

  // Beyond 5% variance → red (critical)
  return 'red'
}

/**
 * CSS color map for reading statuses
 */
export const statusColors = {
  green: { bg: 'var(--c-green-dim)', border: 'var(--c-green)', text: 'var(--c-green)' },
  orange: { bg: 'var(--c-amber-dim)', border: 'var(--c-amber)', text: 'var(--c-amber)' },
  red: { bg: 'var(--c-red-dim)', border: 'var(--c-red)', text: 'var(--c-red)' },
  neutral: { bg: 'var(--c-input-bg)', border: 'var(--c-border)', text: 'var(--c-text)' },
}

/**
 * Returns inline style object for an alignment input based on its status
 */
export function getReadingStyle(value, spec) {
  const status = getReadingStatus(value, spec)
  const colors = statusColors[status]
  return {
    background: colors.bg,
    borderColor: colors.border,
    color: colors.text,
  }
}

/**
 * Empty readings structure for a single set (before or after).
 * Per-wheel: camber + toe only. Caster and thrust are separate.
 */
export function emptyReadings() {
  return {
    front_left: { camber: '', toe: '' },
    front_right: { camber: '', toe: '' },
    rear_left: { camber: '', toe: '' },
    rear_right: { camber: '', toe: '' },
    left_caster: '',
    right_caster: '',
    thrust_angle: '',
    steer_ahead: '',
    front_total_toe: '',
    rear_total_toe: '',
  }
}

/**
 * Maps a wheel position + measurement to the correct OEM spec field
 */
export function getSpecForReading(oemSpec, wheel, measurement) {
  if (!oemSpec) return null

  const axle = wheel.startsWith('front') ? 'front' : 'rear'
  const axleSpec = oemSpec[axle]
  if (!axleSpec) return null

  switch (measurement) {
    case 'camber': return axleSpec.camber || null
    case 'toe': return axleSpec.individualToe || null
    default: return null
  }
}

/**
 * Maps a summary measurement to the correct OEM spec field
 */
export function getSpecForSummary(oemSpec, measurement) {
  if (!oemSpec) return null

  switch (measurement) {
    case 'left_caster':
    case 'right_caster':
      return oemSpec.front?.caster || null
    case 'thrust_angle': return oemSpec.thrustAngle || null
    case 'steer_ahead': return oemSpec.steerAheadAngle || null
    case 'front_total_toe': return oemSpec.front?.totalToe || null
    case 'rear_total_toe': return oemSpec.rear?.totalToe || null
    default: return null
  }
}

/**
 * Counts reading statuses across all fields for status badges
 */
export function countStatuses(readings, oemSpec) {
  const counts = { green: 0, orange: 0, red: 0 }
  if (!readings || !oemSpec) return counts

  const wheels = ['front_left', 'front_right', 'rear_left', 'rear_right']
  for (const w of wheels) {
    for (const field of ['camber', 'toe']) {
      if (!readings[w]?.[field] && readings[w]?.[field] !== 0) continue
      const spec = getSpecForReading(oemSpec, w, field)
      const status = getReadingStatus(readings[w][field], spec)
      if (status !== 'neutral') counts[status]++
    }
  }

  const summaryKeys = ['left_caster', 'right_caster', 'thrust_angle']
  for (const key of summaryKeys) {
    if (!readings[key] && readings[key] !== 0) continue
    const spec = getSpecForSummary(oemSpec, key)
    const status = getReadingStatus(readings[key], spec)
    if (status !== 'neutral') counts[status]++
  }

  return counts
}

/**
 * Checks if a readings object has any values entered
 */
export function hasAnyReadings(readings) {
  if (!readings) return false
  const wheels = ['front_left', 'front_right', 'rear_left', 'rear_right']
  for (const w of wheels) {
    if (!readings[w]) continue
    for (const v of Object.values(readings[w])) {
      if (v !== '' && v !== null && v !== undefined) return true
    }
  }
  const summaries = ['left_caster', 'right_caster', 'thrust_angle', 'front_total_toe', 'rear_total_toe']
  for (const s of summaries) {
    if (readings[s] !== '' && readings[s] !== null && readings[s] !== undefined) return true
  }
  return false
}
