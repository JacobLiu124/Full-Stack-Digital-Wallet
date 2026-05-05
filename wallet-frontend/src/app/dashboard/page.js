'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { walletApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [summary, setSummary] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [noBankLinked, setNoBankLinked] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/auth'); return }
    fetchData()
  }, [user, authLoading])

  async function fetchData() {
    try {
      const [summaryData, accountsData] = await Promise.all([
        walletApi.summary(),
        walletApi.accounts(),
      ])
      setSummary(summaryData)
      setAccounts(accountsData.accounts || [])
    } catch (err) {
      if (err.message.includes('No bank connected')) setNoBankLinked(true)
    } finally {
      setLoadingData(false)
    }
  }

  async function handleConnectBank() {
    setConnecting(true)
    try {
      const data = await walletApi.connect()
      // Redirect user to Basiq's hosted bank-linking UI
      window.location.href = data.connect_url
    } catch (err) {
      alert('Could not start bank connection: ' + err.message)
      setConnecting(false)
    }
  }

  if (authLoading || loadingData) {
    return <AppLayout><div style={styles.center}><span className="spinner" /></div></AppLayout>
  }

  if (noBankLinked) {
    return (
      <AppLayout>
        <div className="card" style={styles.emptyCard}>
          <div style={styles.emptyIcon}>🏦</div>
          <h2 style={styles.emptyTitle}>Connect your bank</h2>
          <p style={styles.emptyText}>
            Link your Australian bank account to see your balance and transactions. We use Basiq to connect securely — your credentials never touch our servers.
          </p>
          <button className="btn btn-primary" style={{ maxWidth: 280 }} onClick={handleConnectBank} disabled={connecting}>
            {connecting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Connect bank account'}
          </button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <h1 style={styles.pageTitle}>Dashboard</h1>

      {/* Balance card */}
      {summary && (
        <div style={styles.balanceCard}>
          <span style={styles.balanceLabel}>Total balance</span>
          <span style={styles.balanceAmount}>${parseFloat(summary.total_balance).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
          <span style={styles.balanceCurrency}>AUD · {summary.account_count} account{summary.account_count !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Accounts list */}
      <h2 style={styles.sectionTitle}>Accounts</h2>
      <div style={styles.accountsList}>
        {accounts.map(acc => (
          <div key={acc.id} className="card" style={styles.accountCard}>
            <div>
              <div style={styles.accountName}>{acc.name}</div>
              <div style={styles.accountMeta}>{acc.institution} · {acc.accountNo}</div>
            </div>
            <div style={styles.accountBalance}>
              ${parseFloat(acc.balance).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              <span style={styles.accountType}>{acc.type}</span>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}

const styles = {
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 },
  pageTitle: { fontSize: 22, fontWeight: 600, marginBottom: 20 },
  balanceCard: {
    background: 'var(--accent)',
    borderRadius: 16,
    padding: '28px 32px',
    marginBottom: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    color: '#fff',
  },
  balanceLabel: { fontSize: 13, opacity: 0.8 },
  balanceAmount: { fontSize: 36, fontWeight: 600, letterSpacing: '-1px' },
  balanceCurrency: { fontSize: 13, opacity: 0.7 },
  sectionTitle: { fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--muted)' },
  accountsList: { display: 'flex', flexDirection: 'column', gap: 10 },
  accountCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  accountName: { fontWeight: 500, fontSize: 14 },
  accountMeta: { color: 'var(--muted)', fontSize: 13, marginTop: 2 },
  accountBalance: { fontWeight: 600, fontSize: 16, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 2 },
  accountType: { fontSize: 11, fontWeight: 400, color: 'var(--muted)', textTransform: 'capitalize', textAlign: 'right' },
  emptyCard: { maxWidth: 440, margin: '80px auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 600 },
  emptyText: { color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 },
}
