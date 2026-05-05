'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { transactionsApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

// Format YYYY-MM-DD for date inputs
function toDateInput(date) {
  return date.toISOString().split('T')[0]
}

function defaultDateRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return { from: toDateInput(from), to: toDateInput(to) }
}

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [transactions, setTransactions] = useState([])
  const [categorySummary, setCategorySummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(defaultDateRange())
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/auth'); return }
    fetchTransactions()
  }, [user, authLoading])

  async function fetchTransactions() {
    setLoading(true)
    setError('')
    try {
      const [txData, catData] = await Promise.all([
        transactionsApi.list(filters),
        transactionsApi.summary(filters),
      ])
      setTransactions(txData.transactions || [])
      setCategorySummary(catData.categories || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleFilterChange(e) {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const filtered = transactions.filter(tx =>
    !search || tx.description?.toLowerCase().includes(search.toLowerCase()) ||
    tx.merchant?.toLowerCase().includes(search.toLowerCase())
  )

  if (authLoading) {
    return <AppLayout><div style={styles.center}><span className="spinner" /></div></AppLayout>
  }

  return (
    <AppLayout>
      <h1 style={styles.pageTitle}>Transactions</h1>

      {/* Filters */}
      <div className="card" style={styles.filterRow}>
        <div style={styles.filterGroup}>
          <label className="label">From</label>
          <input className="input" type="date" name="from" value={filters.from} onChange={handleFilterChange} />
        </div>
        <div style={styles.filterGroup}>
          <label className="label">To</label>
          <input className="input" type="date" name="to" value={filters.to} onChange={handleFilterChange} />
        </div>
        <div style={{ ...styles.filterGroup, flex: 2 }}>
          <label className="label">Search</label>
          <input className="input" type="text" placeholder="Merchant or description…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={styles.filterGroup}>
          <label className="label" style={{ opacity: 0 }}>Go</label>
          <button className="btn btn-primary" onClick={fetchTransactions} disabled={loading} style={{ width: 'auto', minWidth: 80 }}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Apply'}
          </button>
        </div>
      </div>

      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

      {/* Category summary pills */}
      {categorySummary.length > 0 && (
        <div style={styles.catRow}>
          {categorySummary.slice(0, 5).map(cat => (
            <div key={cat.category} className="card" style={styles.catChip}>
              <div style={styles.catName}>{cat.category}</div>
              <div style={styles.catAmount}>${parseFloat(cat.total).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction list */}
      {loading ? (
        <div style={styles.center}><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card" style={styles.empty}>No transactions found for this period.</div>
      ) : (
        <div style={styles.list}>
          {filtered.map(tx => (
            <div key={tx.id} className="card" style={styles.txRow}>
              <div style={styles.txLeft}>
                <div style={styles.txDesc}>{tx.merchant || tx.description}</div>
                {tx.merchant && <div style={styles.txMeta}>{tx.description}</div>}
                <div style={styles.txMeta}>{tx.date} · <span style={{ color: 'var(--muted)' }}>{tx.category}</span></div>
              </div>
              <div style={styles.txRight}>
                <span style={{
                  ...styles.txAmount,
                  color: tx.type === 'credit' ? 'var(--success)' : 'var(--text)',
                }}>
                  {tx.type === 'credit' ? '+' : ''}{parseFloat(tx.amount).toLocaleString('en-AU', { minimumFractionDigits: 2, style: 'currency', currency: 'AUD' })}
                </span>
                <span className={`pill pill-${tx.type}`}>{tx.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}

const styles = {
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 },
  pageTitle: { fontSize: 22, fontWeight: 600, marginBottom: 20 },
  filterRow: { display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 20, padding: 16 },
  filterGroup: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 120 },
  catRow: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  catChip: { padding: '10px 14px', minWidth: 120, flex: 1 },
  catName: { fontSize: 12, color: 'var(--muted)', marginBottom: 2 },
  catAmount: { fontSize: 15, fontWeight: 600 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  txRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', gap: 12 },
  txLeft: { flex: 1 },
  txDesc: { fontWeight: 500, fontSize: 14 },
  txMeta: { color: 'var(--muted)', fontSize: 12, marginTop: 2 },
  txRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  txAmount: { fontWeight: 600, fontSize: 15 },
  empty: { textAlign: 'center', color: 'var(--muted)', padding: 40 },
}
