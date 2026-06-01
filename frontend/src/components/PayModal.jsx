import { useState } from 'react';
import Modal from './Modal.jsx';
import UserSearchInput from './UserSearchInput.jsx';
import { pay } from '../lib/api.js';

export default function PayModal({ onClose, onSuccess, prefill = null }) {
  const [username, setUsername] = useState(prefill?.username || '');
  const [amount, setAmount]     = useState(prefill?.amount ? String(prefill.amount) : '');
  const [note, setNote]         = useState(prefill?.note || '');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const isPrefilled = !!prefill;

  const handleSelect = (user) => {
    setUsername(user.username);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('PREFILL:', prefill);
    console.log('REFERENCE ID:', prefill?.referenceId);
    setError('');
    if (!username) return setError('Please choose a recipient');
    if (!amount || isNaN(amount) || Number(amount) <= 0) return setError('Enter a valid amount');
    setLoading(true);
    try {
      const { data } = await pay({ recipientUsername: username, amount: Number(amount), note: note, referenceId: prefill?.referenceId || null });
      setSuccess(data.message);
      setTimeout(() => onSuccess(), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Send money" onClose={onClose}>
      {success ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{
            width: 56, height: 56, background: 'var(--green-bg)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{success}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>To</span>
            {isPrefilled ? (
              <div style={{
                padding: '11px 14px', background: 'var(--bg-4)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                fontSize: 15, color: 'var(--text-2)',
              }}>
                @{username}
              </div>
            ) : (
              <UserSearchInput value={username} onChange={setUsername} onSelect={handleSelect} />
            )}
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Amount (AUD)</span>
            <div style={{ position: 'relative' }}>
              <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text-2)', fontSize:16, fontWeight:600 }}>$</span>
              <input
                className="auth-input"
                style={{
                  paddingLeft: 28, fontFamily: 'var(--font-display)',
                  fontWeight: 700, fontSize: 20,
                  opacity: isPrefilled ? 0.6 : 1,
                }}
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                readOnly={isPrefilled}
                required
              />
            </div>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Note (optional)</span>
            <input
              className="auth-input"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Dinner, coffee, etc."
              maxLength={100}
              readOnly={isPrefilled}
            />
          </label>

          {error && (
            <div style={{ padding:'10px 14px', background:'var(--red-bg)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:'var(--radius-sm)', color:'var(--red)', fontSize:13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4, padding: 14, background: 'var(--accent)', color: 'white',
              fontSize: 15, fontWeight: 600, borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading ? 0.6 : 1, minHeight: 46, transition: 'opacity 0.15s',
            }}
          >
            {loading ? (
              <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
            ) : isPrefilled
              ? `Pay @${username} $${Number(amount).toFixed(2)}`
              : `Pay${username ? ` @${username}` : ''}${amount ? ` $${Number(amount).toFixed(2)}` : ''}`
            }
          </button>
        </form>
      )}
    </Modal>
  );
}

const labelStyle = {
  fontSize: 12, fontWeight: 500, color: 'var(--text-2)',
  letterSpacing: '0.06em', textTransform: 'uppercase',
};