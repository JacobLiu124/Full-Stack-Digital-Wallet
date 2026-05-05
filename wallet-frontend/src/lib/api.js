import { createClient } from './supabase'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Core fetch wrapper.
 * Automatically grabs the current Supabase session JWT and attaches it
 * as an Authorization header on every request to our backend.
 */
async function apiFetch(path, options = {}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const headers = {
    'Content-Type': 'application/json',
    ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `Request failed: ${res.status}`)
  }

  return res.json()
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export const authApi = {
  me: () => apiFetch('/api/auth/me'),
}

// ── Wallet ─────────────────────────────────────────────────────────────────────

export const walletApi = {
  // Initiate bank connection — returns { connect_url }
  connect: () => apiFetch('/api/wallet/connect', { method: 'POST' }),
  // Get all connected bank accounts
  accounts: () => apiFetch('/api/wallet/accounts'),
  // Get total balance summary
  summary: () => apiFetch('/api/wallet/summary'),
}

// ── Transactions ───────────────────────────────────────────────────────────────

export const transactionsApi = {
  // Get transaction list — optional filters: { from, to, accountId, limit }
  list: (filters = {}) => {
    const params = new URLSearchParams(filters).toString()
    return apiFetch(`/api/transactions${params ? `?${params}` : ''}`)
  },
  // Get spending breakdown by category
  summary: (filters = {}) => {
    const params = new URLSearchParams(filters).toString()
    return apiFetch(`/api/transactions/summary${params ? `?${params}` : ''}`)
  },
}
