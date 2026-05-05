'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('login')       // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')

      } else {
        // Sign up via our backend so the profile row is created
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, full_name: fullName }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setDone(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={styles.page}>
        <div className="card" style={styles.card}>
          <h2 style={styles.heading}>Check your email</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8 }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to log in.
          </p>
          <button className="btn btn-ghost" style={{ marginTop: 20, width: '100%' }} onClick={() => { setMode('login'); setDone(false) }}>
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div className="card" style={styles.card}>

        {/* Logo / wordmark */}
        <div style={styles.logo}>
          <span style={styles.logoIcon}>◈</span>
          <span style={styles.logoText}>Wallet</span>
        </div>

        {/* Tab toggle */}
        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }} onClick={() => { setMode('login'); setError('') }}>
            Log in
          </button>
          <button style={{ ...styles.tab, ...(mode === 'signup' ? styles.tabActive : {}) }} onClick={() => { setMode('signup'); setError('') }}>
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'signup' && (
            <div>
              <label className="label">Full name</label>
              <input className="input" type="text" placeholder="Jane Smith" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'} value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'signup' ? 8 : undefined} />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  logoIcon: {
    fontSize: 28,
    color: 'var(--accent)',
  },
  logoText: {
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: '-0.5px',
  },
  heading: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 8,
  },
  tabs: {
    display: 'flex',
    gap: 4,
    background: 'var(--bg)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    padding: '8px 0',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--muted)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: 'var(--surface)',
    color: 'var(--text)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
}
