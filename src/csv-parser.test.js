import { describe, it, expect } from 'vitest'

// ─── CSV Parser logic replicated from App.jsx ─────────────────────
// The CSV import handler in App.jsx contains an inline CSV parser
// that handles quoted fields and maps columns to spec_data structure.
// We replicate it here for isolated testing.

function parseCsvRow(line) {
  const cells = []
  let current = '', inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { cells.push(current.trim()); current = ''; continue }
    current += ch
  }
  cells.push(current.trim())
  return cells
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

  const col = (name) => headers.indexOf(name)
  const getVal = (cells, headerName) => {
    const idx = col(headerName)
    return idx >= 0 && idx < cells.length ? cells[idx].trim() : ''
  }

  const results = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i])

    const year = getVal(cells, 'year')
    const make = getVal(cells, 'make')
    const model = getVal(cells, 'model')
    if (!year || !make || !model) continue

    results.push({
      year, make, model,
      trim: getVal(cells, 'trim'),
      notes: getVal(cells, 'notes'),
      spec_data: {
        front: {
          camber: {
            preferred: getVal(cells, 'front_camber_pref'),
            min: getVal(cells, 'front_camber_min'),
            max: getVal(cells, 'front_camber_max'),
          },
          caster: {
            preferred: getVal(cells, 'front_caster_pref'),
            min: getVal(cells, 'front_caster_min'),
            max: getVal(cells, 'front_caster_max'),
          },
          totalToe: {
            preferred: getVal(cells, 'front_total_toe_pref'),
            min: getVal(cells, 'front_total_toe_min'),
            max: getVal(cells, 'front_total_toe_max'),
          },
          individualToe: {
            preferred: getVal(cells, 'front_ind_toe_pref'),
            min: getVal(cells, 'front_ind_toe_min'),
            max: getVal(cells, 'front_ind_toe_max'),
          },
        },
        rear: {
          camber: {
            preferred: getVal(cells, 'rear_camber_pref'),
            min: getVal(cells, 'rear_camber_min'),
            max: getVal(cells, 'rear_camber_max'),
          },
          totalToe: {
            preferred: getVal(cells, 'rear_total_toe_pref'),
            min: getVal(cells, 'rear_total_toe_min'),
            max: getVal(cells, 'rear_total_toe_max'),
          },
          individualToe: {
            preferred: getVal(cells, 'rear_ind_toe_pref'),
            min: getVal(cells, 'rear_ind_toe_min'),
            max: getVal(cells, 'rear_ind_toe_max'),
          },
        },
        thrustAngle: {
          preferred: getVal(cells, 'thrust_angle_pref'),
          min: getVal(cells, 'thrust_angle_min'),
          max: getVal(cells, 'thrust_angle_max'),
        },
      },
    })
  }
  return results
}

// ─── parseCsvRow (inline CSV field splitter) ──────────────────────

describe('parseCsvRow', () => {
  it('splits simple comma-separated values', () => {
    expect(parseCsvRow('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('trims whitespace from fields', () => {
    expect(parseCsvRow(' a , b , c ')).toEqual(['a', 'b', 'c'])
  })

  it('handles quoted fields with commas inside', () => {
    expect(parseCsvRow('a,"b,c",d')).toEqual(['a', 'b,c', 'd'])
  })

  it('handles empty fields', () => {
    expect(parseCsvRow('a,,c')).toEqual(['a', '', 'c'])
  })

  it('handles a single field', () => {
    expect(parseCsvRow('hello')).toEqual(['hello'])
  })

  it('handles quoted field at start', () => {
    expect(parseCsvRow('"hello, world",b')).toEqual(['hello, world', 'b'])
  })

  it('handles quoted field at end', () => {
    expect(parseCsvRow('a,"hello, world"')).toEqual(['a', 'hello, world'])
  })

  it('strips quotes from quoted fields', () => {
    expect(parseCsvRow('"hello"')).toEqual(['hello'])
  })

  it('handles empty quoted fields', () => {
    expect(parseCsvRow('"",b')).toEqual(['', 'b'])
  })

  it('handles numeric values', () => {
    expect(parseCsvRow('2024,Toyota,-0.75,0.25')).toEqual(['2024', 'Toyota', '-0.75', '0.25'])
  })
})

// ─── parseCsv (full CSV to spec objects) ──────────────────────────

describe('parseCsv', () => {
  const sampleHeader = 'year,make,model,trim,notes,front_camber_pref,front_camber_min,front_camber_max,front_caster_pref,front_caster_min,front_caster_max,front_total_toe_pref,front_total_toe_min,front_total_toe_max,front_ind_toe_pref,front_ind_toe_min,front_ind_toe_max,rear_camber_pref,rear_camber_min,rear_camber_max,rear_total_toe_pref,rear_total_toe_min,rear_total_toe_max,rear_ind_toe_pref,rear_ind_toe_min,rear_ind_toe_max,thrust_angle_pref,thrust_angle_min,thrust_angle_max'
  const sampleRow = '2024,Toyota,Camry,SE,,-0.75,-1.50,0.00,3.50,2.50,4.50,0.10,-0.10,0.30,0.05,-0.05,0.15,-0.75,-1.50,0.00,0.20,0.00,0.40,0.10,0.00,0.20,0.00,-0.20,0.20'

  it('throws on empty CSV', () => {
    expect(() => parseCsv('')).toThrow()
  })

  it('throws on header-only CSV', () => {
    expect(() => parseCsv(sampleHeader)).toThrow('CSV must have a header row and at least one data row')
  })

  it('parses a single row correctly', () => {
    const result = parseCsv(sampleHeader + '\n' + sampleRow)
    expect(result).toHaveLength(1)
    expect(result[0].year).toBe('2024')
    expect(result[0].make).toBe('Toyota')
    expect(result[0].model).toBe('Camry')
    expect(result[0].trim).toBe('SE')
  })

  it('maps front camber spec values correctly', () => {
    const result = parseCsv(sampleHeader + '\n' + sampleRow)
    expect(result[0].spec_data.front.camber).toEqual({
      preferred: '-0.75',
      min: '-1.50',
      max: '0.00',
    })
  })

  it('maps front caster spec values correctly', () => {
    const result = parseCsv(sampleHeader + '\n' + sampleRow)
    expect(result[0].spec_data.front.caster).toEqual({
      preferred: '3.50',
      min: '2.50',
      max: '4.50',
    })
  })

  it('maps rear camber spec values correctly', () => {
    const result = parseCsv(sampleHeader + '\n' + sampleRow)
    expect(result[0].spec_data.rear.camber).toEqual({
      preferred: '-0.75',
      min: '-1.50',
      max: '0.00',
    })
  })

  it('maps thrust angle spec values correctly', () => {
    const result = parseCsv(sampleHeader + '\n' + sampleRow)
    expect(result[0].spec_data.thrustAngle).toEqual({
      preferred: '0.00',
      min: '-0.20',
      max: '0.20',
    })
  })

  it('parses multiple rows', () => {
    const row2 = '2023,Honda,Civic,LX,,0.00,-0.50,0.50,4.00,3.00,5.00,0.00,-0.20,0.20,0.00,-0.10,0.10,-0.50,-1.00,0.00,0.10,0.00,0.20,0.05,0.00,0.10,0.00,-0.10,0.10'
    const result = parseCsv(sampleHeader + '\n' + sampleRow + '\n' + row2)
    expect(result).toHaveLength(2)
    expect(result[0].make).toBe('Toyota')
    expect(result[1].make).toBe('Honda')
  })

  it('skips rows missing required fields (year, make, model)', () => {
    const badRow = ',Toyota,Camry,SE,,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0'
    const result = parseCsv(sampleHeader + '\n' + badRow)
    expect(result).toHaveLength(0)
  })

  it('skips row missing make', () => {
    const badRow = '2024,,Camry,SE,,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0'
    const result = parseCsv(sampleHeader + '\n' + badRow)
    expect(result).toHaveLength(0)
  })

  it('skips row missing model', () => {
    const badRow = '2024,Toyota,,SE,,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0'
    const result = parseCsv(sampleHeader + '\n' + badRow)
    expect(result).toHaveLength(0)
  })

  it('handles Windows line endings (\\r\\n)', () => {
    const csv = sampleHeader + '\r\n' + sampleRow + '\r\n'
    const result = parseCsv(csv)
    expect(result).toHaveLength(1)
    expect(result[0].make).toBe('Toyota')
  })

  it('handles trailing empty lines', () => {
    const csv = sampleHeader + '\n' + sampleRow + '\n\n\n'
    const result = parseCsv(csv)
    expect(result).toHaveLength(1)
  })

  it('handles missing optional columns gracefully', () => {
    const minimalHeader = 'year,make,model'
    const minimalRow = '2024,Toyota,Camry'
    const result = parseCsv(minimalHeader + '\n' + minimalRow)
    expect(result).toHaveLength(1)
    expect(result[0].trim).toBe('')
    expect(result[0].spec_data.front.camber.preferred).toBe('')
  })

  it('handles quoted fields in CSV', () => {
    const header = 'year,make,model,notes'
    const row = '2024,Toyota,Camry,"has comma, in notes"'
    const result = parseCsv(header + '\n' + row)
    expect(result).toHaveLength(1)
    expect(result[0].notes).toBe('has comma, in notes')
  })

  it('header matching is case-insensitive', () => {
    const header = 'Year,Make,Model,Trim'
    const row = '2024,Toyota,Camry,SE'
    const result = parseCsv(header + '\n' + row)
    expect(result).toHaveLength(1)
    expect(result[0].make).toBe('Toyota')
    expect(result[0].trim).toBe('SE')
  })
})
