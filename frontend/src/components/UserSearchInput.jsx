import { useState, useEffect, useRef } from 'react';
import { searchUsers } from '../lib/api.js';

export default function UserSearchInput({ value, onChange, onSelect }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (value.length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await searchUsers(value);
        setResults(data.users || []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, [value]);

  const select = (user) => {
    onSelect(user);
    setOpen(false);
    setResults([]);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-3)', fontSize: 15, fontWeight: 500, pointerEvents: 'none',
        }}>@</span>
        <input
          className="auth-input"
          style={{ paddingLeft: 26 }}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="username"
          autoComplete="off"
        />
        {loading && (
          <span style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 14, height: 14, border: '2px solid var(--border-bright)',
            borderTopColor: 'var(--accent)', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite', display: 'inline-block',
          }} />
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-3)', border: '1px solid var(--border-bright)',
          borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow)',
          zIndex: 200, overflow: 'hidden',
        }}>
          {results.map((u) => (
            <button
              key={u.username}
              type="button"
              onClick={() => select(u)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', textAlign: 'left',
                borderBottom: '1px solid var(--border)', transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-4)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--accent)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, fontWeight: 700,
                fontFamily: 'var(--font-display)', flexShrink: 0,
              }}>{u.name?.[0]?.toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>@{u.username}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{u.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && !loading && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-3)', border: '1px solid var(--border-bright)',
          borderRadius: 'var(--radius-sm)', padding: '12px 14px', zIndex: 200,
          fontSize: 13, color: 'var(--text-3)',
        }}>No users found</div>
      )}
    </div>
  );
}
