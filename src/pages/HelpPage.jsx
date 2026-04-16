// ─── FILE: src/pages/HelpPage.jsx ─────────────────────────────────
// PURPOSE: Help & Support page with training links, support ticket
//          form, and contact information per Aligntech spec.
// DEPENDENCIES: React, supabase (for ticket storage)
// CALLED BY: React Router in src/main.jsx

import { useState } from 'react'
import { supabase } from '../supabase.js'

// ─── Icons ───
const IconHelp = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IconPlay = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
const IconMail = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>
const IconPhone = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
const IconSend = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IconBook = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
const IconCheck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconExternal = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>

const sectionStyle = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-border)',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '16px',
}

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1.5px solid var(--c-border)',
  borderRadius: '7px', fontSize: '14px', fontFamily: 'inherit',
  background: 'var(--c-input-bg)', color: 'var(--c-text)', outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--c-text-dim)',
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px',
}

// Aligntech training course modules
const trainingModules = [
  { num: 1, title: 'Introduction to Wheel Alignment' },
  { num: 2, title: 'Understanding Camber' },
  { num: 3, title: 'Understanding Caster' },
  { num: 4, title: 'Understanding Toe' },
  { num: 5, title: 'Reading OEM Specifications' },
  { num: 6, title: 'Using the Aligntech Unit' },
  { num: 7, title: 'Calibration Procedures' },
  { num: 8, title: 'Field Diagnostic Workflow' },
  { num: 9, title: 'Interpreting Reports' },
  { num: 10, title: 'Advanced Troubleshooting' },
]

export default function HelpPage() {
  const techName = localStorage.getItem('technicianName') || ''
  const [ticketForm, setTicketForm] = useState({ name: techName, email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleTicketSubmit = async (e) => {
    e.preventDefault()
    if (!ticketForm.name || !ticketForm.email || !ticketForm.subject || !ticketForm.message) return

    setSending(true)
    try {
      // Store ticket in Supabase for tracking; also send via mailto as fallback
      await supabase.from('support_tickets').insert({
        name: ticketForm.name,
        email: ticketForm.email,
        subject: ticketForm.subject,
        message: ticketForm.message,
        status: 'open',
      })

      // Open mailto as direct routing to support@aligntechusa.com
      const mailBody = encodeURIComponent(
        `Name: ${ticketForm.name}\nEmail: ${ticketForm.email}\n\n${ticketForm.message}`
      )
      const mailSubject = encodeURIComponent(`[Support] ${ticketForm.subject}`)
      window.open(`mailto:support@aligntechusa.com?subject=${mailSubject}&body=${mailBody}`, '_self')

      setSent(true)
      setTicketForm({ name: techName, email: '', subject: '', message: '' })
    } catch {
      // Even if Supabase fails, still trigger the mailto
      const mailBody = encodeURIComponent(
        `Name: ${ticketForm.name}\nEmail: ${ticketForm.email}\n\n${ticketForm.message}`
      )
      const mailSubject = encodeURIComponent(`[Support] ${ticketForm.subject}`)
      window.open(`mailto:support@aligntechusa.com?subject=${mailSubject}&body=${mailBody}`, '_self')
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="animate-in" style={{ maxWidth: '800px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ color: 'var(--c-amber)' }}><IconHelp /></span>
          <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Help & Support</h1>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--c-text-dim)', lineHeight: 1.5 }}>
          Training resources, documentation, and direct support for your Aligntech unit.
        </p>
      </div>

      {/* ─── Training Course ─── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ color: 'var(--c-green)' }}><IconBook /></span>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Aligntech Training Course</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--c-text-dim)', marginBottom: '16px', lineHeight: 1.5 }}>
          Complete the 10-part online training course to master wheel alignment diagnostics with your Aligntech unit.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {trainingModules.map((mod) => (
            <div key={mod.num} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 14px', borderRadius: '8px',
              background: 'var(--c-surface-raised)', border: '1px solid var(--c-border)',
            }}>
              <span style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'var(--c-amber-dim)', color: 'var(--c-amber)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, flexShrink: 0,
              }}>
                {mod.num}
              </span>
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}>{mod.title}</span>
              <span style={{ color: 'var(--c-text-dim)', fontSize: '11px' }}><IconPlay /></span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── YouTube Training Playlists ─── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ color: 'var(--c-red)' }}><IconPlay /></span>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Video Training Playlists</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--c-text-dim)', marginBottom: '16px', lineHeight: 1.5 }}>
          Watch our YouTube playlists for step-by-step visual guides.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { title: 'Getting Started', desc: 'Setup and first diagnostic' },
            { title: 'Calibration Guide', desc: 'Unit calibration procedures' },
            { title: 'Advanced Diagnostics', desc: 'Complex alignment scenarios' },
            { title: 'Report Interpretation', desc: 'Understanding your results' },
          ].map((playlist) => (
            <div key={playlist.title} style={{
              padding: '14px', borderRadius: '8px', border: '1px solid var(--c-border)',
              background: 'var(--c-surface-raised)', cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--c-amber)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--c-border)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>{playlist.title}</span>
                <IconExternal />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--c-text-dim)' }}>{playlist.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Support Ticket Form ─── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ color: 'var(--c-amber)' }}><IconMail /></span>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Submit a Support Ticket</h2>
        </div>

        {sent ? (
          <div className="animate-in" style={{
            textAlign: 'center', padding: '30px 20px',
            background: 'var(--c-green-dim)', borderRadius: '10px',
            border: '1px solid var(--c-green)',
          }}>
            <span style={{ color: 'var(--c-green)', marginBottom: '8px', display: 'block' }}><IconCheck /></span>
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--c-green)', marginBottom: '6px' }}>
              Ticket Submitted
            </p>
            <p style={{ fontSize: '13px', color: 'var(--c-text-dim)' }}>
              Our support team will respond to your request shortly.
            </p>
            <button onClick={() => setSent(false)} style={{
              marginTop: '14px', padding: '8px 20px', border: '1px solid var(--c-border)',
              borderRadius: '8px', background: 'var(--c-surface)', color: 'var(--c-text)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Submit Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Your Name *</label>
                <input type="text" required value={ticketForm.name}
                  onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                  placeholder="John Smith" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email Address *</label>
                <input type="email" required value={ticketForm.email}
                  onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                  placeholder="john@example.com" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Subject *</label>
              <input type="text" required value={ticketForm.subject}
                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                placeholder="Brief description of your issue" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Message *</label>
              <textarea required rows={4} value={ticketForm.message}
                onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                placeholder="Describe your issue in detail..."
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <button type="submit" disabled={sending} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px 24px', border: 'none', borderRadius: '8px',
              background: 'var(--c-amber)', color: '#1a1a1a',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              opacity: sending ? 0.6 : 1, transition: 'opacity 0.2s',
            }}>
              <IconSend /> {sending ? 'Sending...' : 'Submit Ticket'}
            </button>
          </form>
        )}
      </div>

      {/* ─── Contact Information ─── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ color: 'var(--c-purple)' }}><IconPhone /></span>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Contact Us</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{
            padding: '16px', borderRadius: '10px', background: 'var(--c-surface-raised)',
            border: '1px solid var(--c-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <IconMail />
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Email Support</span>
            </div>
            <a href="mailto:support@aligntechusa.com" style={{
              fontSize: '14px', color: 'var(--c-amber)', textDecoration: 'none', fontWeight: 600,
            }}>
              support@aligntechusa.com
            </a>
          </div>
          <div style={{
            padding: '16px', borderRadius: '10px', background: 'var(--c-surface-raised)',
            border: '1px solid var(--c-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <IconPhone />
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Phone Support</span>
            </div>
            <a href="tel:+18005551234" style={{
              fontSize: '14px', color: 'var(--c-amber)', textDecoration: 'none', fontWeight: 600,
            }}>
              1-800-555-1234
            </a>
          </div>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--c-text-dim)', marginTop: '12px', lineHeight: 1.5 }}>
          Support hours: Monday - Friday, 8:00 AM - 5:00 PM EST.
          For urgent issues outside business hours, email us and we'll respond first thing next business day.
        </p>
      </div>
    </div>
  )
}
