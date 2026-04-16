import { getReadingStatus, statusColors, getSpecForReading, getSpecForSummary, countStatuses } from '../utils/alignment.js'

// ─── Visual multipliers ───
const TOE_VISUAL_MULTIPLIER = 12
const CAMBER_PX_PER_DEGREE = 4 // pixels the top edge shifts per degree of camber
const THRUST_VISUAL_MULTIPLIER = 15

function toeRotation(toeValue, side) {
  const v = parseFloat(toeValue)
  if (isNaN(v)) return 0
  return v * TOE_VISUAL_MULTIPLIER * (side === 'left' ? 1 : -1)
}

function thrustAngleRotation(thrustValue) {
  const v = parseFloat(thrustValue)
  if (isNaN(v)) return 0
  return v * THRUST_VISUAL_MULTIPLIER
}

// ─── 3D Tire component: draws a tire with tread, sidewall, rim ───
// Camber tilts the tire by shifting the top edge (trapezoid), not skewing.
// Sidewall depth changes with camber to show the 3D lean.
function TireWheel({ cx, cy, w, h, toeDeg, camberVal, side, active }) {
  const camber = parseFloat(camberVal) || 0
  // Top edge offset: negative camber on left = top shifts toward center (right)
  const topShift = camber * CAMBER_PX_PER_DEGREE * (side === 'left' ? -1 : 1)
  // Sidewall depth visible from behind — base + camber adjustment
  const baseDepth = h * 0.08
  const camberDepth = camber * 1.2 * (side === 'left' ? 1 : -1)
  const sidewallD = Math.max(1, baseDepth + camberDepth)
  // Sidewall goes outward from the car (left = further left, right = further right)
  const swDir = side === 'left' ? -1 : 1

  const hw = w / 2, hh = h / 2
  const r = Math.min(w * 0.14, 7) // corner radius
  const stroke = active ? '#f0b429' : '#4a5568'

  // ── Tread face (top-down): trapezoid with rounded corners ──
  // Bottom stays fixed (on ground), top shifts with camber
  const tl = { x: cx - hw + topShift, y: cy - hh }
  const tr = { x: cx + hw + topShift, y: cy - hh }
  const br = { x: cx + hw, y: cy + hh }
  const bl = { x: cx - hw, y: cy + hh }

  const treadPath = [
    `M ${tl.x + r} ${tl.y}`,
    `L ${tr.x - r} ${tr.y}`,
    `Q ${tr.x} ${tr.y} ${tr.x} ${tr.y + r}`,
    `L ${br.x} ${br.y - r}`,
    `Q ${br.x} ${br.y} ${br.x - r} ${br.y}`,
    `L ${bl.x + r} ${bl.y}`,
    `Q ${bl.x} ${bl.y} ${bl.x} ${bl.y - r}`,
    `L ${tl.x} ${tl.y + r}`,
    `Q ${tl.x} ${tl.y} ${tl.x + r} ${tl.y}`,
    'Z',
  ].join(' ')

  // ── Sidewall face (the 3D depth visible from our angle) ──
  const swOuter = swDir * sidewallD
  const sidewallPath = [
    `M ${tl.x} ${tl.y}`,
    `L ${tl.x + swOuter} ${tl.y + sidewallD * 0.3}`,
    `L ${bl.x + swOuter} ${bl.y + sidewallD * 0.3}`,
    `L ${bl.x} ${bl.y}`,
    'Z',
  ].join(' ')

  // ── Tread grooves (lines across the tread face) ──
  const grooveCount = Math.floor(h / 10)
  const grooves = []
  for (let i = 1; i <= grooveCount; i++) {
    const t = i / (grooveCount + 1)
    const lx = bl.x + (tl.x - bl.x) * t
    const rx = br.x + (tr.x - br.x) * t
    const gy = bl.y + (tl.y - bl.y) * t
    grooves.push({ x1: lx + 3, x2: rx - 3, y: gy })
  }

  // ── Center groove (longitudinal) ──
  const centerTopX = (tl.x + tr.x) / 2
  const centerBotX = (bl.x + br.x) / 2

  // ── Rim position (follows camber tilt at center of wheel) ──
  const rimShift = topShift * 0.5
  const rimR = Math.min(w, h) * 0.22
  const hubR = rimR * 0.35
  const spokeR = rimR * 0.8

  return (
    <g transform={`rotate(${toeDeg}, ${cx}, ${cy})`}>
      {/* Contact patch shadow */}
      <ellipse cx={cx} cy={cy + hh + 2} rx={hw * 0.7} ry={2} fill="rgba(0,0,0,0.25)" />

      {/* Sidewall (3D depth face) */}
      <path d={sidewallPath} fill="#0a0c10" stroke={stroke} strokeWidth="1" opacity="0.6" />

      {/* Tire tread face */}
      <path d={treadPath} fill="#16191f" stroke={stroke} strokeWidth="2" />

      {/* Tread grooves */}
      {grooves.map((g, i) => (
        <line key={i} x1={g.x1} y1={g.y} x2={g.x2} y2={g.y}
          stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
      ))}
      {/* Center groove */}
      <line x1={centerTopX} y1={tl.y + 6} x2={centerBotX} y2={bl.y - 6}
        stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

      {/* Shoulder highlights (tire edges) */}
      <line x1={tl.x + 2} y1={tl.y + r} x2={bl.x + 2} y2={bl.y - r}
        stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
      <line x1={tr.x - 2} y1={tr.y + r} x2={br.x - 2} y2={br.y - r}
        stroke="rgba(255,255,255,0.05)" strokeWidth="2" />

      {/* Rim outer ring */}
      <circle cx={cx + rimShift} cy={cy} r={rimR}
        fill="#1c1f26" stroke="#555" strokeWidth="1.5" />

      {/* Rim spokes (5-spoke) */}
      {[0, 72, 144, 216, 288].map(angle => {
        const rad = (angle * Math.PI) / 180
        return (
          <line key={angle}
            x1={cx + rimShift} y1={cy}
            x2={cx + rimShift + Math.cos(rad) * spokeR}
            y2={cy + Math.sin(rad) * spokeR}
            stroke="#444" strokeWidth="1.2" strokeLinecap="round" />
        )
      })}

      {/* Hub cap */}
      <circle cx={cx + rimShift} cy={cy} r={hubR} fill="#3d4450" />
      {/* Lug nut center */}
      <circle cx={cx + rimShift} cy={cy} r={hubR * 0.35} fill="#555" />
    </g>
  )
}

// ─── Decimal stepper input with color coding ───
function StepperInput({ value, onChange, spec, readOnly, label }) {
  const status = getReadingStatus(value, spec)
  const colors = statusColors[status]
  const hasValue = value !== '' && value !== null && value !== undefined

  function step(delta) {
    if (readOnly) return
    const current = parseFloat(value) || 0
    const next = Math.round((current + delta) * 100) / 100
    onChange(next.toFixed(2))
  }

  function handleInput(e) {
    const raw = e.target.value
    // Allow empty, minus sign, or valid decimal patterns while typing
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') {
      onChange(raw)
      return
    }
    if (/^-?\d*\.?\d*$/.test(raw)) {
      onChange(raw)
    }
  }

  const borderColor = hasValue ? colors.border : 'var(--c-border)'
  const bgColor = hasValue ? colors.bg : 'var(--c-input-bg)'
  const textColor = hasValue ? colors.text : 'var(--c-text)'

  return (
    <div>
      {label && (
        <div style={{
          fontSize: '10px', fontWeight: '700', color: 'var(--c-text-dim)',
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px',
        }}>
          {label}
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'stretch',
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        overflow: 'hidden',
        background: bgColor,
        transition: 'all 0.2s ease',
      }}>
        <button onClick={() => step(-0.01)} disabled={readOnly} style={{
          width: '28px', border: 'none', background: 'rgba(255,255,255,0.05)',
          color: 'var(--c-text-dim)', fontSize: '14px', fontWeight: '700',
          cursor: readOnly ? 'default' : 'pointer', padding: 0,
          borderRight: `1px solid ${borderColor}`,
        }}>
          −
        </button>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleInput}
          readOnly={readOnly}
          placeholder="0.00"
          style={{
            flex: 1, width: '60px',
            padding: '7px 4px',
            border: 'none', outline: 'none',
            background: 'transparent',
            color: textColor,
            fontSize: '14px', fontWeight: '700',
            fontFamily: "'JetBrains Mono', monospace",
            textAlign: 'center',
          }}
        />
        <button onClick={() => step(0.01)} disabled={readOnly} style={{
          width: '28px', border: 'none', background: 'rgba(255,255,255,0.05)',
          color: 'var(--c-text-dim)', fontSize: '14px', fontWeight: '700',
          cursor: readOnly ? 'default' : 'pointer', padding: 0,
          borderLeft: `1px solid ${borderColor}`,
        }}>
          +
        </button>
      </div>
    </div>
  )
}

// ─── Wheel input group (camber + toe for one corner) ───
function WheelInputs({ tag, readings, oemSpec, onChange, readOnly }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '140px' }}>
      <StepperInput
        label="Camber"
        value={readings?.camber || ''}
        onChange={v => onChange('camber', v)}
        spec={getSpecForReading(oemSpec, tag, 'camber')}
        readOnly={readOnly}
      />
      <StepperInput
        label="Toe"
        value={readings?.toe || ''}
        onChange={v => onChange('toe', v)}
        spec={getSpecForReading(oemSpec, tag, 'toe')}
        readOnly={readOnly}
      />
    </div>
  )
}

// ─── Caster / Thrust angle card ───
function AngleCard({ label, value, onChange, spec, readOnly }) {
  const nomValue = spec?.preferred ? `${spec.preferred}°` : '—'
  const status = getReadingStatus(value, spec)
  const colors = statusColors[status]
  const hasValue = value !== '' && value !== null && value !== undefined

  function step(delta) {
    if (readOnly) return
    const current = parseFloat(value) || 0
    const next = Math.round((current + delta) * 100) / 100
    onChange(next.toFixed(2))
  }

  function handleInput(e) {
    const raw = e.target.value
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') { onChange(raw); return }
    if (/^-?\d*\.?\d*$/.test(raw)) onChange(raw)
  }

  const borderColor = hasValue ? colors.border : 'var(--c-border)'
  const bgColor = hasValue ? colors.bg : 'var(--c-input-bg)'
  const textColor = hasValue ? colors.text : 'var(--c-text)'

  return (
    <div style={{
      flex: '1 1 200px',
      background: 'var(--c-surface)',
      border: '1px solid var(--c-border)',
      borderRadius: '12px',
      padding: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </div>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: hasValue ? colors.border : 'var(--c-border)',
          transition: 'all 0.2s',
        }} />
      </div>
      <div style={{
        display: 'flex', alignItems: 'stretch',
        border: `2px solid ${borderColor}`,
        borderRadius: '10px', overflow: 'hidden',
        background: bgColor, transition: 'all 0.2s ease',
      }}>
        <button onClick={() => step(-0.01)} disabled={readOnly} style={{
          width: '36px', border: 'none', background: 'rgba(255,255,255,0.05)',
          color: 'var(--c-text-dim)', fontSize: '18px', fontWeight: '700',
          cursor: readOnly ? 'default' : 'pointer', padding: 0,
          borderRight: `1px solid ${borderColor}`,
        }}>−</button>
        <input type="text" inputMode="decimal" value={value} onChange={handleInput}
          readOnly={readOnly} placeholder="0.00"
          style={{
            flex: 1, padding: '12px 8px', border: 'none', outline: 'none',
            background: 'transparent', color: textColor,
            fontSize: '22px', fontWeight: '700',
            fontFamily: "'JetBrains Mono', monospace", textAlign: 'center',
          }}
        />
        <button onClick={() => step(0.01)} disabled={readOnly} style={{
          width: '36px', border: 'none', background: 'rgba(255,255,255,0.05)',
          color: 'var(--c-text-dim)', fontSize: '18px', fontWeight: '700',
          cursor: readOnly ? 'default' : 'pointer', padding: 0,
          borderLeft: `1px solid ${borderColor}`,
        }}>+</button>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--c-text-dim)', marginTop: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
        nom: {nomValue}
      </div>
    </div>
  )
}

// ─── OEM Reference sidebar ───
function OemReferencePanel({ oemSpec }) {
  const rows = [
    { label: 'FL/FR Camber', spec: oemSpec?.front?.camber },
    { label: 'RL/RR Camber', spec: oemSpec?.rear?.camber },
    { label: 'Front Toe', spec: oemSpec?.front?.individualToe },
    { label: 'Rear Toe', spec: oemSpec?.rear?.individualToe },
    { label: 'Caster', spec: oemSpec?.front?.caster },
    { label: 'Thrust', spec: oemSpec?.thrustAngle },
  ]

  return (
    <div style={{
      background: 'var(--c-surface)',
      border: '1px solid var(--c-border)',
      borderRadius: '14px',
      padding: '20px',
      minWidth: '220px',
    }}>
      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
        OEM Reference
      </div>
      {rows.map((row, i) => (
        <div key={row.label} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 0',
          borderBottom: i < rows.length - 1 ? '1px solid var(--c-border)' : 'none',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--c-text-dim)' }}>{row.label}</span>
          <span style={{
            fontSize: '14px', fontWeight: '600',
            fontFamily: "'JetBrains Mono', monospace",
            color: row.spec?.preferred ? 'var(--c-amber)' : 'var(--c-text-dim)',
          }}>
            {row.spec?.preferred ? `${row.spec.preferred}°` : '—'}
          </span>
        </div>
      ))}

      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--c-border)' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
          Color Key
        </div>
        {[
          { color: 'var(--c-green)', label: 'Within OEM spec' },
          { color: 'var(--c-amber)', label: 'Approaching limit' },
          { color: 'var(--c-red)', label: 'Out of spec' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: 'var(--c-text-dim)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 3D Perspective Chassis SVG (45° behind, drone following view) ───
function ChassisSvg({ readings }) {
  const thrustRot = thrustAngleRotation(readings?.thrust_angle)

  function isActive(wheelKey) {
    const toe = readings?.[wheelKey]?.toe
    const camber = readings?.[wheelKey]?.camber
    return (toe !== '' && toe !== undefined) || (camber !== '' && camber !== undefined)
  }

  return (
    <svg width="480" height="440" viewBox="0 0 480 440" fill="none" style={{ display: 'block' }}>
      <defs>
        <radialGradient id="shadow" cx="50%" cy="55%" r="45%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.15)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="240" cy="310" rx="200" ry="60" fill="url(#shadow)" />

      {/* ══════ FRAME RAILS (converge toward front) ══════ */}
      <line x1="160" y1="90" x2="110" y2="380" stroke="#4a5568" strokeWidth="4" strokeLinecap="round" />
      <line x1="320" y1="90" x2="370" y2="380" stroke="#4a5568" strokeWidth="4" strokeLinecap="round" />

      {/* Crossmembers */}
      <rect x="148" y="92" width="184" height="7" rx="2" fill="#374151" stroke="#4a5568" strokeWidth="1" />
      <rect x="98" y="370" width="284" height="9" rx="2.5" fill="#374151" stroke="#4a5568" strokeWidth="1" />
      <line x1="140" y1="200" x2="340" y2="200" stroke="#3d4450" strokeWidth="3" strokeLinecap="round" />
      <line x1="125" y1="290" x2="355" y2="290" stroke="#3d4450" strokeWidth="3" strokeLinecap="round" />

      {/* ══════ FRONT SUSPENSION ══════ */}
      <line x1="155" y1="85" x2="90" y2="78" stroke="#5a6577" strokeWidth="2" strokeLinecap="round" />
      <line x1="155" y1="105" x2="90" y2="112" stroke="#5a6577" strokeWidth="2" strokeLinecap="round" />
      <line x1="325" y1="85" x2="390" y2="78" stroke="#5a6577" strokeWidth="2" strokeLinecap="round" />
      <line x1="325" y1="105" x2="390" y2="112" stroke="#5a6577" strokeWidth="2" strokeLinecap="round" />
      <circle cx="90" cy="95" r="5" fill="#2d3748" stroke="#5a6577" strokeWidth="1.5" />
      <circle cx="390" cy="95" r="5" fill="#2d3748" stroke="#5a6577" strokeWidth="1.5" />

      {/* Steering rack + tie rods */}
      <rect x="130" y="118" width="220" height="4" rx="2" fill="#6b7280" />
      <line x1="135" y1="120" x2="90" y2="100" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="345" y1="120" x2="390" y2="100" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />

      {/* ══════ REAR SUSPENSION ══════ */}
      <line x1="120" y1="320" x2="52" y2="375" stroke="#5a6577" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="115" y1="385" x2="52" y2="378" stroke="#5a6577" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="360" y1="320" x2="428" y2="375" stroke="#5a6577" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="365" y1="385" x2="428" y2="378" stroke="#5a6577" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="52" cy="377" r="6" fill="#2d3748" stroke="#5a6577" strokeWidth="1.5" />
      <circle cx="428" cy="377" r="6" fill="#2d3748" stroke="#5a6577" strokeWidth="1.5" />
      <line x1="52" y1="377" x2="428" y2="377" stroke="#5a6577" strokeWidth="3" strokeLinecap="round" />
      <line x1="90" y1="95" x2="390" y2="95" stroke="#5a6577" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />

      {/* Springs */}
      <path d="M112 80 Q117 76 112 72 Q107 68 112 64" stroke="#4a9" strokeWidth="1.5" fill="none" opacity="0.4" />
      <path d="M368 80 Q373 76 368 72 Q363 68 368 64" stroke="#4a9" strokeWidth="1.5" fill="none" opacity="0.4" />
      <path d="M80 366 Q85 362 80 358 Q75 354 80 350" stroke="#4a9" strokeWidth="1.5" fill="none" opacity="0.4" />
      <path d="M400 366 Q405 362 400 358 Q395 354 400 350" stroke="#4a9" strokeWidth="1.5" fill="none" opacity="0.4" />

      {/* Thrust angle line */}
      <g transform={`rotate(${thrustRot}, 240, 377)`}>
        <line x1="240" y1="377" x2="240" y2="60" stroke="var(--c-blue)" strokeWidth="1.5" strokeDasharray="8 4" opacity="0.6" />
        <polygon points="240,60 235,72 245,72" fill="var(--c-blue)" opacity="0.6" />
      </g>

      {/* Center line */}
      <line x1="240" y1="50" x2="240" y2="420" stroke="#3d4450" strokeWidth="1" strokeDasharray="6 4" opacity="0.2" />

      {/* ══════ TIRES (3D with camber tilt) ══════ */}

      {/* Front Left — smaller (farther away) */}
      <TireWheel cx={68} cy={95} w={40} h={66}
        toeDeg={toeRotation(readings?.front_left?.toe, 'left')}
        camberVal={readings?.front_left?.camber} side="left"
        active={isActive('front_left')} />

      {/* Front Right */}
      <TireWheel cx={412} cy={95} w={40} h={66}
        toeDeg={toeRotation(readings?.front_right?.toe, 'right')}
        camberVal={readings?.front_right?.camber} side="right"
        active={isActive('front_right')} />

      {/* Rear Left — larger (closer) */}
      <TireWheel cx={28} cy={377} w={52} h={84}
        toeDeg={toeRotation(readings?.rear_left?.toe, 'left')}
        camberVal={readings?.rear_left?.camber} side="left"
        active={isActive('rear_left')} />

      {/* Rear Right */}
      <TireWheel cx={452} cy={377} w={52} h={84}
        toeDeg={toeRotation(readings?.rear_right?.toe, 'right')}
        camberVal={readings?.rear_right?.camber} side="right"
        active={isActive('rear_right')} />

      {/* ══════ LABELS ══════ */}
      <text x="68" y="48" textAnchor="middle" fill="var(--c-text-dim)" fontSize="11" fontWeight="700" fontFamily="DM Sans">FL</text>
      <text x="412" y="48" textAnchor="middle" fill="var(--c-text-dim)" fontSize="11" fontWeight="700" fontFamily="DM Sans">FR</text>
      <text x="28" y="434" textAnchor="middle" fill="var(--c-text-dim)" fontSize="13" fontWeight="700" fontFamily="DM Sans">RL</text>
      <text x="452" y="434" textAnchor="middle" fill="var(--c-text-dim)" fontSize="13" fontWeight="700" fontFamily="DM Sans">RR</text>

      {/* Front indicator */}
      <polygon points="240,22 234,34 246,34" fill="var(--c-amber)" opacity="0.8" />
      <text x="240" y="16" textAnchor="middle" fill="var(--c-amber)" fontSize="11" fontWeight="700" fontFamily="DM Sans" opacity="0.8">FRONT</text>
    </svg>
  )
}

// ─── Main VehicleDiagram component ───
export default function VehicleDiagram({ readings, oemSpec, onChange, readOnly = false, title }) {
  const counts = countStatuses(readings, oemSpec)

  function handleWheelChange(wheel, field, value) {
    if (readOnly) return
    onChange({ ...readings, [wheel]: { ...readings[wheel], [field]: value } })
  }

  function handleFieldChange(field, value) {
    if (readOnly) return
    onChange({ ...readings, [field]: value })
  }

  return (
    <div>
      {title && (
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--c-amber)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>
          {title}
        </h3>
      )}

      {/* Status badges */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { count: counts.green, label: 'In Spec', color: 'var(--c-green)', bg: 'var(--c-green-dim)' },
          { count: counts.orange, label: 'Minor Adj.', color: 'var(--c-amber)', bg: 'var(--c-amber-dim)' },
          { count: counts.red, label: 'Critical', color: 'var(--c-red)', bg: 'var(--c-red-dim)' },
        ].map(b => (
          <div key={b.label} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '20px',
            border: `1px solid ${b.color}`, background: b.bg,
            fontSize: '13px', fontWeight: '700', color: b.color,
          }}>
            {b.count} <span style={{ fontWeight: '400' }}>{b.label}</span>
          </div>
        ))}
      </div>

      {/* Main layout: diagram center + OEM reference right */}
      <div className="diagram-layout" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Diagram panel */}
        <div style={{
          flex: 1,
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          borderRadius: '14px',
          padding: '20px',
          overflow: 'hidden',
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Vehicle Diagram — Enter Values at Each Corner
          </div>

          {/* ── Desktop layout: inputs flanking the SVG ── */}
          <div className="diagram-inputs-desktop" style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
              <div style={{ flexShrink: 0, paddingTop: '35px' }}>
                <WheelInputs tag="front_left" readings={readings?.front_left} oemSpec={oemSpec}
                  onChange={(f, v) => handleWheelChange('front_left', f, v)} readOnly={readOnly} />
              </div>
              <div className="diagram-svg-wrap" style={{ flexShrink: 0 }}>
                <ChassisSvg readings={readings} />
              </div>
              <div style={{ flexShrink: 0, paddingTop: '35px' }}>
                <WheelInputs tag="front_right" readings={readings?.front_right} oemSpec={oemSpec}
                  onChange={(f, v) => handleWheelChange('front_right', f, v)} readOnly={readOnly} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-115px', paddingBottom: '10px' }}>
              <div style={{ flexShrink: 0 }}>
                <WheelInputs tag="rear_left" readings={readings?.rear_left} oemSpec={oemSpec}
                  onChange={(f, v) => handleWheelChange('rear_left', f, v)} readOnly={readOnly} />
              </div>
              <div style={{ width: '480px', flexShrink: 0 }} />
              <div style={{ flexShrink: 0 }}>
                <WheelInputs tag="rear_right" readings={readings?.rear_right} oemSpec={oemSpec}
                  onChange={(f, v) => handleWheelChange('rear_right', f, v)} readOnly={readOnly} />
              </div>
            </div>
          </div>

          {/* ── Mobile layout: 2x2 grid of wheel inputs (no SVG) ── */}
          <div className="diagram-inputs-mobile" style={{ display: 'none' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--c-amber)', marginBottom: '6px' }}>Front Left</div>
              <WheelInputs tag="front_left" readings={readings?.front_left} oemSpec={oemSpec}
                onChange={(f, v) => handleWheelChange('front_left', f, v)} readOnly={readOnly} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--c-amber)', marginBottom: '6px' }}>Front Right</div>
              <WheelInputs tag="front_right" readings={readings?.front_right} oemSpec={oemSpec}
                onChange={(f, v) => handleWheelChange('front_right', f, v)} readOnly={readOnly} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--c-amber)', marginBottom: '6px' }}>Rear Left</div>
              <WheelInputs tag="rear_left" readings={readings?.rear_left} oemSpec={oemSpec}
                onChange={(f, v) => handleWheelChange('rear_left', f, v)} readOnly={readOnly} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--c-amber)', marginBottom: '6px' }}>Rear Right</div>
              <WheelInputs tag="rear_right" readings={readings?.rear_right} oemSpec={oemSpec}
                onChange={(f, v) => handleWheelChange('rear_right', f, v)} readOnly={readOnly} />
            </div>
          </div>
        </div>

        {/* OEM Reference */}
        <div className="oem-panel">
          <OemReferencePanel oemSpec={oemSpec} />
        </div>
      </div>

      {/* Caster & Thrust Angle */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--c-amber)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          Caster & Thrust Angle
        </div>
        <div className="caster-row" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <AngleCard label="Left Caster" value={readings?.left_caster || ''}
            onChange={v => handleFieldChange('left_caster', v)}
            spec={getSpecForSummary(oemSpec, 'left_caster')} readOnly={readOnly} />
          <AngleCard label="Right Caster" value={readings?.right_caster || ''}
            onChange={v => handleFieldChange('right_caster', v)}
            spec={getSpecForSummary(oemSpec, 'right_caster')} readOnly={readOnly} />
          <AngleCard label="Thrust Angle" value={readings?.thrust_angle || ''}
            onChange={v => handleFieldChange('thrust_angle', v)}
            spec={getSpecForSummary(oemSpec, 'thrust_angle')} readOnly={readOnly} />
          <AngleCard label="Steer Ahead" value={readings?.steer_ahead || ''}
            onChange={v => handleFieldChange('steer_ahead', v)}
            spec={getSpecForSummary(oemSpec, 'steer_ahead')} readOnly={readOnly} />
        </div>
      </div>
    </div>
  )
}
