import { useAuth } from '../lib/AuthContext.jsx';
import styles from './Navbar.module.css';

export default function Navbar({ user }) {
  const { logout } = useAuth();

  const initial = user?.name?.[0]?.toUpperCase() || '?';

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="var(--accent)" />
            <path d="M10 18C10 13.5817 13.5817 10 18 10C20.5 10 22.75 11.1 24.25 12.875L20.5 14.75C19.75 14.0417 18.9167 13.6667 18 13.6667C15.6 13.6667 13.6667 15.6 13.6667 18C13.6667 20.4 15.6 22.3333 18 22.3333C18.9167 22.3333 19.75 21.9583 20.5 21.25L24.25 23.125C22.75 24.9 20.5 26 18 26C13.5817 26 10 22.4183 10 18Z" fill="white"/>
          </svg>
          <span className={styles.logoText}>cove</span>
        </div>

        <div className={styles.right}>
          <div className={styles.avatar} title={user?.name}>
            {initial}
          </div>
          <button onClick={logout} className={styles.logout} title="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
