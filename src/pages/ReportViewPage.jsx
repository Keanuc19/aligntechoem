import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { getReadingStatus, getSpecForReading, getSpecForSummary, emptyReadings } from '../utils/alignment.js'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const IconDownload = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconMail = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>
const IconBack = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
const IconPrint = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>

// ─── Report uses a fixed light professional palette (no dark mode) ───
const R = {
  bg: '#f5f5f7',
  card: '#ffffff',
  border: '#e0e0e4',
  text: '#1a1a2e',
  dim: '#6b7280',
  accent: '#d99a08',
  green: '#16a34a',
  greenBg: 'rgba(22,163,74,0.1)',
  amber: '#d97706',
  amberBg: 'rgba(217,119,6,0.08)',
  red: '#dc2626',
  redBg: 'rgba(220,38,38,0.08)',
  mono: "'JetBrains Mono', monospace",
}

function statusColor(value, spec) {
  const s = getReadingStatus(value, spec)
  if (s === 'green') return { bg: R.greenBg, border: R.green, text: R.green }
  if (s === 'yellow') return { bg: R.amberBg, border: R.amber, text: R.amber }
  if (s === 'red') return { bg: R.redBg, border: R.red, text: R.red }
  return { bg: '#f0f0f0', border: '#ccc', text: R.dim }
}

// ─── Spec range bar ───
function SpecBar({ value, spec }) {
  if (!spec?.min || !spec?.max) return null
  const min = parseFloat(spec.min), max = parseFloat(spec.max), pref = parseFloat(spec.preferred), v = parseFloat(value)
  if (isNaN(min) || isNaN(max)) return null
  const range = max - min, pad = range * 0.35
  const dMin = min - pad, dMax = max + pad, dRange = dMax - dMin
  const minPct = ((min - dMin) / dRange) * 100, maxPct = ((max - dMin) / dRange) * 100
  const prefPct = !isNaN(pref) ? ((pref - dMin) / dRange) * 100 : null
  const valPct = !isNaN(v) ? Math.max(0, Math.min(100, ((v - dMin) / dRange) * 100)) : null
  const sc = statusColor(value, spec)
  return (
    <div style={{ width: '100%', height: '12px', position: 'relative', borderRadius: '2px', overflow: 'hidden', background: R.redBg, marginTop: '2px' }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${minPct}%`, width: `${maxPct - minPct}%`, background: R.greenBg, borderLeft: `1px solid ${R.green}`, borderRight: `1px solid ${R.green}` }} />
      {prefPct !== null && <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${prefPct}%`, width: '1px', background: R.green, opacity: 0.4 }} />}
      {valPct !== null && <div style={{ position: 'absolute', top: '1px', bottom: '1px', left: `${valPct}%`, width: '7px', marginLeft: '-3px', borderRadius: '2px', background: sc.border }} />}
    </div>
  )
}

function crossValue(l, r) { const a = parseFloat(l), b = parseFloat(r); return isNaN(a) || isNaN(b) ? '—' : (a - b).toFixed(2) }
function totalValue(l, r, e) { if (e && e !== '') return e; const a = parseFloat(l), b = parseFloat(r); return isNaN(a) || isNaN(b) ? '—' : (a + b).toFixed(2) }

// ─── Suspension diagram SVG for between readings ───
function SuspensionSvg() {
  return (
    <svg width="140" height="260" viewBox="0 0 140 260" fill="none" style={{ display: 'block', margin: '0 auto' }}>
      {/* Front suspension */}
      {/* Coil spring left */}
      <path d="M25 20 Q30 16 25 12 Q20 8 25 4 Q30 0 25 -4" stroke="#888" strokeWidth="1.5" fill="none" />
      {/* Coil spring right */}
      <path d="M115 20 Q120 16 115 12 Q110 8 115 4 Q120 0 115 -4" stroke="#888" strokeWidth="1.5" fill="none" />
      {/* Strut left */}
      <line x1="25" y1="20" x2="25" y2="55" stroke="#999" strokeWidth="2" />
      <line x1="115" y1="20" x2="115" y2="55" stroke="#999" strokeWidth="2" />
      {/* Control arms */}
      <line x1="50" y1="45" x2="15" y2="55" stroke="#777" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="55" x2="15" y2="50" stroke="#777" strokeWidth="2" strokeLinecap="round" />
      <line x1="90" y1="45" x2="125" y2="55" stroke="#777" strokeWidth="2" strokeLinecap="round" />
      <line x1="90" y1="55" x2="125" y2="50" stroke="#777" strokeWidth="2" strokeLinecap="round" />
      {/* Steering rack */}
      <rect x="40" y="65" width="60" height="3" rx="1.5" fill="#888" />
      <line x1="42" y1="66" x2="18" y2="54" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="98" y1="66" x2="122" y2="54" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
      {/* Knuckles */}
      <circle cx="15" cy="52" r="4" fill="#ddd" stroke="#999" strokeWidth="1" />
      <circle cx="125" cy="52" r="4" fill="#ddd" stroke="#999" strokeWidth="1" />
      {/* Wheels front */}
      <rect x="2" y="32" width="26" height="42" rx="4" fill="#e8e8e8" stroke="#999" strokeWidth="1.5" />
      <rect x="112" y="32" width="26" height="42" rx="4" fill="#e8e8e8" stroke="#999" strokeWidth="1.5" />
      <circle cx="15" cy="53" r="7" fill="none" stroke="#bbb" strokeWidth="1" />
      <circle cx="125" cy="53" r="7" fill="none" stroke="#bbb" strokeWidth="1" />

      {/* Frame rails */}
      <line x1="50" y1="30" x2="45" y2="230" stroke="#aaa" strokeWidth="3" strokeLinecap="round" />
      <line x1="90" y1="30" x2="95" y2="230" stroke="#aaa" strokeWidth="3" strokeLinecap="round" />
      {/* Crossmembers */}
      <line x1="48" y1="80" x2="92" y2="80" stroke="#bbb" strokeWidth="2" />
      <line x1="46" y1="160" x2="94" y2="160" stroke="#bbb" strokeWidth="2" />

      {/* "Front" label */}
      <text x="70" y="28" textAnchor="middle" fill="#999" fontSize="9" fontWeight="700" fontFamily="DM Sans">Front</text>

      {/* Rear suspension */}
      <path d="M30 195 Q35 191 30 187 Q25 183 30 179" stroke="#888" strokeWidth="1.5" fill="none" />
      <path d="M110 195 Q115 191 110 187 Q105 183 110 179" stroke="#888" strokeWidth="1.5" fill="none" />
      {/* Trailing arms */}
      <line x1="46" y1="200" x2="18" y2="215" stroke="#777" strokeWidth="2" strokeLinecap="round" />
      <line x1="94" y1="200" x2="122" y2="215" stroke="#777" strokeWidth="2" strokeLinecap="round" />
      {/* Rear axle */}
      <line x1="15" y1="215" x2="125" y2="215" stroke="#999" strokeWidth="2.5" strokeLinecap="round" />
      {/* Knuckles */}
      <circle cx="15" cy="215" r="4" fill="#ddd" stroke="#999" strokeWidth="1" />
      <circle cx="125" cy="215" r="4" fill="#ddd" stroke="#999" strokeWidth="1" />
      {/* Wheels rear */}
      <rect x="2" y="195" width="26" height="42" rx="4" fill="#e8e8e8" stroke="#999" strokeWidth="1.5" />
      <rect x="112" y="195" width="26" height="42" rx="4" fill="#e8e8e8" stroke="#999" strokeWidth="1.5" />
      <circle cx="15" cy="216" r="7" fill="none" stroke="#bbb" strokeWidth="1" />
      <circle cx="125" cy="216" r="7" fill="none" stroke="#bbb" strokeWidth="1" />

      {/* "Rear" label */}
      <text x="70" y="248" textAnchor="middle" fill="#999" fontSize="9" fontWeight="700" fontFamily="DM Sans">Rear</text>
    </svg>
  )
}

// ─── Visual measurement section with diagram ───
function MeasurementVisual({ title, readings, oemSpec }) {
  const fl = readings?.front_left || {}, fr = readings?.front_right || {}
  const rl = readings?.rear_left || {}, rr = readings?.rear_right || {}
  const fCamberSpec = getSpecForReading(oemSpec, 'front_left', 'camber')
  const fToeSpec = getSpecForReading(oemSpec, 'front_left', 'toe')
  const rCamberSpec = getSpecForReading(oemSpec, 'rear_left', 'camber')
  const rToeSpec = getSpecForReading(oemSpec, 'rear_left', 'toe')
  const casterSpec = getSpecForSummary(oemSpec, 'left_caster')
  const fTotalSpec = getSpecForSummary(oemSpec, 'front_total_toe')
  const rTotalSpec = getSpecForSummary(oemSpec, 'rear_total_toe')
  const thrustSpec = getSpecForSummary(oemSpec, 'thrust_angle')
  const steerSpec = getSpecForSummary(oemSpec, 'steer_ahead')

  const specRange = (spec) => spec?.min && spec?.max ? `${spec.min} to ${spec.max}` : ''
  const labelSm = { fontSize: '9px', fontWeight: '700', color: R.dim, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '1px' }

  function ReadingBlock({ label, value, spec }) {
    const sc = statusColor(value, spec)
    return (
      <div style={{ marginBottom: '5px' }}>
        <div style={labelSm}>{label}</div>
        <div style={{
          padding: '3px 8px', borderRadius: '4px', display: 'inline-block',
          background: sc.bg, border: `1.5px solid ${sc.border}`,
          fontFamily: R.mono, fontWeight: '700', fontSize: '13px', color: sc.text,
        }}>
          {value || '—'}{value ? '°' : ''}
        </div>
        <SpecBar value={value} spec={spec} />
        <div style={{ fontSize: '8px', color: R.dim, marginTop: '1px' }}>{specRange(spec)}</div>
      </div>
    )
  }

  function CenterBadge({ label, value, spec }) {
    const sc = statusColor(value, spec)
    return (
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <div style={{
          display: 'inline-block', padding: '3px 12px', borderRadius: '4px',
          background: sc.bg, border: `1.5px solid ${sc.border}`,
          fontFamily: R.mono, fontWeight: '700', fontSize: '12px', color: sc.text,
        }}>
          {value || '—'}{value ? '°' : ''}
        </div>
        <div style={{ fontSize: '9px', color: R.dim, marginTop: '1px', fontWeight: '600' }}>{label}</div>
      </div>
    )
  }

  const frontTotalToe = totalValue(fl.toe, fr.toe, readings?.front_total_toe)
  const rearTotalToe = totalValue(rl.toe, rr.toe, readings?.rear_total_toe)

  return (
    <div style={{ background: R.card, border: `1px solid ${R.border}`, borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
      <h3 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 12px', color: R.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h3>

      {/* ── Desktop: 3-column with diagram (hidden on mobile via CSS) ── */}
      <div className="report-visual-desktop">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 0', minWidth: '120px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: R.text, marginBottom: '6px' }}>Left Front</div>
            <ReadingBlock label="Camber" value={fl.camber} spec={fCamberSpec} />
            <ReadingBlock label="Caster" value={readings?.left_caster} spec={casterSpec} />
            <ReadingBlock label="Toe" value={fl.toe} spec={fToeSpec} />
          </div>
          <div style={{ flex: '0 0 160px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CenterBadge label="Total Toe" value={frontTotalToe} spec={fTotalSpec} />
            <CenterBadge label="Steer Ahead" value={readings?.steer_ahead} spec={steerSpec} />
            <SuspensionSvg />
            <CenterBadge label="Total Toe" value={rearTotalToe} spec={rTotalSpec} />
            <CenterBadge label="Thrust Angle" value={readings?.thrust_angle} spec={thrustSpec} />
          </div>
          <div style={{ flex: '1 1 0', minWidth: '120px', textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: R.text, marginBottom: '6px' }}>Right Front</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <ReadingBlock label="Camber" value={fr.camber} spec={fCamberSpec} />
              <ReadingBlock label="Caster" value={readings?.right_caster} spec={casterSpec} />
              <ReadingBlock label="Toe" value={fr.toe} spec={fToeSpec} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginTop: '-80px' }}>
          <div style={{ flex: '1 1 0', minWidth: '120px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: R.text, marginBottom: '6px' }}>Left Rear</div>
            <ReadingBlock label="Camber" value={rl.camber} spec={rCamberSpec} />
            <ReadingBlock label="Toe" value={rl.toe} spec={rToeSpec} />
          </div>
          <div style={{ flex: '0 0 160px' }} />
          <div style={{ flex: '1 1 0', minWidth: '120px', textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: R.text, marginBottom: '6px' }}>Right Rear</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <ReadingBlock label="Camber" value={rr.camber} spec={rCamberSpec} />
              <ReadingBlock label="Toe" value={rr.toe} spec={rToeSpec} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile: stacked 2x2 grid + center badges (hidden on desktop via CSS) ── */}
      <div className="report-visual-mobile">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: R.text, marginBottom: '6px' }}>Left Front</div>
            <ReadingBlock label="Camber" value={fl.camber} spec={fCamberSpec} />
            <ReadingBlock label="Caster" value={readings?.left_caster} spec={casterSpec} />
            <ReadingBlock label="Toe" value={fl.toe} spec={fToeSpec} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: R.text, marginBottom: '6px' }}>Right Front</div>
            <ReadingBlock label="Camber" value={fr.camber} spec={fCamberSpec} />
            <ReadingBlock label="Caster" value={readings?.right_caster} spec={casterSpec} />
            <ReadingBlock label="Toe" value={fr.toe} spec={fToeSpec} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', margin: '10px 0', padding: '8px 0', borderTop: `1px solid ${R.border}`, borderBottom: `1px solid ${R.border}` }}>
          <CenterBadge label="Front Total Toe" value={frontTotalToe} spec={fTotalSpec} />
          <CenterBadge label="Steer Ahead" value={readings?.steer_ahead} spec={steerSpec} />
          <CenterBadge label="Rear Total Toe" value={rearTotalToe} spec={rTotalSpec} />
          <CenterBadge label="Thrust Angle" value={readings?.thrust_angle} spec={thrustSpec} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: R.text, marginBottom: '6px' }}>Left Rear</div>
            <ReadingBlock label="Camber" value={rl.camber} spec={rCamberSpec} />
            <ReadingBlock label="Toe" value={rl.toe} spec={rToeSpec} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: R.text, marginBottom: '6px' }}>Right Rear</div>
            <ReadingBlock label="Camber" value={rr.camber} spec={rCamberSpec} />
            <ReadingBlock label="Toe" value={rr.toe} spec={rToeSpec} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Detailed table (KDS-style) ───
function DetailedTable({ before, after, oemSpec }) {
  const fCamberSpec = getSpecForReading(oemSpec, 'front_left', 'camber')
  const fToeSpec = getSpecForReading(oemSpec, 'front_left', 'toe')
  const rCamberSpec = getSpecForReading(oemSpec, 'rear_left', 'camber')
  const rToeSpec = getSpecForReading(oemSpec, 'rear_left', 'toe')
  const casterSpec = getSpecForSummary(oemSpec, 'left_caster')
  const fTotalSpec = getSpecForSummary(oemSpec, 'front_total_toe')
  const rTotalSpec = getSpecForSummary(oemSpec, 'rear_total_toe')
  const thrustSpec = getSpecForSummary(oemSpec, 'thrust_angle')

  const th = { padding: '7px 10px', fontSize: '10px', fontWeight: '700', color: R.dim, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `2px solid ${R.border}`, textAlign: 'center', background: '#fafafa' }
  const td = { padding: '6px 10px', fontSize: '12px', borderBottom: `1px solid ${R.border}`, fontFamily: R.mono, textAlign: 'center', fontWeight: '600', color: R.text }

  function Td({ value, spec }) {
    const sc = statusColor(value, spec)
    return <td style={{ ...td, background: sc.bg, color: sc.text }}>{value || '—'}</td>
  }

  function specStr(spec) { return spec?.preferred ? `${spec.preferred}° [${spec.min} | ${spec.max}]` : '—' }

  function Row({ label, side, bv, av, spec }) {
    return (
      <tr>
        <td style={{ ...td, textAlign: 'left', fontFamily: 'inherit', fontWeight: side ? '400' : '600', paddingLeft: side ? '24px' : '10px', color: R.text }}>{side || label}</td>
        <Td value={bv} spec={spec} />
        <td style={{ ...td, color: R.dim, fontSize: '10px' }}>{specStr(spec)}</td>
        <Td value={av} spec={spec} />
      </tr>
    )
  }

  const bfl = before?.front_left || {}, bfr = before?.front_right || {}, brl = before?.rear_left || {}, brr = before?.rear_right || {}
  const afl = after?.front_left || {}, afr = after?.front_right || {}, arl = after?.rear_left || {}, arr = after?.rear_right || {}

  return (
    <div style={{ background: R.card, border: `1px solid ${R.border}`, borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${R.border}` }}>
        <h3 style={{ fontSize: '13px', fontWeight: '700', margin: 0, color: R.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detailed Alignment Data</h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Measurement</th>
              <th style={{ ...th, color: R.amber }}>Initial</th>
              <th style={th}>Target Data</th>
              <th style={{ ...th, color: R.green }}>Final</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={4} style={{ padding: '8px 10px', fontSize: '11px', fontWeight: '800', color: R.accent, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `2px solid ${R.border}`, background: '#fafafa' }}>Front Axle</td></tr>
            <Row label="Camber" side="left" bv={bfl.camber} av={afl.camber} spec={fCamberSpec} />
            <Row side="right" bv={bfr.camber} av={afr.camber} spec={fCamberSpec} />
            <Row label="Cross Camber" bv={crossValue(bfl.camber, bfr.camber)} av={crossValue(afl.camber, afr.camber)} />
            <Row label="Caster" side="left" bv={before?.left_caster} av={after?.left_caster} spec={casterSpec} />
            <Row side="right" bv={before?.right_caster} av={after?.right_caster} spec={casterSpec} />
            <Row label="Cross Caster" bv={crossValue(before?.left_caster, before?.right_caster)} av={crossValue(after?.left_caster, after?.right_caster)} />
            <Row label="Ind. Toe" side="left" bv={bfl.toe} av={afl.toe} spec={fToeSpec} />
            <Row side="right" bv={bfr.toe} av={afr.toe} spec={fToeSpec} />
            <Row label="Total Toe" bv={totalValue(bfl.toe, bfr.toe, before?.front_total_toe)} av={totalValue(afl.toe, afr.toe, after?.front_total_toe)} spec={fTotalSpec} />
            <Row label="Steer Ahead" bv={before?.steer_ahead} av={after?.steer_ahead} />

            <tr><td colSpan={4} style={{ padding: '8px 10px', fontSize: '11px', fontWeight: '800', color: R.accent, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `2px solid ${R.border}`, background: '#fafafa' }}>Rear Axle</td></tr>
            <Row label="Camber" side="left" bv={brl.camber} av={arl.camber} spec={rCamberSpec} />
            <Row side="right" bv={brr.camber} av={arr.camber} spec={rCamberSpec} />
            <Row label="Cross Camber" bv={crossValue(brl.camber, brr.camber)} av={crossValue(arl.camber, arr.camber)} />
            <Row label="Ind. Toe" side="left" bv={brl.toe} av={arl.toe} spec={rToeSpec} />
            <Row side="right" bv={brr.toe} av={arr.toe} spec={rToeSpec} />
            <Row label="Total Toe" bv={totalValue(brl.toe, brr.toe, before?.rear_total_toe)} av={totalValue(arl.toe, arr.toe, after?.rear_total_toe)} spec={rTotalSpec} />
            <Row label="Thrust Angle" bv={before?.thrust_angle} av={after?.thrust_angle} spec={thrustSpec} />
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
        .eq('id', id).single()
      if (error) throw error
      setReport(data)
    } catch (err) { console.error('Load report error:', err) }
    finally { setLoading(false) }
  }

  async function handleDownloadPDF() {
    if (!reportRef.current) return
    setGenerating(true)
    try {
      const canvas = await html2canvas(reportRef.current, { backgroundColor: '#f5f5f7', scale: 2, useCORS: true, logging: false })
      const imgData = canvas.toDataURL('image/png')
      const imgW = 210, imgH = (canvas.height * imgW) / canvas.width
      const pdf = new jsPDF('p', 'mm', 'a4')
      let y = 0
      while (y < imgH) { if (y > 0) pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, -y, imgW, imgH); y += 297 }
      const veh = report.vehicles
      pdf.save(`alignment-report-${veh?.year}-${veh?.make}-${veh?.model}-${new Date(report.created_at).toISOString().split('T')[0]}.pdf`)
    } catch (err) { console.error('PDF error:', err) }
    finally { setGenerating(false) }
  }

  function handleEmail() {
    if (!report) return
    const v = report.vehicles, c = report.customers
    const subject = encodeURIComponent(`Wheel Alignment Report — ${v?.year} ${v?.make} ${v?.model}`)
    const body = encodeURIComponent(
      `Hi ${c?.name},\n\nPlease find your wheel alignment report attached.\n\n` +
      `Vehicle: ${v?.year} ${v?.make} ${v?.model}${v?.trim ? ' ' + v.trim : ''}\n` +
      `${v?.vin ? 'VIN: ' + v.vin + '\n' : ''}` +
      `Date: ${new Date(report.created_at).toLocaleDateString()}\nTechnician: ${report.technician_name}\n\n` +
      `Thank you for choosing our service!`
    )
    window.open(`mailto:${c?.email || ''}?subject=${subject}&body=${body}`, '_blank')
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-dim)' }}>Loading report...</div>
  if (!report) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-dim)' }}>Report not found.</div>

  const v = report.vehicles || {}, c = report.customers || {}
  const oemSpec = report.oem_spec || {}
  const before = report.before_readings || emptyReadings()
  const after = report.after_readings || emptyReadings()

  return (
    <div className="animate-in">
      {/* Toolbar (app-themed, not in PDF) */}
      <div className="no-print report-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <Link to="/reports" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--c-text-dim)', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
          <IconBack /> All Reports
        </Link>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--c-border)', background: 'var(--c-surface)', color: 'var(--c-text)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            <IconPrint /> Print
          </button>
          <button onClick={handleDownloadPDF} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'var(--c-blue)', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: generating ? 'wait' : 'pointer' }}>
            <IconDownload /> {generating ? 'Generating...' : 'Download PDF'}
          </button>
          <button onClick={handleEmail} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'var(--c-green)', color: '#000', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            <IconMail /> Email Customer
          </button>
        </div>
      </div>

      {/* ═══ Report content — always light theme, self-contained ═══ */}
      <div ref={reportRef} id="report-content" style={{
        background: R.bg, padding: '20px', borderRadius: '12px',
        fontFamily: "'DM Sans', sans-serif", color: R.text,
      }}>
        {/* Header */}
        <div style={{ background: R.card, border: `1px solid ${R.border}`, borderRadius: '10px', padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: R.accent, letterSpacing: '-0.5px' }}>AlignSpec</div>
            <div style={{ fontSize: '10px', color: R.dim, textTransform: 'uppercase', letterSpacing: '1px' }}>Wheel Alignment Report</div>
          </div>
          <div style={{
            padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
            background: report.status === 'completed' ? R.greenBg : R.amberBg,
            color: report.status === 'completed' ? R.green : R.amber,
          }}>
            {report.status === 'completed' ? 'Completed' : 'In Progress'}
          </div>
        </div>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <div style={{ background: R.card, border: `1px solid ${R.border}`, borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '9px', fontWeight: '700', color: R.dim, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Customer</div>
            <div style={{ fontWeight: '600', fontSize: '13px' }}>{c.name}</div>
            {c.email && <div style={{ fontSize: '11px', color: R.dim }}>{c.email}</div>}
            {c.phone && <div style={{ fontSize: '11px', color: R.dim }}>{c.phone}</div>}
          </div>
          <div style={{ background: R.card, border: `1px solid ${R.border}`, borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '9px', fontWeight: '700', color: R.dim, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Vehicle</div>
            <div style={{ fontWeight: '600', fontSize: '13px' }}>{v.year} {v.make} {v.model}</div>
            {v.trim && <div style={{ fontSize: '11px', color: R.dim }}>Trim: {v.trim}</div>}
            {v.vin && <div style={{ fontSize: '11px', color: R.dim }}>VIN: {v.vin}</div>}
            {v.license_plate && <div style={{ fontSize: '11px', color: R.dim }}>Plate: {v.license_plate}</div>}
            {v.mileage && <div style={{ fontSize: '11px', color: R.dim }}>Mileage: {v.mileage}</div>}
          </div>
          <div style={{ background: R.card, border: `1px solid ${R.border}`, borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '9px', fontWeight: '700', color: R.dim, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Service</div>
            <div style={{ fontSize: '11px', color: R.dim }}>Technician: <strong style={{ color: R.text }}>{report.technician_name}</strong></div>
            <div style={{ fontSize: '11px', color: R.dim, marginTop: '2px' }}>
              {new Date(report.created_at).toLocaleDateString()} {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '14px', marginBottom: '10px', padding: '0 4px' }}>
          {[{ c: R.green, l: 'Within spec' }, { c: R.amber, l: 'Approaching limit' }, { c: R.red, l: 'Out of spec' }].map(i => (
            <div key={i.l} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: R.dim }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: i.c }} />{i.l}
            </div>
          ))}
        </div>

        {/* Visual: Before */}
        <MeasurementVisual title="Before Measurements (Initial)" readings={before} oemSpec={oemSpec} />

        {/* Visual: After */}
        <MeasurementVisual title="After Measurements (Final)" readings={after} oemSpec={oemSpec} />

        {/* Detailed table */}
        <DetailedTable before={before} after={after} oemSpec={oemSpec} />

        {/* Notes */}
        {report.notes && (
          <div style={{ background: R.card, border: `1px solid ${R.border}`, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '9px', fontWeight: '700', color: R.dim, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Notes</div>
            <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: R.text, whiteSpace: 'pre-wrap' }}>{report.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '10px', color: R.dim, padding: '10px', borderTop: `1px solid ${R.border}` }}>
          Generated by AlignSpec · {new Date(report.created_at).toLocaleDateString()} · ID: {report.id?.slice(0, 8)}
        </div>
      </div>
    </div>
  )
}
