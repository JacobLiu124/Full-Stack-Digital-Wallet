const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');
const basiq = require('../services/basiq');

router.use(requireAuth);

/**
 * POST /api/wallet/connect
 * Starts the bank linking flow — returns a Basiq connect URL.
 */
router.post('/connect', async (req, res) => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email, phone, basiq_user_id')
      .eq('id', req.user.id)
      .single();

    if (profileError) return res.status(404).json({ error: 'Profile not found' });

    const nameParts = (profile.full_name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const basiqUser = await basiq.getOrCreateBasiqUser({
      email: profile.email,
      mobile: profile.phone,
      firstName,
      lastName,
      basiqUserId: profile.basiq_user_id,
    });

    if (!profile.basiq_user_id) {
      await supabase
        .from('profiles')
        .update({ basiq_user_id: basiqUser.id })
        .eq('id', req.user.id);
    }

    const authLink = await basiq.createAuthLink(basiqUser.id);

    res.json({
      connect_url: authLink.links?.public,
      message: 'Redirect the user to connect_url to link their bank account',
    });
  } catch (err) {
    console.error('[POST /wallet/connect]', err);
    res.status(500).json({ error: 'Failed to start bank connection' });
  }
});

/**
 * GET /api/wallet/accounts
 * Returns all connected bank accounts.
 */
router.get('/accounts', async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('basiq_user_id')
      .eq('id', req.user.id)
      .single();

    if (error || !profile?.basiq_user_id) {
      return res.status(400).json({ error: 'No bank connected. Call POST /api/wallet/connect first.' });
    }

    const accounts = await basiq.getAccounts(profile.basiq_user_id);

    const shaped = accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      accountNo: acc.accountNo,
      balance: acc.balance,
      availableFunds: acc.availableFunds,
      currency: acc.currency,
      type: acc.type,
      institution: acc.institution?.shortName,
      lastUpdated: acc.transactionIntervals?.[0]?.to,
    }));

    res.json({ accounts: shaped });
  } catch (err) {
    console.error('[GET /wallet/accounts]', err);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

/**
 * GET /api/wallet/summary
 * Returns total balance across all connected accounts.
 */
router.get('/summary', async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('basiq_user_id')
      .eq('id', req.user.id)
      .single();

    if (error || !profile?.basiq_user_id) {
      return res.status(400).json({ error: 'No bank connected.' });
    }

    const accounts = await basiq.getAccounts(profile.basiq_user_id);

    const totalBalance = accounts.reduce((sum, acc) => {
      return sum + parseFloat(acc.balance || 0);
    }, 0);

    res.json({
      total_balance: totalBalance.toFixed(2),
      currency: 'AUD',
      account_count: accounts.length,
    });
  } catch (err) {
    console.error('[GET /wallet/summary]', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

/**
 * POST /api/wallet/transfer
 *
 * Initiates a payment via Basiq's payment initiation (NPP/PayID).
 * Money moves directly from the user's bank — we never hold funds.
 *
 * Body: {
 *   from_account_id  — the user's Basiq account ID to debit
 *   to_bsb           — recipient BSB
 *   to_account       — recipient account number
 *   to_name          — recipient name
 *   amount           — e.g. "50.00"
 *   description      — payment reference
 * }
 */
router.post('/transfer', async (req, res) => {
  try {
    const { from_account_id, to_bsb, to_account, to_name, amount, description } = req.body;

    if (!from_account_id || !to_bsb || !to_account || !to_name || !amount) {
      return res.status(400).json({ error: 'from_account_id, to_bsb, to_account, to_name and amount are required' });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('basiq_user_id')
      .eq('id', req.user.id)
      .single();

    if (error || !profile?.basiq_user_id) {
      return res.status(400).json({ error: 'No bank connected.' });
    }

    const result = await basiq.initiatePayment(profile.basiq_user_id, {
      from_account_id,
      to_bsb,
      to_account,
      to_name,
      amount,
      description: description || 'Wallet transfer',
    });

    res.json({
      message: 'Transfer initiated',
      payment_id: result.id,
      status: result.status,
    });
  } catch (err) {
    console.error('[POST /wallet/transfer]', err);
    res.status(500).json({ error: 'Transfer failed: ' + err.message });
  }
});

module.exports = router;
