import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { emptyReadings } from '../utils/alignment.js'
import VehicleDiagram from '../components/VehicleDiagram.jsx'
import vehicleData from '../vehicle-data.json'

// ─── Vehicle lookup helpers: Year → Make → Model → Trim ───
// Data is structured as vehicleData[make][model][year], so we invert the lookups.

function getAllYears() {
  const yearsSet = new Set()
  for (const make of Object.values(vehicleData)) {
    for (const model of Object.values(make)) {
      for (const year of Object.keys(model)) {
        yearsSet.add(year)
      }
    }
  }
  return Array.from(yearsSet).sort((a, b) => b - a)
}

function getMakesForYear(year) {
  if (!year) return []
  const makes = []
  for (const [makeName, models] of Object.entries(vehicleData)) {
    for (const model of Object.values(models)) {
      if (model[year]) { makes.push(makeName); break }
    }
  }
  return makes.sort()
}

function getModelsForYearMake(year, make) {
  if (!year || !make || !vehicleData[make]) return []
  const models = []
  for (const [modelName, years] of Object.entries(vehicleData[make])) {
    if (years[year]) models.push(modelName)
  }
  return models.sort()
}

function getTrimsForYearMakeModel(year, make, model) {
  if (!year || !make || !model || !vehicleData[make]?.[model]?.[year]) return []
  return vehicleData[make][model][year].map(t => t.trim).sort()
}

const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: 'var(--c-input-bg)', border: '1.5px solid var(--c-border)',
  borderRadius: '10px', color: 'var(--c-text)', fontSize: '14px', fontFamily: 'inherit',
}
const selectStyle = { ...inputStyle, appearance: 'none', cursor: 'pointer' }
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--c-text-dim)', marginBottom: '4px' }
const sectionStyle = {
  background: 'var(--c-surface)', border: '1px solid var(--c-border)',
  borderRadius: '14px', padding: '24px', marginBottom: '20px',
}

const STEPS = [
  { key: 'customer', label: 'Customer Info' },
  { key: 'vehicle', label: 'Vehicle Info' },
  { key: 'before', label: 'Before Readings' },
  { key: 'after', label: 'After Readings' },
  { key: 'review', label: 'Review & Save' },
]

export default function NewReportPage() {
  const navigate = useNavigate()
  const techName = localStorage.getItem('technicianName') || ''

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  // Customer
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  // Vehicle — order: Year → Make → Model → Trim
  const [year, setYear] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [trim, setTrim] = useState('')
  const [vin, setVin] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [mileage, setMileage] = useState('')

  // Cascading dropdown options
  const allYears = useMemo(() => getAllYears(), [])
  const makes = useMemo(() => getMakesForYear(year), [year])
  const models = useMemo(() => getModelsForYearMake(year, make), [year, make])
  const trims = useMemo(() => getTrimsForYearMakeModel(year, make, model), [year, make, model])

  // OEM Spec (fetched from alignment_specs table)
  const [oemSpec, setOemSpec] = useState(null)
  const [specLoading, setSpecLoading] = useState(false)
  const [specNotFound, setSpecNotFound] = useState(false)

  // Readings
  const [beforeReadings, setBeforeReadings] = useState(emptyReadings())
  const [afterReadings, setAfterReadings] = useState(emptyReadings())
  const [notes, setNotes] = useState('')

  // Fetch OEM spec when vehicle is fully selected
  useEffect(() => {
    if (!make || !model || !year) {
      setOemSpec(null)
      setSpecNotFound(false)
      return
    }
    fetchOemSpec()
  }, [make, model, year, trim])

  async function fetchOemSpec() {
    setSpecLoading(true)
    setSpecNotFound(false)
    try {
      let query = supabase.from('alignment_specs').select('spec_data')
        .eq('make', make).eq('model', model).eq('year', year)

      if (trim) query = query.eq('trim', trim)

      const { data, error } = await query.limit(1)
      if (error) throw error

      if (data && data.length > 0) {
        setOemSpec(data[0].spec_data)
      } else {
        // Fallback: try without trim
        const { data: fallback } = await supabase.from('alignment_specs').select('spec_data')
          .eq('make', make).eq('model', model).eq('year', year).limit(1)
        if (fallback && fallback.length > 0) {
          setOemSpec(fallback[0].spec_data)
        } else {
          setOemSpec(null)
          setSpecNotFound(true)
        }
      }
    } catch (err) {
      console.error('Spec fetch error:', err)
      setOemSpec(null)
      setSpecNotFound(true)
    } finally {
      setSpecLoading(false)
    }
  }

  function canAdvance() {
    switch (step) {
      case 0: return customerName.trim().length > 0
      case 1: return make && model && year
      case 2: return true
      case 3: return true
      case 4: return true
      default: return false
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { data: custData, error: custErr } = await supabase.from('customers')
        .insert({ name: customerName.trim(), email: customerEmail.trim(), phone: customerPhone.trim() })
        .select('id').single()
      if (custErr) throw custErr

      const { data: vehData, error: vehErr } = await supabase.from('vehicles')
        .insert({
          customer_id: custData.id,
          year, make, model, trim,
          vin: vin.trim(), license_plate: licensePlate.trim(), mileage: mileage.trim(),
        })
        .select('id').single()
      if (vehErr) throw vehErr

      const { data: reportData, error: reportErr } = await supabase.from('alignment_reports')
        .insert({
          customer_id: custData.id,
          vehicle_id: vehData.id,
          technician_name: techName,
          oem_spec: oemSpec || {},
          before_readings: beforeReadings,
          after_readings: afterReadings,
          notes: notes.trim(),
          status: 'completed',
        })
        .select('id').single()
      if (reportErr) throw reportErr

      navigate(`/reports/${reportData.id}`)
    } catch (err) {
      console.error('Save error:', err)
      setToast('Failed to save report. Please try again.')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-in" style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          New Alignment Report
        </h1>
        <p style={{ color: 'var(--c-text-dim)', fontSize: '14px', margin: 0 }}>
          Technician: {techName}
        </p>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => (
          <button key={s.key} onClick={() => { if (i < step) setStep(i) }} style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '600',
            cursor: i <= step ? 'pointer' : 'default',
            background: i === step ? 'var(--c-amber)' : i < step ? 'var(--c-green-dim)' : 'var(--c-surface-raised)',
            color: i === step ? '#000' : i < step ? 'var(--c-green)' : 'var(--c-text-dim)',
          }}>
            {i < step ? '✓ ' : ''}{s.label}
          </button>
        ))}
      </div>

      {/* Step 1: Customer */}
      {step === 0 && (
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 20px' }}>Customer Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Customer Name *</label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="email@example.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(555) 123-4567" style={inputStyle} />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Vehicle — Year → Make → Model → Trim */}
      {step === 1 && (
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 20px' }}>Vehicle Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Year *</label>
              <select value={year} onChange={e => { setYear(e.target.value); setMake(''); setModel(''); setTrim('') }} style={selectStyle}>
                <option value="">Select Year</option>
                {allYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Make *</label>
              <select value={make} onChange={e => { setMake(e.target.value); setModel(''); setTrim('') }} style={selectStyle} disabled={!year}>
                <option value="">Select Make</option>
                {makes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Model *</label>
              <select value={model} onChange={e => { setModel(e.target.value); setTrim('') }} style={selectStyle} disabled={!make}>
                <option value="">Select Model</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Trim</label>
              <select value={trim} onChange={e => setTrim(e.target.value)} style={selectStyle} disabled={!model}>
                <option value="">Select Trim</option>
                {trims.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>VIN</label>
              <input type="text" value={vin} onChange={e => setVin(e.target.value)} placeholder="Vehicle Identification Number" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>License Plate</label>
              <input type="text" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="ABC 1234" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Mileage</label>
              <input type="text" value={mileage} onChange={e => setMileage(e.target.value)} placeholder="Current mileage" style={inputStyle} />
            </div>
          </div>

          {/* OEM Spec status */}
          <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', fontSize: '13px',
            background: specLoading ? 'var(--c-blue-dim)' : oemSpec ? 'var(--c-green-dim)' : specNotFound ? 'var(--c-amber-dim)' : 'var(--c-surface-raised)',
            color: specLoading ? 'var(--c-blue)' : oemSpec ? 'var(--c-green)' : specNotFound ? 'var(--c-amber)' : 'var(--c-text-dim)',
          }}>
            {specLoading ? 'Looking up OEM alignment specs...' :
             oemSpec ? 'OEM alignment specs found — readings will be color-coded against spec' :
             specNotFound ? 'No OEM specs found for this vehicle. You can still enter readings without color coding.' :
             'Select a vehicle to look up OEM alignment specs'}
          </div>
        </div>
      )}

      {/* Step 3: Before Readings */}
      {step === 2 && (
        <VehicleDiagram
          title="Initial Alignment Readings"
          readings={beforeReadings}
          oemSpec={oemSpec}
          onChange={setBeforeReadings}
        />
      )}

      {/* Step 4: After Readings */}
      {step === 3 && (
        <VehicleDiagram
          title="Final Alignment Readings"
          readings={afterReadings}
          oemSpec={oemSpec}
          onChange={setAfterReadings}
        />
      )}

      {/* Step 5: Review & Save */}
      {step === 4 && (
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 20px' }}>Review & Save</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: 'var(--c-surface-raised)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--c-text-dim)', marginBottom: '8px' }}>CUSTOMER</div>
              <div style={{ fontWeight: '600' }}>{customerName}</div>
              {customerEmail && <div style={{ fontSize: '13px', color: 'var(--c-text-dim)' }}>{customerEmail}</div>}
              {customerPhone && <div style={{ fontSize: '13px', color: 'var(--c-text-dim)' }}>{customerPhone}</div>}
            </div>
            <div style={{ background: 'var(--c-surface-raised)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--c-text-dim)', marginBottom: '8px' }}>VEHICLE</div>
              <div style={{ fontWeight: '600' }}>{year} {make} {model}</div>
              {trim && <div style={{ fontSize: '13px', color: 'var(--c-text-dim)' }}>Trim: {trim}</div>}
              {vin && <div style={{ fontSize: '13px', color: 'var(--c-text-dim)' }}>VIN: {vin}</div>}
              {licensePlate && <div style={{ fontSize: '13px', color: 'var(--c-text-dim)' }}>Plate: {licensePlate}</div>}
              {mileage && <div style={{ fontSize: '13px', color: 'var(--c-text-dim)' }}>Mileage: {mileage}</div>}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes about the alignment..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{
            padding: '14px 16px', borderRadius: '10px', fontSize: '13px',
            background: oemSpec ? 'var(--c-green-dim)' : 'var(--c-amber-dim)',
            color: oemSpec ? 'var(--c-green)' : 'var(--c-amber)',
            marginBottom: '20px',
          }}>
            {oemSpec ? 'OEM specs attached — report will include spec comparison' : 'No OEM specs — report will show readings only'}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <button onClick={() => step === 0 ? navigate('/') : setStep(step - 1)} style={{
          padding: '12px 24px', borderRadius: '10px', border: '1px solid var(--c-border)',
          background: 'var(--c-surface)', color: 'var(--c-text)', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
        }}>
          {step === 0 ? 'Cancel' : '← Back'}
        </button>

        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(step + 1)} disabled={!canAdvance()} style={{
            padding: '12px 24px', borderRadius: '10px', border: 'none',
            background: canAdvance() ? 'var(--c-amber)' : 'var(--c-border)',
            color: canAdvance() ? '#000' : 'var(--c-text-dim)',
            fontSize: '14px', fontWeight: '700', cursor: canAdvance() ? 'pointer' : 'not-allowed',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {step === 2 ? 'Proceed to Final Readings →' : 'Next →'}
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving} style={{
            padding: '12px 32px', borderRadius: '10px', border: 'none',
            background: saving ? 'var(--c-border)' : 'var(--c-green)',
            color: saving ? 'var(--c-text-dim)' : '#000',
            fontSize: '14px', fontWeight: '700', cursor: saving ? 'wait' : 'pointer',
          }}>
            {saving ? 'Saving...' : 'Save Report'}
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: 'var(--c-red)', color: '#fff',
          padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
          zIndex: 1000, animation: 'fadeIn 0.25s ease-out',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
