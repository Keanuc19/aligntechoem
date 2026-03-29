import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { getReadingStatus, statusColors, getSpecForReading, getSpecForSummary, emptyReadings } from '../utils/alignment.js'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const IconDownload = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconMail = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>
const IconBack = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
const IconPrint = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>

const mono = "'JetBrains Mono', monospace"
const thStyle = { padding: '8px 12px', fontSize: '11px', fontWeight: '700', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--c-border)', textAlign: 'center' }
const tdStyle = { padding: '7px 12px', fontSize: '13px', borderBottom: '1px solid var(--c-border)', fontFamily: mono, textAlign: 'center', fontWeight: '600' }

// ─── Spec range bar: shows where a reading falls within min/max ───
function SpecBar({ value, spec }) {
  if (!spec || !spec.min || !spec.max) return null
  const min = parseFloat(spec.min)
  const max = parseFloat(spec.max)
  const pref = parseFloat(spec.preferred)
  const v = parseFloat(value)
  if (isNaN(min) || isNaN(max)) return null

  const range = max - min
  const pad = range * 0.3 // extra visual range outside min/max
  const displayMin = min - pad
  const displayMax = max + pad
  const displayRange = displayMax - displayMin

  // Positions as percentages
  const minPct = ((min - displayMin) / displayRange) * 100
  const maxPct = ((max - displayMin) / displayRange) * 100
  const prefPct = !isNaN(pref) ? ((pref - displayMin) / displayRange) * 100 : null
  const valPct = !isNaN(v) ? Math.max(0, Math.min(100, ((v - displayMin) / displayRange) * 100)) : null
  const status = getReadingStatus(value, spec)

  return (
    <div style={{ width: '100%', height: '14px', position: 'relative', borderRadius: '3px', overflow: 'hidden', background: 'var(--c-red-dim)', marginTop: '3px' }}>
      {/* Green zone (min to max) */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        left: `${minPct}%`, width: `${maxPct - minPct}%`,
        background: 'var(--c-green-dim)', borderLeft: '1px solid var(--c-green)', borderRight: '1px solid var(--c-green)',
      }} />
      {/* Preferred marker */}
      {prefPct !== null && (
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${prefPct}%`, width: '1px', background: 'var(--c-green)', opacity: 0.5 }} />
      )}
      {/* Value indicator */}
      {valPct !== null && (
        <div style={{
          position: 'absolute', top: '1px', bottom: '1px',
          left: `${valPct}%`, width: '8px', marginLeft: '-4px',
          borderRadius: '2px',
          background: status === 'red' ? 'var(--c-red)' : status === 'yellow' ? 'var(--c-amber)' : 'var(--c-green)',
        }} />
      )}
    </div>
  )
}

// ─── Colored reading value display ───
function ReadingValue({ value, spec, showDeg = true }) {
  const status = getReadingStatus(value, spec)
  const colors = statusColors[status]
  const display = value !== '' && value !== null && value !== undefined ? value : '—'
  return (
    <span style={{ fontFamily: mono, fontWeight: '700', fontSize: '14px', color: colors.text }}>
      {display}{display !== '—' && showDeg ? '°' : ''}
    </span>
  )
}

// ─── Colored table cell ───
function ReadingTd({ value, spec }) {
  const status = getReadingStatus(value, spec)
  const colors = statusColors[status]
  return (
    <td style={{ ...tdStyle, background: colors.bg, color: colors.text }}>
      {value || '—'}
    </td>
  )
}

// ─── Calculated cross value (difference between left and right) ───
function crossValue(left, right) {
  const l = parseFloat(left)
  const r = parseFloat(right)
  if (isNaN(l) || isNaN(r)) return '—'
  return (l - r).toFixed(2)
}

// ─── Calculated total (sum of left and right) ───
function totalValue(left, right, entered) {
  if (entered && entered !== '') return entered
  const l = parseFloat(left)
  const r = parseFloat(right)
  if (isNaN(l) || isNaN(r)) return '—'
  return (l + r).toFixed(2)
}

// ─── Visual measurement section (like the first competitor report) ───
function MeasurementVisual({ title, readings, oemSpec }) {
  const fl = readings?.front_left || {}
  const fr = readings?.front_right || {}
  const rl = readings?.rear_left || {}
  const rr = readings?.rear_right || {}

  const fCamberSpec = getSpecForReading(oemSpec, 'front_left', 'camber')
  const fToeSpec = getSpecForReading(oemSpec, 'front_left', 'toe')
  const rCamberSpec = getSpecForReading(oemSpec, 'rear_left', 'camber')
  const rToeSpec = getSpecForReading(oemSpec, 'rear_left', 'toe')
  const casterSpec = getSpecForSummary(oemSpec, 'left_caster')
  const fTotalSpec = getSpecForSummary(oemSpec, 'front_total_toe')
  const rTotalSpec = getSpecForSummary(oemSpec, 'rear_total_toe')
  const thrustSpec = getSpecForSummary(oemSpec, 'thrust_angle')
  const steerSpec = getSpecForSummary(oemSpec, 'steer_ahead')

  const cornerCard = { background: 'var(--c-surface-raised)', borderRadius: '10px', padding: '12px', minWidth: '140px' }
  const labelSm = { fontSize: '10px', fontWeight: '700', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }
  const specRange = (spec) => spec?.min && spec?.max ? `${spec.min} to ${spec.max}` : ''

  function CornerBlock({ label, camber, toe, caster, camberSpec, toeSpec, casterSpec }) {
    return (
      <div style={cornerCard}>
        <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>{label}</div>
        <div style={{ marginBottom: '6px' }}>
          <div style={labelSm}>Camber</div>
          <ReadingValue value={camber} spec={camberSpec} />
          <SpecBar value={camber} spec={camberSpec} />
          <div style={{ fontSize: '9px', color: 'var(--c-text-dim)', marginTop: '1px' }}>{specRange(camberSpec)}</div>
        </div>
        {caster !== undefined && (
          <div style={{ marginBottom: '6px' }}>
            <div style={labelSm}>Caster</div>
            <ReadingValue value={caster} spec={casterSpec} />
            <SpecBar value={caster} spec={casterSpec} />
            <div style={{ fontSize: '9px', color: 'var(--c-text-dim)', marginTop: '1px' }}>{specRange(casterSpec)}</div>
          </div>
        )}
        <div>
          <div style={labelSm}>Toe</div>
          <ReadingValue value={toe} spec={toeSpec} />
          <SpecBar value={toe} spec={toeSpec} />
          <div style={{ fontSize: '9px', color: 'var(--c-text-dim)', marginTop: '1px' }}>{specRange(toeSpec)}</div>
        </div>
      </div>
    )
  }

  function CenterBlock({ label, value, spec }) {
    const status = getReadingStatus(value, spec)
    const colors = statusColors[status]
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'inline-block', padding: '4px 14px', borderRadius: '6px',
          background: colors.bg, border: `1.5px solid ${colors.border}`,
          fontFamily: mono, fontWeight: '700', fontSize: '14px', color: colors.text,
        }}>
          {value || '—'}{value ? '°' : ''}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--c-text-dim)', marginTop: '2px', fontWeight: '600' }}>{label}</div>
        {spec?.min && <div style={{ fontSize: '9px', color: 'var(--c-text-dim)' }}>{spec.min} to {spec.max}</div>}
      </div>
    )
  }

  const frontTotalToe = totalValue(fl.toe, fr.toe, readings?.front_total_toe)
  const rearTotalToe = totalValue(rl.toe, rr.toe, readings?.rear_total_toe)

  return (
    <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h3>

      {/* Front axle */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '12px' }}>
        <CornerBlock label="Left Front" camber={fl.camber} caster={readings?.left_caster} toe={fl.toe}
          camberSpec={fCamberSpec} casterSpec={casterSpec} toeSpec={fToeSpec} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', padding: '12px 0', flex: '0 1 auto', minWidth: '100px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--c-text-dim)' }}>FRONT</div>
          <CenterBlock label="Total Toe" value={frontTotalToe} spec={fTotalSpec} />
          <CenterBlock label="Steer Ahead" value={readings?.steer_ahead} spec={steerSpec} />
        </div>
        <CornerBlock label="Right Front" camber={fr.camber} caster={readings?.right_caster} toe={fr.toe}
          camberSpec={fCamberSpec} casterSpec={casterSpec} toeSpec={fToeSpec} />
      </div>

      {/* Rear axle */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <CornerBlock label="Left Rear" camber={rl.camber} toe={rl.toe}
          camberSpec={rCamberSpec} toeSpec={rToeSpec} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', padding: '12px 0', flex: '0 1 auto', minWidth: '100px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--c-text-dim)' }}>REAR</div>
          <CenterBlock label="Total Toe" value={rearTotalToe} spec={rTotalSpec} />
          <CenterBlock label="Thrust Angle" value={readings?.thrust_angle} spec={thrustSpec} />
        </div>
        <CornerBlock label="Right Rear" camber={rr.camber} toe={rr.toe}
          camberSpec={rCamberSpec} toeSpec={rToeSpec} />
      </div>
    </div>
  )
}

// ─── Detailed table section (like KDS II report) ───
function DetailedTable({ before, after, oemSpec }) {
  const fCamberSpec = getSpecForReading(oemSpec, 'front_left', 'camber')
  const fToeSpec = getSpecForReading(oemSpec, 'front_left', 'toe')
  const rCamberSpec = getSpecForReading(oemSpec, 'rear_left', 'camber')
  const rToeSpec = getSpecForReading(oemSpec, 'rear_left', 'toe')
  const casterSpec = getSpecForSummary(oemSpec, 'left_caster')
  const fTotalSpec = getSpecForSummary(oemSpec, 'front_total_toe')
  const rTotalSpec = getSpecForSummary(oemSpec, 'rear_total_toe')
  const thrustSpec = getSpecForSummary(oemSpec, 'thrust_angle')

  function specStr(spec) {
    if (!spec?.preferred) return '—'
    return `${spec.preferred}° [${spec.min} | ${spec.max}]`
  }

  const sectionHeader = (text) => (
    <tr><td colSpan={4} style={{ padding: '10px 12px 6px', fontSize: '12px', fontWeight: '800', color: 'var(--c-amber)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--c-border)', background: 'var(--c-surface-raised)' }}>{text}</td></tr>
  )

  function DataRow({ label, side, beforeVal, afterVal, spec }) {
    return (
      <tr>
        <td style={{ ...tdStyle, textAlign: 'left', fontFamily: 'inherit', fontWeight: side ? '400' : '600', paddingLeft: side ? '28px' : '12px' }}>
          {side ? side : label}
        </td>
        <ReadingTd value={beforeVal} spec={spec} />
        <td style={{ ...tdStyle, color: 'var(--c-text-dim)', fontSize: '11px', fontFamily: mono }}>
          {specStr(spec)}
        </td>
        <ReadingTd value={afterVal} spec={spec} />
      </tr>
    )
  }

  const bfl = before?.front_left || {}, bfr = before?.front_right || {}
  const brl = before?.rear_left || {}, brr = before?.rear_right || {}
  const afl = after?.front_left || {}, afr = after?.front_right || {}
  const arl = after?.rear_left || {}, arr = after?.rear_right || {}

  return (
    <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Detailed Alignment Data</h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
          <thead>
            <tr style={{ background: 'var(--c-surface-raised)' }}>
              <th style={{ ...thStyle, textAlign: 'left' }}>Measurement</th>
              <th style={{ ...thStyle, color: 'var(--c-amber)' }}>Initial</th>
              <th style={thStyle}>Target Data</th>
              <th style={{ ...thStyle, color: 'var(--c-green)' }}>Final</th>
            </tr>
          </thead>
          <tbody>
            {sectionHeader('Front Axle')}
            <DataRow label="Camber" side="left" beforeVal={bfl.camber} afterVal={afl.camber} spec={fCamberSpec} />
            <DataRow label="" side="right" beforeVal={bfr.camber} afterVal={afr.camber} spec={fCamberSpec} />
            <DataRow label="Cross Camber" beforeVal={crossValue(bfl.camber, bfr.camber)} afterVal={crossValue(afl.camber, afr.camber)} spec={null} />
            <DataRow label="Caster" side="left" beforeVal={before?.left_caster} afterVal={after?.left_caster} spec={casterSpec} />
            <DataRow label="" side="right" beforeVal={before?.right_caster} afterVal={after?.right_caster} spec={casterSpec} />
            <DataRow label="Cross Caster" beforeVal={crossValue(before?.left_caster, before?.right_caster)} afterVal={crossValue(after?.left_caster, after?.right_caster)} spec={null} />
            <DataRow label="Ind. Toe" side="left" beforeVal={bfl.toe} afterVal={afl.toe} spec={fToeSpec} />
            <DataRow label="" side="right" beforeVal={bfr.toe} afterVal={afr.toe} spec={fToeSpec} />
            <DataRow label="Total Toe" beforeVal={totalValue(bfl.toe, bfr.toe, before?.front_total_toe)} afterVal={totalValue(afl.toe, afr.toe, after?.front_total_toe)} spec={fTotalSpec} />
            <DataRow label="Steer Ahead" beforeVal={before?.steer_ahead} afterVal={after?.steer_ahead} spec={null} />

            {sectionHeader('Rear Axle')}
            <DataRow label="Camber" side="left" beforeVal={brl.camber} afterVal={arl.camber} spec={rCamberSpec} />
            <DataRow label="" side="right" beforeVal={brr.camber} afterVal={arr.camber} spec={rCamberSpec} />
            <DataRow label="Cross Camber" beforeVal={crossValue(brl.camber, brr.camber)} afterVal={crossValue(arl.camber, arr.camber)} spec={null} />
            <DataRow label="Ind. Toe" side="left" beforeVal={brl.toe} afterVal={arl.toe} spec={rToeSpec} />
            <DataRow label="" side="right" beforeVal={brr.toe} afterVal={arr.toe} spec={rToeSpec} />
            <DataRow label="Total Toe" beforeVal={totalValue(brl.toe, brr.toe, before?.rear_total_toe)} afterVal={totalValue(arl.toe, arr.toe, after?.rear_total_toe)} spec={rTotalSpec} />
            <DataRow label="Thrust Angle" beforeVal={before?.thrust_angle} afterVal={after?.thrust_angle} spec={thrustSpec} />
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main report page ───
export default function ReportViewPage() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const reportRef = useRef(null)

  useEffect(() => { loadReport() }, [id])

  async function loadReport() {
    try {
      const { data, error } = await supabase.from('alignment_reports')
        .select('*, vehicles(*), customers(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      setReport(data)
    } catch (err) {
      console.error('Load report error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadPDF() {
    if (!reportRef.current) return
    setGenerating(true)
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#0f1114',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const pdf = new jsPDF('p', 'mm', 'a4')
      let yOffset = 0
      while (yOffset < imgHeight) {
        if (yOffset > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -yOffset, imgWidth, imgHeight)
        yOffset += 297
      }
      const vehicle = report.vehicles
      pdf.save(`alignment-report-${vehicle?.year}-${vehicle?.make}-${vehicle?.model}-${new Date(report.created_at).toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('PDF generation error:', err)
    } finally {
      setGenerating(false)
    }
  }

  function handleEmail() {
    if (!report) return
    const v = report.vehicles, c = report.customers
    const subject = encodeURIComponent(`Wheel Alignment Report — ${v?.year} ${v?.make} ${v?.model}`)
    const body = encodeURIComponent(
      `Hi ${c?.name},\n\nPlease find your wheel alignment report details below.\n\n` +
      `Vehicle: ${v?.year} ${v?.make} ${v?.model}${v?.trim ? ' ' + v.trim : ''}\n` +
      `${v?.vin ? 'VIN: ' + v.vin + '\n' : ''}${v?.license_plate ? 'Plate: ' + v.license_plate + '\n' : ''}` +
      `${v?.mileage ? 'Mileage: ' + v.mileage + '\n' : ''}` +
      `Date: ${new Date(report.created_at).toLocaleDateString()}\nTechnician: ${report.technician_name}\n\n` +
      `Please download the attached PDF for the full alignment details.\n\nThank you for choosing our service!`
    )
    window.open(`mailto:${c?.email || ''}?subject=${subject}&body=${body}`, '_blank')
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-dim)' }}>Loading report...</div>
  if (!report) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-dim)' }}>Report not found.</div>

  const v = report.vehicles || {}
  const c = report.customers || {}
  const oemSpec = report.oem_spec || {}
  const before = report.before_readings || emptyReadings()
  const after = report.after_readings || emptyReadings()

  return (
    <div className="animate-in">
      {/* Toolbar */}
      <div className="no-print report-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <Link to="/reports" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--c-text-dim)', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
          <IconBack /> All Reports
        </Link>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => window.print()} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--c-border)',
            background: 'var(--c-surface)', color: 'var(--c-text)', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          }}>
            <IconPrint /> Print
          </button>
          <button onClick={handleDownloadPDF} disabled={generating} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 18px', borderRadius: '10px', border: 'none',
            background: 'var(--c-blue)', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: generating ? 'wait' : 'pointer',
          }}>
            <IconDownload /> {generating ? 'Generating...' : 'Download PDF'}
          </button>
          <button onClick={handleEmail} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 18px', borderRadius: '10px', border: 'none',
            background: 'var(--c-green)', color: '#000', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          }}>
            <IconMail /> Email to Customer
          </button>
        </div>
      </div>

      {/* Report content — captured for PDF */}
      <div ref={reportRef} style={{ background: 'var(--c-bg)', padding: '20px' }} id="report-content">

        {/* ═══ Header ═══ */}
        <div style={{
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: '14px', padding: '20px', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--c-amber)', letterSpacing: '-0.5px' }}>AlignSpec</div>
              <div style={{ fontSize: '11px', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Wheel Alignment Report</div>
            </div>
            <span style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
              background: report.status === 'completed' ? 'var(--c-green-dim)' : 'var(--c-amber-dim)',
              color: report.status === 'completed' ? 'var(--c-green)' : 'var(--c-amber)',
            }}>
              {report.status === 'completed' ? 'Completed' : 'In Progress'}
            </span>
          </div>
        </div>

        {/* ═══ Info grid ═══ */}
        <div className="report-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Customer</div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>{c.name}</div>
            {c.email && <div style={{ fontSize: '12px', color: 'var(--c-text-dim)', marginTop: '2px' }}>{c.email}</div>}
            {c.phone && <div style={{ fontSize: '12px', color: 'var(--c-text-dim)' }}>{c.phone}</div>}
          </div>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Vehicle</div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>{v.year} {v.make} {v.model}</div>
            {v.trim && <div style={{ fontSize: '12px', color: 'var(--c-text-dim)' }}>Trim: {v.trim}</div>}
            {v.vin && <div style={{ fontSize: '12px', color: 'var(--c-text-dim)' }}>VIN: {v.vin}</div>}
            {v.license_plate && <div style={{ fontSize: '12px', color: 'var(--c-text-dim)' }}>Plate: {v.license_plate}</div>}
            {v.mileage && <div style={{ fontSize: '12px', color: 'var(--c-text-dim)' }}>Mileage: {v.mileage}</div>}
          </div>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Service</div>
            <div style={{ fontSize: '12px', color: 'var(--c-text-dim)' }}>Technician: <strong>{report.technician_name}</strong></div>
            <div style={{ fontSize: '12px', color: 'var(--c-text-dim)', marginTop: '2px' }}>
              Date: {new Date(report.created_at).toLocaleDateString()} {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* ═══ Color legend ═══ */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', padding: '0 4px' }}>
          {[
            { status: 'green', label: 'Within OEM spec' },
            { status: 'yellow', label: 'Approaching limit' },
            { status: 'red', label: 'Out of spec' },
          ].map(item => (
            <div key={item.status} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--c-text-dim)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: statusColors[item.status].bg, border: `2px solid ${statusColors[item.status].border}` }} />
              {item.label}
            </div>
          ))}
        </div>

        {/* ═══ Visual: Before Measurements ═══ */}
        <MeasurementVisual title="Before Measurements (Initial)" readings={before} oemSpec={oemSpec} />

        {/* ═══ Visual: After Measurements ═══ */}
        <MeasurementVisual title="After Measurements (Final)" readings={after} oemSpec={oemSpec} />

        {/* ═══ Detailed Table (KDS-style) ═══ */}
        <DetailedTable before={before} after={after} oemSpec={oemSpec} />

        {/* ═══ Notes ═══ */}
        {report.notes && (
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Notes</div>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{report.notes}</p>
          </div>
        )}

        {/* ═══ Footer ═══ */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--c-text-dim)', padding: '12px', borderTop: '1px solid var(--c-border)' }}>
          Generated by AlignSpec · {new Date(report.created_at).toLocaleDateString()} · Report ID: {report.id?.slice(0, 8)}
        </div>
      </div>
    </div>
  )
}
