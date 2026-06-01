import styles from './PendingRequestBanner.module.css';

export default function PendingRequestBanner({ request, onClick }) {
  return (
    <button className={styles.banner} onClick={onClick}>
      <div className={styles.left}>
        <div className={styles.iconWrap}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="var(--red)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <polyline points="19,12 12,19 5,12"/>
          </svg>
        </div>
        <div className={styles.text}>
          <p className={styles.title}>Payment request pending</p>
          <p className={styles.sub}>
            @{request.counterpart_username} is requesting{' '}
            <strong>${Number(request.amount).toFixed(2)}</strong>
            {request.note ? ` · ${request.note}` : ''}
          </p>
        </div>
      </div>
      <div className={styles.cta}>
        Pay now
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      </div>
    </button>
  );
}