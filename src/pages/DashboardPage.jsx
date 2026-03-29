import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase.js'

const IconPlus = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconReport = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
const IconCar = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h8l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2M5 17v1a1 1 0 001 1h1a1 1 0 001-1v-1m8 0v1a1 1 0 001 1h1a1 1 0 001-1v-1"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>

const statCard = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-border)',
  borderRadius: '14px',
  padding: '20px 24px',
  flex: '1 1 200px',
}

export default function DashboardPage() {
  const techName = localStorage.getItem('technicianName') || ''
  const [stats, setStats] = useState({ total: 0, today: 0, inProgress: 0 })
  const [recentReports, setRecentReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [allRes, todayRes, progressRes, recentRes] = await Promise.all([
        supabase.from('alignment_reports').select('id', { count: 'exact', head: true })
          .eq('technician_name', techName),
        supabase.from('alignment_reports').select('id', { count: 'exact', head: true })
          .eq('technician_name', techName)
          .gte('created_at', todayStart.toISOString()),
        supabase.from('alignment_reports').select('id', { count: 'exact', head: true })
          .eq('technician_name', techName)
          .eq('status', 'in_progress'),
        supabase.from('alignment_reports')
          .select('id, created_at, status, vehicles(year, make, model), customers(name)')
          .eq('technician_name', techName)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      setStats({
        total: allRes.count || 0,
        today: todayRes.count || 0,
        inProgress: progressRes.count || 0,
      })
      setRecentReports(recentRes.data || [])
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-in">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          Welcome back, {techName}
        </h1>
        <p style={{ color: 'var(--c-text-dim)', margin: 0, fontSize: '15px' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <Link to="/new-report" style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '16px 28px', background: 'var(--c-amber)', color: '#000',
          borderRadius: '12px', textDecoration: 'none', fontWeight: '700', fontSize: '15px',
        }}>
          <IconPlus /> New Alignment Report
        </Link>
        <Link to="/reports" style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '16px 28px', background: 'var(--c-surface)', color: 'var(--c-text)',
          border: '1px solid var(--c-border)', borderRadius: '12px',
          textDecoration: 'none', fontWeight: '600', fontSize: '15px',
        }}>
          <IconReport /> View All Reports
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <div style={statCard}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Reports</div>
          <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '4px' }}>{loading ? '—' : stats.total}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today</div>
          <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '4px', color: 'var(--c-green)' }}>{loading ? '—' : stats.today}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>In Progress</div>
          <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '4px', color: 'var(--c-amber)' }}>{loading ? '—' : stats.inProgress}</div>
        </div>
      </div>

      {/* Recent Reports */}
      <div style={{
        background: 'var(--c-surface)', border: '1px solid var(--c-border)',
        borderRadius: '14px', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Recent Reports</h2>
          <Link to="/reports" style={{ fontSize: '13px', color: 'var(--c-amber)', textDecoration: 'none', fontWeight: '600' }}>View all →</Link>
        </div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-dim)' }}>Loading...</div>
        ) : recentReports.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-dim)' }}>
            <IconCar />
            <p style={{ marginTop: '12px' }}>No reports yet. Start your first alignment report!</p>
          </div>
        ) : (
          <div>
            {recentReports.map(report => (
              <Link key={report.id} to={`/reports/${report.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', borderBottom: '1px solid var(--c-border)',
                textDecoration: 'none', color: 'var(--c-text)',
              }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    {report.vehicles?.year} {report.vehicles?.make} {report.vehicles?.model}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--c-text-dim)', marginTop: '2px' }}>
                    {report.customers?.name} · {new Date(report.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                  background: report.status === 'completed' ? 'var(--c-green-dim)' : 'var(--c-amber-dim)',
                  color: report.status === 'completed' ? 'var(--c-green)' : 'var(--c-amber)',
                }}>
                  {report.status === 'completed' ? 'Completed' : 'In Progress'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
