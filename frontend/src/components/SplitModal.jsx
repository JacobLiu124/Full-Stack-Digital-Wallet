import { useState } from 'react';
import Modal from './Modal.jsx';
import UserSearchInput from './UserSearchInput.jsx';
import { requestMoney } from '../lib/api.js';

const MAX_USERS = 30;

export default function SplitModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('even'); // 'even' | 'custom'
  const [totalAmount, setTotalAmount] = useState('');
  const [participants, setParticipants] = useState([
    { id: Date.now(), username: '', amount: '' }
  ]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null); // summary after sending

  const addParticipant = () => {
    if (participants.length >= MAX_USERS) return;
    setParticipants((p) => [...p, { id: Date.now(), username: '', amount: '' }]);
  };

  const removeParticipant = (id) => {
    if (participants.length === 1) return;
    setParticipants((p) => p.filter((x) => x.id !== id));
  };

  const updateParticipant = (id, field, value) => {
    setParticipants((p) =>
      p.map((x) => (x.id === id ? { ...x, [field]: value } : x))
    );
  };

  const selectUser = (id, user) => {
    updateParticipant(id, 'username', user.username);
  };

  // Even split amount per person
  const evenAmount = () => {
    const total = parseFloat(totalAmount);
    if (!total || participants.length === 0) return '0.00';
    return (total / participants.length).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate
    const filled = participants.filter((p) => p.username.trim());
    if (filled.length === 0) return setError('Add at least one person');

    // Check for duplicate usernames
    const usernames = filled.map((p) => p.username.toLowerCase());
    if (new Set(usernames).size !== usernames.length) {
      return setError('Duplicate usernames detected');
    }

    if (mode === 'even') {
      const total = parseFloat(totalAmount);
      if (!total || total <= 0) return setError('Enter a valid total amount');
    } else {
      const invalid = filled.some(
        (p) => !p.amount || isNaN(p.amount) || Number(p.amount) <= 0
      );
      if (invalid) return setError('Enter a valid amount for each person');
    }

    setLoading(true);

    const sent = [];
    const failed = [];

    for (const p of filled) {
      const amount = mode === 'even'
        ? parseFloat(evenAmount())
        : parseFloat(Number(p.amount).toFixed(2));

      try {
        await requestMoney({
          recipientUsername: p.username,
          amount,
          note: note || undefined,
        });
        sent.push({ username: p.username, amount });
      } catch (err) {
        failed.push({ username: p.username, error: err.response?.data?.error || 'Failed' });
      }
    }

    setLoading(false);
    setResults({ sent, failed });
  };

  const handleDone = () => {
    onSuccess();
  };

  // ── Results screen ───────────────────────────────────────────────────────────
  if (results) {
    return (
      <Modal title="Split sent" onClose={handleDone}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.sent.length > 0 && (
            <div>
              <p style={sectionLabel}>Requests sent</p>
              {results.sent.map(({ username, amount }) => (
                <div key={username} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: 'var(--green-bg)',
                  border: '1px solid rgba(74,222,128,0.2)',
                  borderRadius: 'var(--radius-sm)', marginBottom: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    <span style={{ fontSize: 14, color: 'var(--text)' }}>@{username}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--green)' }}>
                    ${amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {results.failed.length > 0 && (
            <div>
              <p style={{ ...sectionLabel, color: 'var(--red)' }}>Failed</p>
              {results.failed.map(({ username, error }) => (
                <div key={username} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: 'var(--red-bg)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 'var(--radius-sm)', marginBottom: 4,
                }}>
                  <span style={{ fontSize: 14, color: 'var(--text)' }}>@{username}</span>
                  <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={handleDone} style={{
            marginTop: 8, padding: 13, background: 'var(--yellow)', color: '#1a1000',
            fontSize: 15, fontWeight: 700, borderRadius: 'var(--radius-sm)',
            border: 'none', minHeight: 44,
          }}>Done</button>
        </div>
      </Modal>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────────
  return (
    <Modal title="Split bill" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', padding: 4, gap: 4 }}>
          {[['even', 'Split evenly'], ['custom', 'Custom amounts']].map(([val, label]) => (
            <button key={val} type="button" onClick={() => setMode(val)} style={{
              flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 500,
              borderRadius: 6, transition: 'all 0.15s',
              background: mode === val ? 'var(--bg-4)' : 'transparent',
              color: mode === val ? 'var(--text)' : 'var(--text-2)',
              boxShadow: mode === val ? 'var(--shadow-sm)' : 'none',
            }}>{label}</button>
          ))}
        </div>

        {/* Total amount — only for even split */}
        {mode === 'even' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Total amount (AUD)</span>
            <div style={{ position: 'relative' }}>
              <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text-2)', fontSize:16, fontWeight:600 }}>$</span>
              <input
                className="auth-input"
                style={{ paddingLeft: 28, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}
                type="number" min="0.01" step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            {totalAmount && participants.filter(p => p.username).length > 0 && (
              <p style={{ fontSize: 12, color: 'var(--yellow)', fontWeight: 500 }}>
                Each person will be requested ${evenAmount()}
              </p>
            )}
          </label>
        )}

        {/* Note */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={labelStyle}>Note (optional)</span>
          <input
            className="auth-input"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Dinner, trip, rent..."
            maxLength={100}
          />
        </label>

        {/* Participants */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>
              People ({participants.filter(p => p.username).length}/{MAX_USERS})
            </span>
            {participants.length < MAX_USERS && (
              <button type="button" onClick={addParticipant} style={{
                fontSize: 12, fontWeight: 600, color: 'var(--yellow)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add person
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto', paddingRight: 2 }}>
            {participants.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                {/* Row number */}
                <div style={{
                  width: 28, height: 42, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                  fontSize: 12, color: 'var(--text-3)', fontWeight: 600,
                }}>{i + 1}</div>

                {/* Username search */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <UserSearchInput
                    value={p.username}
                    onChange={(val) => updateParticipant(p.id, 'username', val)}
                    onSelect={(user) => selectUser(p.id, user)}
                  />
                </div>

                {/* Amount — custom mode only */}
                {mode === 'custom' && (
                  <div style={{ position: 'relative', width: 100, flexShrink: 0 }}>
                    <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-2)', fontSize:14, fontWeight:600 }}>$</span>
                    <input
                      className="auth-input"
                      style={{ paddingLeft: 22, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, height: 42 }}
                      type="number" min="0.01" step="0.01"
                      value={p.amount}
                      onChange={(e) => updateParticipant(p.id, 'amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                )}

                {/* Even split preview */}
                {mode === 'even' && totalAmount && (
                  <div style={{
                    width: 80, height: 42, display: 'flex', alignItems: 'center',
                    justifyContent: 'flex-end', flexShrink: 0,
                    fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
                    color: 'var(--yellow)',
                  }}>
                    ${evenAmount()}
                  </div>
                )}

                {/* Remove button */}
                {participants.length > 1 && (
                  <button type="button" onClick={() => removeParticipant(p.id)} style={{
                    width: 28, height: 42, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'var(--text-3)', flexShrink: 0,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-3)'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Custom mode total */}
        {mode === 'custom' && participants.some(p => p.amount) && (
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '10px 14px', background: 'var(--yellow-bg)',
            border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius-sm)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Total being requested</span>
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--yellow)' }}>
              ${participants.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toFixed(2)}
            </span>
          </div>
        )}

        {error && (
          <p style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} style={{
          padding: 14, background: 'var(--yellow)', color: '#1a1000',
          fontSize: 15, fontWeight: 700, borderRadius: 'var(--radius-sm)',
          border: 'none', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8,
          opacity: loading ? 0.7 : 1, minHeight: 46, transition: 'opacity 0.15s',
        }}>
          {loading ? (
            <>
              <span style={{ width:16, height:16, border:'2px solid rgba(0,0,0,0.2)', borderTopColor:'#1a1000', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
              Sending requests…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
              </svg>
              {mode === 'even' && totalAmount
                ? `Request $${evenAmount()} from ${participants.filter(p=>p.username).length || 0} people`
                : 'Send requests'}
            </>
          )}
        </button>
      </form>
    </Modal>
  );
}

const labelStyle = {
  fontSize: 12, fontWeight: 500, color: 'var(--text-2)',
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

const sectionLabel = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
};