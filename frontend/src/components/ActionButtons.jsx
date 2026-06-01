import styles from './ActionButtons.module.css';

export default function ActionButtons({ onPay, onRequest }) {
  return (
    <div className={styles.row}>
      <button className={`${styles.btn} ${styles.pay}`} onClick={onPay}>
        <span className={styles.icon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <polyline points="19,12 12,19 5,12"/>
          </svg>
        </span>
        <span className={styles.label}>Send</span>
      </button>

      <button className={`${styles.btn} ${styles.request}`} onClick={onRequest}>
        <span className={styles.icon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"/>
            <polyline points="5,12 12,5 19,12"/>
          </svg>
        </span>
        <span className={styles.label}>Request</span>
      </button>
    </div>
  );
}
