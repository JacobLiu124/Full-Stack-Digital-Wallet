import { useState } from 'react';
import Modal from './Modal.jsx';
import { useAuth } from '../lib/AuthContext.jsx';
import { getAccounts, getBankLinkToken, confirmBankConnection } from '../lib/api.js';
import { changePassword } from '../lib/api.js';

const SECTION = {
  IDENTITY: 'identity',
  SECURITY: 'security',
  BANK: 'bank',
  DANGER: 'danger',
};

export default function ProfileModal({ onClose, accounts, onRefreshAccounts }) {
  const { user, logout } = useAuth();
  const [section, setSection] = useState(SECTION.IDENTITY);

  const tabs = [
    { id: SECTION.IDENTITY, label: 'Profile',  icon: <PersonIcon /> },
    { id: SECTION.SECURITY, label: 'Security', icon: <LockIcon /> },
    { id: SECTION.BANK,     label: 'Bank',     icon: <BankIcon /> },
    { id: SECTION.DANGER,   label: 'Danger',   icon: <WarnIcon /> },
  ];

  return (
    <Modal title="Account" onClose={onClose}>
      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24,
        padding: '14px 16px', background: 'var(--bg-3)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'white',
          flexShrink: 0,
        }}>{user?.name?.[0]?.toUpperCase()}</div>
        <div>
          <p style={{ fontWeight: 600, fontSize: 15 }}>{user?.name}</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>@{user?.username}</p>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Balance</p>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
            ${Number(user?.balance || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20,
        background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', padding: 4,
      }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setSection(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, padding: '8px 4px', borderRadius: 6, fontSize: 11, fontWeight: 500,
            color: section === t.id ? 'var(--text)' : 'var(--text-3)',
            background: section === t.id ? 'var(--bg-4)' : 'transparent',
            transition: 'all 0.15s',
          }}>
            <span style={{ color: section === t.id ? 'var(--accent-2)' : 'var(--text-3)' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      {section === SECTION.IDENTITY && <IdentitySection user={user} />}
      {section === SECTION.SECURITY && <SecuritySection />}
      {section === SECTION.BANK     && <BankSection accounts={accounts} onRefresh={onRefreshAccounts} />}
      {section === SECTION.DANGER   && <DangerSection logout={logout} onClose={onClose} />}
    </Modal>
  );
}

// ── Identity ──────────────────────────────────────────────────────────────────
function IdentitySection({ user }) {
  const fields = [
    { label: 'Full name',  value: user?.name },
    { label: 'Username',   value: `@${user?.username}` },
    { label: 'Email',      value: user?.email },
    { label: 'Phone',      value: user?.phone },
    { label: 'Member since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {fields.map(({ label, value }) => (
        <div key={label} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 14px', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)', marginBottom: 2,
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{value || '—'}</span>
        </div>
      ))}
      <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: 8 }}>
        To update your details, contact support.
      </p>
    </div>
  );
}

// ── Security ──────────────────────────────────────────────────────────────────
function SecuritySection() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validatePassword = (pwd) => {
    const errors = [];
    if (pwd.length < 8)      errors.push('At least 8 characters');
    if (!/[A-Z]/.test(pwd))  errors.push('At least 1 uppercase letter');
    if (!/[0-9]/.test(pwd))  errors.push('At least 1 number');
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.current) return setError('Enter your current password');
    const pwdErrors = validatePassword(form.next);
    if (pwdErrors.length > 0) return setError(pwdErrors.join(' · '));
    if (form.next !== form.confirm) return setError('New passwords do not match');
    setLoading(true);
    try {
      await changePassword({ currentPassword: form.current, newPassword: form.next });
      setSuccess('Password changed successfully');
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const has8     = form.next.length >= 8;
  const hasUpper = /[A-Z]/.test(form.next);
  const hasNum   = /[0-9]/.test(form.next);
  const score    = [has8, hasUpper, hasNum].filter(Boolean).length;
  const barColor = score === 1 ? 'var(--red)' : score === 2 ? 'var(--yellow)' : 'var(--green)';

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <FieldInput label="Current password" type="password" value={form.current} onChange={set('current')} placeholder="••••••••" />
      <FieldInput label="New password"     type="password" value={form.next}    onChange={set('next')}    placeholder="••••••••" />

      {/* Strength meter */}
      {form.next.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1,2,3].map((i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= score ? barColor : 'var(--bg-4)',
                transition: 'background 0.2s',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[[has8,'8+ characters'],[hasUpper,'1 uppercase'],[hasNum,'1 number']].map(([met, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 12 12">
                  {met
                    ? <path d="M2 6l3 3 5-5" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    : <circle cx="6" cy="6" r="2" fill="var(--text-3)"/>}
                </svg>
                <span style={{ fontSize: 12, color: met ? 'var(--green)' : 'var(--text-3)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <FieldInput label="Confirm new password" type="password" value={form.confirm} onChange={set('confirm')} placeholder="••••••••" />

      {error   && <p style={{ fontSize: 13, color: 'var(--red)',   background: 'var(--red-bg)',   border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>{error}</p>}
      {success && <p style={{ fontSize: 13, color: 'var(--green)', background: 'var(--green-bg)', border: '1px solid rgba(74,222,128,0.2)',  borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>{success}</p>}

      <button type="submit" disabled={loading} style={{
        padding: 13, background: 'var(--accent)', color: 'white', fontSize: 14,
        fontWeight: 600, borderRadius: 'var(--radius-sm)', opacity: loading ? 0.6 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44,
      }}>
        {loading
          ? <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
          : 'Change password'}
      </button>
    </form>
  );
}

// ── Bank ──────────────────────────────────────────────────────────────────────
function BankSection({ accounts, onRefresh }) {
  const [linking, setLinking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const handleAddBank = async () => {
    setError(''); setLinking(true);
    try {
      const { data } = await getBankLinkToken();
      if (data.url) {
        const popup = window.open(data.url, 'basiq-consent', 'width=480,height=700,left=400,top=100');
        const interval = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(interval);
            setLinking(false); setConfirming(true);
            try {
              await confirmBankConnection();
              await onRefresh();
            } catch {
              setError('Could not verify connection. Try again.');
            } finally {
              setConfirming(false);
            }
          }
        }, 600);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start bank link');
      setLinking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Connected accounts */}
      {accounts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <p style={sectionLabel}>Connected accounts</p>
          {accounts.map((acc, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 14px', background: 'var(--bg-3)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{acc.institution}</p>
                <p style={{ fontSize: 12, color: 'var(--text-2)' }}>{acc.name} · {acc.type}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
                  ${acc.balance.toFixed(2)}
                </p>
                <p style={{ fontSize: 11, color: 'var(--green)' }}>Connected</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          padding: '20px', textAlign: 'center', background: 'var(--bg-3)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          color: 'var(--text-2)', fontSize: 13,
        }}>
          No bank accounts connected yet
        </div>
      )}

      {error && <p style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>{error}</p>}

      {/* Add bank button */}
      <button onClick={handleAddBank} disabled={linking || confirming} style={{
        padding: 13, background: 'var(--bg-4)', color: 'var(--text)', fontSize: 14,
        fontWeight: 600, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-bright)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: (linking || confirming) ? 0.6 : 1, minHeight: 44,
      }}>
        {linking    && <Spinner />}
        {confirming && <Spinner />}
        {!linking && !confirming && <BankIcon />}
        {linking ? 'Opening bank portal…' : confirming ? 'Verifying…' : accounts.length > 0 ? 'Connect another bank' : 'Connect a bank'}
      </button>

      <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
        Secured by Basiq · ASIC CDR accredited · Multiple banks supported
      </p>
    </div>
  );
}

// ── Danger ────────────────────────────────────────────────────────────────────
function DangerSection({ logout, onClose }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '14px', background: 'var(--red-bg)',
        border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius)',
      }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>Delete account</p>
        <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
          This will permanently delete your account, transaction history, and disconnect all banks. This cannot be undone.
        </p>
      </div>

      {!confirming ? (
        <button onClick={() => setConfirming(true)} style={{
          padding: 13, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 14,
          fontWeight: 600, borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(248,113,113,0.3)', minHeight: 44,
        }}>
          Delete my account
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center' }}>Are you sure? This is permanent.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConfirming(false)} style={{
              flex: 1, padding: 13, background: 'var(--bg-4)', color: 'var(--text)',
              fontSize: 14, fontWeight: 600, borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-bright)', minHeight: 44,
            }}>Cancel</button>
            <button onClick={() => { logout(); onClose(); }} style={{
              flex: 1, padding: 13, background: 'var(--red)', color: 'white',
              fontSize: 14, fontWeight: 600, borderRadius: 'var(--radius-sm)',
              border: 'none', minHeight: 44,
            }}>Yes, delete</button>
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
        <button onClick={logout} style={{
          width: '100%', padding: 13, background: 'transparent', color: 'var(--text-2)',
          fontSize: 14, fontWeight: 500, borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)', minHeight: 44,
        }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────
function FieldInput({ label, ...props }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      <input className="auth-input" autoComplete="new-password" {...props} />
    </label>
  );
}

function Spinner() {
  return <span style={{ width:16, height:16, border:'2px solid var(--border-bright)', borderTopColor:'var(--text)', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />;
}

const sectionLabel = { fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 };

// ── Icons ─────────────────────────────────────────────────────────────────────
function PersonIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function LockIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
}
function BankIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>;
}
function WarnIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><triangle/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}