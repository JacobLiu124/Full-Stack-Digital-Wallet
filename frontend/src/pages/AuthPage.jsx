import { useState } from 'react';
import { useAuth } from '../lib/AuthContext.jsx';
import { login as loginApi, register as registerApi } from '../lib/api.js';
import styles from './AuthPage.module.css';

export default function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', username: '', password: '',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validatePassword = (pwd) => {
    const errors = [];
    if (pwd.length < 8)           errors.push('Password must be at least 8 characters');
    if (!/[A-Z]/.test(pwd))       errors.push('Password must contain at least 1 uppercase letter');
    if (!/[0-9]/.test(pwd))       errors.push('Password must contain at least 1 number');
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      const pwdErrors = validatePassword(form.password);
      if (pwdErrors.length > 0) {
        setError(pwdErrors.join(' · '));
        return; // never reaches the backend
      }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const { data } = await registerApi(form);
        login(data.token, data.user);
      } else {
        const { data } = await loginApi({ username: form.username, password: form.password });
        login(data.token, data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Background mesh */}
      <div className={styles.mesh} aria-hidden="true">
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.blob3} />
      </div>

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="var(--accent)" />
            <path d="M10 18C10 13.5817 13.5817 10 18 10C20.5 10 22.75 11.1 24.25 12.875L20.5 14.75C19.75 14.0417 18.9167 13.6667 18 13.6667C15.6 13.6667 13.6667 15.6 13.6667 18C13.6667 20.4 15.6 22.3333 18 22.3333C18.9167 22.3333 19.75 21.9583 20.5 21.25L24.25 23.125C22.75 24.9 20.5 26 18 26C13.5817 26 10 22.4183 10 18Z" fill="white"/>
          </svg>
          <span className={styles.logoText}>cove</span>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >Sign in</button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >Create account</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} autoComplete="off">
          {mode === 'register' && (
            <>
              <Field label="Full name" type="text" value={form.name} onChange={set('name')} placeholder="Jane Smith" required />
              <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="jane@example.com" required />
              <Field label="Phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="+61400000000 no spaces" required />
            </>
          )}
          <Field label="Username" type="text" value={form.username} onChange={set('username')} placeholder="janesmith" autoComplete="off" required />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Password
              </span>
              <input
                className="auth-input"
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </label>

            {/* Only show strength meter on register */}
            {mode === 'register' && form.password.length > 0 && (
              <PasswordStrength password={form.password} />
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading
              ? <span className={styles.spinner} />
              : mode === 'login' ? 'Sign in' : 'Create account'
            }
          </button>
        </form>

        <p className={styles.tagline}>
          {mode === 'login'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            className={styles.switchLink}
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          >{mode === 'login' ? 'Create one' : 'Sign in'}</button>
        </p>
      </div>
    </div>
  );
}

function Field({ label, ...inputProps }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <input className="auth-input" {...inputProps} />
    </label>
  );
}

function PasswordStrength({ password }) {
  const has8    = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum   = /[0-9]/.test(password);
  const score    = [has8, hasUpper, hasNum].filter(Boolean).length;

  const barColor = score === 1 ? 'var(--red)'
                 : score === 2 ? 'var(--yellow)'
                 : 'var(--green)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Strength bars */}
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? barColor : 'var(--bg-4)',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>

      {/* Requirement checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {[
          [has8,    '8 or more characters'],
          [hasUpper,'1 uppercase letter'],
          [hasNum,  '1 number'],
        ].map(([met, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              {met
                ? <path d="M2 6l3 3 5-5" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                : <circle cx="6" cy="6" r="2" fill="var(--text-3)"/>
              }
            </svg>
            <span style={{ fontSize: 12, color: met ? 'var(--green)' : 'var(--text-3)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
