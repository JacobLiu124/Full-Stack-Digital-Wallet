import styles from './BalanceCard.module.css';

export default function BalanceCard({ user, accounts, onRefresh, refreshing }) {
  const balance = user?.balance ?? 0;

  return (
    <div className={styles.card}>
      <div className={styles.glow} />

      <div className={styles.top}>
        <div>
          <p className={styles.label}>Total balance</p>
          <p className={styles.balance}>
            <span className={styles.currency}>AUD</span>
            <span className={styles.amount}>{balance.toFixed(2)}</span>
          </p>
        </div>
        <button
          className={`${styles.refresh} ${refreshing ? styles.spinning : ''}`}
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh bank data"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23,4 23,10 17,10"/>
            <polyline points="1,20 1,14 7,14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
      </div>

      <p className={styles.username}>@{user?.username}</p>

      {accounts.length > 0 && (
        <div className={styles.accounts}>
          {accounts.map((acc, i) => (
            <div key={i} className={styles.account}>
              <span className={styles.accountName}>{acc.institution} · {acc.name}</span>
              <span className={styles.accountBalance}>${acc.balance.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
