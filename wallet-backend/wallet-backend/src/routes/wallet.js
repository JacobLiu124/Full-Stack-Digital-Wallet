const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');
const basiq = require('../services/basiq');

router.use(requireAuth);

/**
 * POST /api/wallet/connect
 *
 * Step 1 of bank linking. Creates a Basiq user (if not already linked),
 * stores the Basiq user ID in our profiles table, and returns a URL
 * for the user to visit to connect their bank (Basiq's hosted UI).
 *
 * Flow:
 *   Frontend calls this → gets auth link URL → redirects user to Basiq →
 *   User logs into their bank on Basiq's UI → Basiq redirects back to your app →
 *   Bank is now connected, accounts appear in GET /api/wallet/accounts
 */
router.post('/connect', async (req, res) => {
  // Fetch the user's profile to check if they already have a Basiq user ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, email, phone, basiq_user_id')
    .eq('id', req.user.id)
    .single();

  if (profileError) return res.status(404).json({ error: 'Profile not found' });

  const nameParts = (profile.full_name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Get or create a Basiq user
  const basiqUser = await basiq.getOrCreateBasiqUser({
    email: profile.email,
    mobile: profile.phone,
    firstName,
    lastName,
    basiqUserId: profile.basiq_user_id,
  });

  // If this is a new Basiq user, save their ID to our profile
  if (!profile.basiq_user_id) {
    await supabase
      .from('profiles')
      .update({ basiq_user_id: basiqUser.id })
      .eq('id', req.user.id);
  }

  // Generate the bank-linking URL for this user
  const authLink = await basiq.createAuthLink(basiqUser.id);

  res.json({
    connect_url: authLink.links?.public,
    message: 'Redirect the user to connect_url to link their bank account',
  });
});

/**
 * GET /api/wallet/accounts
 *
 * Returns all bank accounts the user has connected via Basiq.
 * Each account has: id, name, accountNo, balance, currency, institution
 */
router.get('/accounts', async (req, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('basiq_user_id')
    .eq('id', req.user.id)
    .single();

  if (error || !profile?.basiq_user_id) {
    return res.status(400).json({
      error: 'No bank connected. Call POST /api/wallet/connect first.',
    });
  }

  const accounts = await basiq.getAccounts(profile.basiq_user_id);

  // Shape the response — only expose what the frontend needs
  const shaped = accounts.map(acc => ({
    id: acc.id,
    name: acc.name,
    accountNo: acc.accountNo,
    balance: acc.balance,
    availableFunds: acc.availableFunds,
    currency: acc.currency,
    type: acc.type,         // e.g. "savings", "transaction"
    institution: acc.institution?.shortName,
    lastUpdated: acc.transactionIntervals?.[0]?.to,
  }));

  res.json({ accounts: shaped });
});

/**
 * GET /api/wallet/summary
 *
 * Returns a quick summary: total balance across all connected accounts.
 */
router.get('/summary', async (req, res) => {
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
});

module.exports = router;
