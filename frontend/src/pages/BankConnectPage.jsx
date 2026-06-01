import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { getBankLinkToken, confirmBankConnection } from '../lib/api.js';

export default function BankConnectPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('intro'); // intro | linking | confirming | done
  const [error, setError] = useState('');

  const startBankLink = async () => {
    setError('');
    setStep('linking');
    try {
      const { data } = await getBankLinkToken();
      if (data.url) {
        // Open Basiq consent UI in a popup
        const popup = window.open(data.url, 'basiq-consent', 'width=480,height=700,left=400,top=100');

        // Poll for popup closure
        const interval = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(interval);
            setStep('confirming');
            try {
              await confirmBankConnection();
              await refreshUser();
              navigate('/dashboard');
            } catch {
              setError('Bank connection could not be verified. Please try again.');
              setStep('intro');
            }
          }
        }, 600);
      } else {
        throw new Error('No link URL returned');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start bank connection');
      setStep('intro');
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24, background: 'var(--bg)',
    }}>
      <div style={{
        maxWidth: 460, width: '100%', background: 'var(--bg-2)',
        border: '1px solid var(--border-bright)', borderRadius: 'var(--radius-lg)',
        padding: '48px 40px', animation: 'fadeIn 0.4s ease',
      }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, background: 'var(--bg-4)',
          borderRadius: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'center', marginBottom: 28,
          boxShadow: '0 0 0 1px var(--border-bright)',
        }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect x="4" y="10" width="28" height="20" rx="4" stroke="var(--accent)" strokeWidth="2" />
            <path d="M4 16h28" stroke="var(--accent)" strokeWidth="2" />
            <circle cx="11" cy="23" r="2" fill="var(--accent)" />
          </svg>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
          marginBottom: 10, letterSpacing: '-0.02em',
        }}>Connect your bank</h1>

        <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.65, marginBottom: 12 }}>
          Hey <strong style={{ color: 'var(--text)' }}>{user?.name?.split(' ')[0]}</strong> 👋<br />
          To send and receive money, you need to connect a bank account via our secure partner Basiq.
        </p>

        <ul style={{
          listStyle: 'none', display: 'flex', flexDirection: 'column',
          gap: 10, marginBottom: 32, marginTop: 20,
        }}>
          {[
            ['Read-only access', 'We only read your balance — we never store credentials'],
            ['Bank-grade security', 'Powered by Basiq, an ASIC-licensed data recipient'],
            ['Instant setup', 'Takes under 2 minutes with your internet banking details'],
          ].map(([title, desc]) => (
            <li key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                flexShrink: 0, width: 22, height: 22, background: 'var(--green-bg)',
                border: '1px solid rgba(74,222,128,0.2)', borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 1,
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 1 }}>{desc}</div>
              </div>
            </li>
          ))}
        </ul>

        {error && (
          <div style={{
            padding: '10px 14px', background: 'var(--red-bg)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 'var(--radius-sm)', color: 'var(--red)',
            fontSize: 13, marginBottom: 16,
          }}>{error}</div>
        )}

        <button
          onClick={startBankLink}
          disabled={step === 'linking' || step === 'confirming'}
          style={{
            width: '100%', padding: 14, background: 'var(--accent)',
            color: 'white', fontSize: 15, fontWeight: 600,
            borderRadius: 'var(--radius-sm)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: (step === 'linking' || step === 'confirming') ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {step === 'linking' && <>
            <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
            Opening bank portal…
          </>}
          {step === 'confirming' && <>
            <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
            Verifying connection…
          </>}
          {(step === 'intro' || step === 'done') && 'Connect bank account →'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--text-3)' }}>
          Secured by Basiq · ASIC CDR accredited
        </p>
      </div>
    </div>
  );
}
