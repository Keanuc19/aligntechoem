import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase.js'

const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>

const inputStyle = {
  padding: '10px 14px 10px 40px',
  background: 'var(--c-input-bg)', border: '1.5px solid var(--c-border)',
  borderRadius: '10px', color: 'var(--c-text)', fontSize: '14px', fontFamily: 'inherit',
  width: '100%', maxWidth: '400px',
}

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all, completed, in_progress

  useEffect(() => { loadReports() }, [])

  async function loadReports() {
    try {
      const { data, error } = await supabase.from('alignment_reports')
        .select('id, created_at, updated_at, status, technician_name, notes, vehicles(year, make, model, trim, vin, license_plate), customers(name, email, phone)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setReports(data || [])
    } catch (err) {
      console.error('Load reports error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = reports.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    if (!search.trim()) return true
    const s = search.toLowerCase()
    const v = r.vehicles
    const c = r.customers
    return (
      (c?.name || '').toLowerCase().includes(s) ||
      (v?.make || '').toLowerCase().includes(s) ||
      (v?.model || '').toLowerCase().includes(s) ||
      (v?.year || '').includes(s) ||
      (v?.vin || '').toLowerCase().includes(s) ||
      (v?.license_plate || '').toLowerCase().includes(s) ||
      (r.technician_name || '').toLowerCase().includes(s)
    )
  })

  return (
    <div className="animate-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          All Reports
        </h1>
        <p style={{ color: 'var(--c-text-dim)', fontSize: '14px', margin: 0 }}>
          {reports.length} total report{reports.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-dim)' }}>
            <IconSearch />
          </div>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer, vehicle, VIN..." style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'completed', label: 'Completed' },
            { key: 'in_progress', label: 'In Progress' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              background: filter === f.key ? 'var(--c-amber)' : 'var(--c-surface-raised)',
              color: filter === f.key ? '#000' : 'var(--c-text-dim)',
            }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports list */}
      <div style={{
        background: 'var(--c-surface)', border: '1px solid var(--c-border)',
        borderRadius: '14px', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-dim)' }}>Loading reports...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-dim)' }}>
            {search ? 'No reports match your search.' : 'No reports found.'}
            <div style={{ marginTop: '12px' }}>
              <Link to="/new-report" style={{ color: 'var(--c-amber)', textDecoration: 'none', fontWeight: '600' }}>
                Create your first report →
              </Link>
            </div>
          </div>
        ) : (
          filtered.map(report => (
            <Link key={report.id} to={`/reports/${report.id}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid var(--c-border)',
              textDecoration: 'none', color: 'var(--c-text)', transition: 'background 0.1s',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '15px' }}>
                  {report.vehicles?.year} {report.vehicles?.make} {report.vehicles?.model}
                  {report.vehicles?.trim && <span style={{ color: 'var(--c-text-dim)', fontWeight: '400' }}> — {report.vehicles.trim}</span>}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--c-text-dim)', marginTop: '3px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>{report.customers?.name}</span>
                  {report.vehicles?.license_plate && <span>Plate: {report.vehicles.license_plate}</span>}
                  <span>Tech: {report.technician_name}</span>
                  <span>{new Date(report.created_at).toLocaleDateString()} {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <span style={{
                padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', flexShrink: 0,
                background: report.status === 'completed' ? 'var(--c-green-dim)' : 'var(--c-amber-dim)',
                color: report.status === 'completed' ? 'var(--c-green)' : 'var(--c-amber)',
              }}>
                {report.status === 'completed' ? 'Completed' : 'In Progress'}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
