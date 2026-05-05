'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AppLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '⊞' },
    { label: 'Transactions', href: '/transactions', icon: '↕' },
  ]

  return (
    <div style={styles.shell}>
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <span style={styles.brand}>◈ Wallet</span>
          <div style={styles.navLinks}>
            {navItems.map(item => (
              <Link key={item.href} href={item.href} style={{ ...styles.navLink, ...(pathname === item.href ? styles.navLinkActive : {}) }}>
                <span>{item.icon}</span> {item.label}
              </Link>
            ))}
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>Log out</button>
        </div>
      </nav>
      <main style={styles.main}>{children}</main>
    </div>
  )
}

const styles = {
  shell: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  nav: {
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  navInner: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '0 20px',
    height: 56,
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  brand: { fontSize: 18, fontWeight: 600, color: 'var(--accent)', marginRight: 8 },
  navLinks: { display: 'flex', gap: 4, flex: 1 },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--muted)',
    textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
  },
  navLinkActive: {
    background: 'var(--accent-light)',
    color: 'var(--accent)',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    fontSize: 13,
    color: 'var(--muted)',
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: 6,
  },
  main: {
    flex: 1,
    maxWidth: 900,
    margin: '0 auto',
    width: '100%',
    padding: '32px 20px',
  },
}
