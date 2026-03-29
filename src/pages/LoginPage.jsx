import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  background: 'var(--c-input-bg)',
  border: '1.5px solid var(--c-border)',
  borderRadius: '10px',
  color: 'var(--c-text)',
  fontSize: '15px',
  fontFamily: 'inherit',
}

export default function LoginPage() {
  const [name, setName] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    localStorage.setItem('technicianName', trimmed)
    navigate('/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--c-bg)',
      padding: '20px',
    }}>
      <div className="animate-in" style={{
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'var(--c-amber-dim)', color: 'var(--c-amber)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: '800', marginBottom: '16px',
          }}>
            A
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            AlignSpec
          </h1>
          <p style={{ color: 'var(--c-text-dim)', fontSize: '14px', margin: 0 }}>
            Technician sign-in
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--c-text-dim)' }}>
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter your name"
            autoFocus
            style={inputStyle}
          />
          <button type="submit" disabled={!name.trim()} style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px',
            background: name.trim() ? 'var(--c-amber)' : 'var(--c-border)',
            color: name.trim() ? '#000' : 'var(--c-text-dim)',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: '700',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
          }}>
            Sign In
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a href="/specs" style={{ color: 'var(--c-text-dim)', fontSize: '13px', textDecoration: 'none' }}>
            Go to Spec Database →
          </a>
        </div>
      </div>
    </div>
  )
}
