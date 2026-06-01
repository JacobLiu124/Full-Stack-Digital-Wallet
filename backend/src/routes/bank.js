import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../services/supabase.js';
import {
  getBasiqUserToken,
  getBasiqAccounts,
  refreshBasiqConnections,
} from '../services/basiq.js';

const router = Router();

/**
 * GET /api/bank/link-token
 * Returns a short-lived Basiq auth link so the frontend can open
 * the bank-connection consent UI. The frontend ONLY gets the link URL —
 * no Basiq user ID or API credentials are ever exposed.
 */
router.get('/link-token', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('basiq_user_id')
      .eq('id', req.userId)
      .single();

    if (error || !user?.basiq_user_id) {
      return res.status(400).json({ error: 'No Basiq account found. Please re-register.' });
    }

    const authLink = await getBasiqUserToken(user.basiq_user_id);

    // Return ONLY the URL, not the Basiq user ID
    return res.json({ url: authLink.links?.public });
  } catch (err) {
    console.error('Bank link error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to generate bank link' });
  }
});

/**
 * POST /api/bank/confirm
 * Called after user completes bank consent flow.
 * Fetches accounts from Basiq and marks bank_connected = true.
 */
router.post('/confirm', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('basiq_user_id')
      .eq('id', req.userId)
      .single();

    if (error || !user?.basiq_user_id) {
      return res.status(400).json({ error: 'No Basiq account found' });
    }

    // Fetch accounts to verify connection succeeded
    let accounts = [];
    try {
      const accountData = await getBasiqAccounts(user.basiq_user_id);
      accounts = accountData?.data || [];
    } catch {
      // Basiq may return empty if consent is still processing
    }

    const connected = accounts.length > 0;
    const primaryBalance = connected
      ? accounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0)
      : 0;

    await supabase
      .from('users')
      .update({
        bank_connected: connected,
        balance: primaryBalance,
      })
      .eq('id', req.userId);

    return res.json({
      connected,
      accountCount: accounts.length,
      balance: primaryBalance,
    });
  } catch (err) {
    console.error('Bank confirm error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to confirm bank connection' });
  }
});

/**
 * GET /api/bank/accounts
 * Returns sanitised account list (no Basiq IDs exposed to frontend).
 */
router.get('/accounts', requireAuth, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('basiq_user_id, bank_connected')
      .eq('id', req.userId)
      .single();

    if (!user?.basiq_user_id || !user.bank_connected) {
      return res.json({ accounts: [] });
    }

    const accountData = await getBasiqAccounts(user.basiq_user_id);
    const accounts = (accountData?.data || []).map((a) => ({
      name: a.name,
      type: a.type,
      balance: parseFloat(a.balance || 0),
      currency: a.currency || 'AUD',
      institution: a.institution?.name || 'Bank',
    }));

    return res.json({ accounts });
  } catch (err) {
    console.error('Accounts error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

/**
 * POST /api/bank/refresh
 * Triggers a data refresh from the user's bank.
 */
router.post('/refresh', requireAuth, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('basiq_user_id, bank_connected')
      .eq('id', req.userId)
      .single();

    if (!user?.basiq_user_id || !user.bank_connected) {
      return res.status(400).json({ error: 'No bank connected' });
    }

    await refreshBasiqConnections(user.basiq_user_id);

    // Re-sync balance
    const accountData = await getBasiqAccounts(user.basiq_user_id);
    const accounts = accountData?.data || [];
    const newBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);

    await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', req.userId);

    return res.json({ success: true, balance: newBalance });
  } catch (err) {
    console.error('Refresh error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to refresh bank data' });
  }
});

export default router;
