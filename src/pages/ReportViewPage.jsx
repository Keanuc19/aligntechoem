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

const fieldLabels = { camber: 'Camber', toe: 'Toe' }
const wheelLabels = { front_left: 'Front Left', front_right: 'Front Right', rear_left: 'Rear Left', rear_right: 'Rear Right' }
const wheelFields = {
  front_left: ['camber', 'toe'],
  front_right: ['camber', 'toe'],
  rear_left: ['camber', 'toe'],
  rear_right: ['camber', 'toe'],
}
const summaryFields = [
  { key: 'left_caster', label: 'Left Caster' },
  { key: 'right_caster', label: 'Right Caster' },
  { key: 'thrust_angle', label: 'Thrust Angle' },
  { key: 'front_total_toe', label: 'Front Total Toe' },
  { key: 'rear_total_toe', label: 'Rear Total Toe' },
]

function ReadingCell({ value, spec }) {
  const status = getReadingStatus(value, spec)
  const colors = statusColors[status]
  return (
    <td style={{
      padding: '6px 12px', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace",
      fontSize: '13px', fontWeight: '600',
      background: colors.bg, color: colors.text, borderBottom: '1px solid var(--c-border)',
    }}>
      {value || '—'}
    </td>
  )
}

function SpecCell({ spec }) {
  if (!spec || !spec.preferred) return <td style={{ padding: '6px 12px', textAlign: 'center', fontSize: '12px', color: 'var(--c-text-dim)', borderBottom: '1px solid var(--c-border)' }}>—</td>
  return (
    <td style={{ padding: '6px 12px', textAlign: 'center', fontSize: '11px', color: 'var(--c-text-dim)', fontFamily: "'JetBrains Mono', monospace", borderBottom: '1px solid var(--c-border)' }}>
      {spec.preferred}°<br />({spec.min} to {spec.max})
    </td>
  )
}

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
      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const pdf = new jsPDF('p', 'mm', 'a4')
      let yOffset = 0
      const pageHeight = 297 // A4 height in mm

      // Handle multi-page if report is tall
      while (yOffset < imgHeight) {
        if (yOffset > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -yOffset, imgWidth, imgHeight)
        yOffset += pageHeight
      }

      const vehicle = report.vehicles
      const fileName = `alignment-report-${vehicle?.year}-${vehicle?.make}-${vehicle?.model}-${new Date(report.created_at).toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)
    } catch (err) {
      console.error('PDF generation error:', err)
    } finally {
      setGenerating(false)
    }
  }

  function handleEmail() {
    if (!report) return
    const v = report.vehicles
    const c = report.customers
    const subject = encodeURIComponent(`Wheel Alignment Report — ${v?.year} ${v?.make} ${v?.model}`)
    const body = encodeURIComponent(
      `Hi ${c?.name},\n\n` +
      `Please find your wheel alignment report details below.\n\n` +
      `Vehicle: ${v?.year} ${v?.make} ${v?.model}${v?.trim ? ' ' + v.trim : ''}\n` +
      `${v?.vin ? 'VIN: ' + v.vin + '\n' : ''}` +
      `${v?.license_plate ? 'License Plate: ' + v.license_plate + '\n' : ''}` +
      `${v?.mileage ? 'Mileage: ' + v.mileage + '\n' : ''}` +
      `Date: ${new Date(report.created_at).toLocaleDateString()}\n` +
      `Technician: ${report.technician_name}\n\n` +
      `Status: ${report.status === 'completed' ? 'Completed' : 'In Progress'}\n` +
      `${report.notes ? '\nNotes: ' + report.notes + '\n' : ''}` +
      `\nPlease download the attached PDF for the full alignment details.\n\n` +
      `Thank you for choosing our service!`
    )
    const mailto = `mailto:${c?.email || ''}?subject=${subject}&body=${body}`
    window.open(mailto, '_blank')
  }

  function handlePrint() {
    window.print()
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
      {/* Toolbar — hidden in print */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <Link to="/reports" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--c-text-dim)', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
          <IconBack /> All Reports
        </Link>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handlePrint} style={{
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
      <div ref={reportRef} style={{ background: 'var(--c-bg)', padding: '24px' }} id="report-content">
        {/* Header */}
        <div style={{
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: '14px', padding: '24px', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--c-amber)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Wheel Alignment Report
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
                {v.year} {v.make} {v.model}
              </h1>
              {v.trim && <div style={{ fontSize: '14px', color: 'var(--c-text-dim)' }}>Trim: {v.trim}</div>}
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

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Customer</div>
            <div style={{ fontWeight: '600' }}>{c.name}</div>
            {c.email && <div style={{ fontSize: '13px', color: 'var(--c-text-dim)', marginTop: '2px' }}>{c.email}</div>}
            {c.phone && <div style={{ fontSize: '13px', color: 'var(--c-text-dim)', marginTop: '2px' }}>{c.phone}</div>}
          </div>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Vehicle</div>
            {v.vin && <div style={{ fontSize: '13px', color: 'var(--c-text-dim)' }}>VIN: {v.vin}</div>}
            {v.license_plate && <div style={{ fontSize: '13px', color: 'var(--c-text-dim)' }}>Plate: {v.license_plate}</div>}
            {v.mileage && <div style={{ fontSize: '13px', color: 'var(--c-text-dim)' }}>Mileage: {v.mileage}</div>}
          </div>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Service</div>
            <div style={{ fontSize: '13px', color: 'var(--c-text-dim)' }}>Technician: {report.technician_name}</div>
            <div style={{ fontSize: '13px', color: 'var(--c-text-dim)', marginTop: '2px' }}>
              Date: {new Date(report.created_at).toLocaleDateString()} {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Alignment readings table */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Alignment Readings</h2>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              {[
                { status: 'green', label: 'At preferred' },
                { status: 'yellow', label: 'Within range' },
                { status: 'red', label: 'Out of range' },
              ].map(item => (
                <div key={item.status} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--c-text-dim)' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: statusColors[item.status].bg, border: `2px solid ${statusColors[item.status].border}` }} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--c-surface-raised)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--c-text-dim)', borderBottom: '1px solid var(--c-border)' }}>Position / Angle</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--c-text-dim)', borderBottom: '1px solid var(--c-border)' }}>OEM Spec</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--c-amber)', borderBottom: '1px solid var(--c-border)' }}>Before</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--c-green)', borderBottom: '1px solid var(--c-border)' }}>After</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(wheelLabels).map(([wheel, label]) =>
                wheelFields[wheel].map((field, i) => {
                  const spec = getSpecForReading(oemSpec, wheel, field)
                  return (
                    <tr key={`${wheel}-${field}`}>
                      <td style={{ padding: '8px 16px', fontSize: '13px', borderBottom: '1px solid var(--c-border)' }}>
                        {i === 0 && <span style={{ fontWeight: '600' }}>{label}</span>}
                        {i === 0 && ' — '}
                        {fieldLabels[field]}
                      </td>
                      <SpecCell spec={spec} />
                      <ReadingCell value={before[wheel]?.[field]} spec={spec} />
                      <ReadingCell value={after[wheel]?.[field]} spec={spec} />
                    </tr>
                  )
                })
              )}
              {/* Summary angles */}
              {summaryFields.map(sf => {
                const spec = getSpecForSummary(oemSpec, sf.key)
                return (
                  <tr key={sf.key}>
                    <td style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', borderBottom: '1px solid var(--c-border)' }}>{sf.label}</td>
                    <SpecCell spec={spec} />
                    <ReadingCell value={before[sf.key]} spec={spec} />
                    <ReadingCell value={after[sf.key]} spec={spec} />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {report.notes && (
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Notes</div>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{report.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--c-text-dim)', padding: '16px' }}>
          Generated by AlignSpec · {new Date(report.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}
