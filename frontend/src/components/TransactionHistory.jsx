import styles from './TransactionHistory.module.css';

const TYPE_CONFIG = {
  payment_sent:     { label: (u) => `You paid @${u}`,            sign: '-', color: 'var(--red)',    bg: 'var(--red-bg)'    },
  payment_received: { label: (u) => `You received from @${u}`,   sign: '+', color: 'var(--green)',  bg: 'var(--green-bg)'  },
  request_sent:     { label: (u) => `You requested from @${u}`,  sign: '',  color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
  request_received: { label: (u) => `@${u} requested from you`,  sign: '',  color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
};

const STATUS_BADGE = {
  pending:   { text: 'Pending',   style: { color: 'var(--yellow)', background: 'var(--yellow-bg)' } },
  completed: { text: 'Done',      style: { color: 'var(--green)',  background: 'var(--green-bg)'  } },
  declined:  { text: 'Declined',  style: { color: 'var(--red)',    background: 'var(--red-bg)'    } },
  failed:    { text: 'Failed',    style: { color: 'var(--red)',    background: 'var(--red-bg)'    } },
};

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return d.toLocaleDateString('en-AU', { weekday: 'short' });
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export default function TransactionHistory({ transactions, loading }) {
  return (
    <div className={styles.section}>
      <h2 className={styles.heading}>Activity</h2>

      {loading && (
        <div className={styles.empty}>
          {[1,2,3].map(i => (
            <div key={i} className={styles.skeleton} style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      )}

      {!loading && transactions.length === 0 && (
        <div className={styles.emptyState}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2"/>
            <line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
          <p>No transactions yet</p>
          <p>Send or request money to get started</p>
        </div>
      )}

      {!loading && transactions.length > 0 && (
        <div className={styles.list}>
          {transactions.map((tx) => {
            const cfg = TYPE_CONFIG[tx.type];
            const badge = STATUS_BADGE[tx.status];
            if (!cfg) return null;
            return (
              <div key={tx.id} className={styles.item}>
                <div className={styles.iconWrap} style={{ background: cfg.bg }}>
                  {tx.type === 'payment_sent' || tx.type === 'request_sent' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <polyline points="19,12 12,19 5,12"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="19" x2="12" y2="5"/>
                      <polyline points="5,12 12,5 19,12"/>
                    </svg>
                  )}
                </div>

                <div className={styles.info}>
                  <p className={styles.desc}>{cfg.label(tx.counterpart_username)}</p>
                  {tx.note && <p className={styles.note}>{tx.note}</p>}
                  <p className={styles.time}>{formatDate(tx.created_at)}</p>
                </div>

                <div className={styles.right}>
                  <p className={styles.amount} style={{ color: cfg.sign === '+' ? 'var(--green)' : cfg.sign === '-' ? 'var(--red)' : 'var(--text-2)' }}>
                    {cfg.sign}${tx.amount.toFixed(2)}
                  </p>
                  <span className={styles.badge} style={badge?.style}>
                    {badge?.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
