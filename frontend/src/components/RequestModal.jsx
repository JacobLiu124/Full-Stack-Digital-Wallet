import { useState } from 'react';
import Modal from './Modal.jsx';
import UserSearchInput from './UserSearchInput.jsx';
import { requestMoney } from '../lib/api.js';

export default function RequestModal({ onClose, onSuccess }) {
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSelect = (user) => setUsername(user.username);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username) return setError('Please choose a user to request from');
    if (!amount || isNaN(amount) || Number(amount) <= 0) return setError('Enter a valid amount');
    setLoading(true);
    try {
      const { data } = await requestMoney({
        recipientUsername: username,
        amount: Number(amount),
        note,
      });
      setSuccess(data.message);
      setTimeout(() => onSuccess(), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Request money" onClose={onClose}>
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
            <span style={labelStyle}>Request from</span>
            <UserSearchInput value={username} onChange={setUsername} onSelect={handleSelect} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Amount (AUD)</span>
            <div style={{ position: 'relative' }}>
              <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text-2)', fontSize:16, fontWeight:600 }}>$</span>
              <input
                className="auth-input"
                style={{ paddingLeft: 28, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
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
              placeholder="What's it for?"
              maxLength={100}
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
              marginTop: 4, padding: 14, background: 'var(--green)', color: 'white',
              fontSize: 15, fontWeight: 600, borderRadius: 'var(--radius-sm)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading ? 0.6 : 1, minHeight: 46, transition: 'opacity 0.15s',
            }}
          >
            {loading ? (
              <span style={{ width:16, height:16, border:'2px solid var(--border-bright)', borderTopColor:'var(--text)', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
            ) : `Request${amount ? ` $${Number(amount).toFixed(2)}` : ''}${username ? ` from @${username}` : ''}`}
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