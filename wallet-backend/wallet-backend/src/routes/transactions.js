const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');
const basiq = require('../services/basiq');

router.use(requireAuth);

/**
 * GET /api/transactions
 *
 * Returns the user's transaction history from their connected bank(s).
 *
 * Query params:
 *   from       — YYYY-MM-DD  (default: 30 days ago)
 *   to         — YYYY-MM-DD  (default: today)
 *   accountId  — filter to a specific account (optional)
 *   limit      — max results to return (default 50, max 200)
 */
router.get('/', async (req, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('basiq_user_id')
    .eq('id', req.user.id)
    .single();

  if (error || !profile?.basiq_user_id) {
    return res.status(400).json({ error: 'No bank connected.' });
  }

  // Default date range: last 30 days
  const to = req.query.to || new Date().toISOString().split('T')[0];
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const from = req.query.from || fromDate.toISOString().split('T')[0];

  const limit = Math.min(parseInt(req.query.limit) || 50, 200);

  const transactions = await basiq.getTransactions(profile.basiq_user_id, {
    from,
    to,
    accountId: req.query.accountId,
  });

  // Shape for the frontend — clean up Basiq's format
  const shaped = transactions.slice(0, limit).map(tx => ({
    id: tx.id,
    date: tx.postDate,
    description: tx.description,
    amount: tx.amount,           // negative = debit, positive = credit
    balance: tx.balance,
    type: parseFloat(tx.amount) < 0 ? 'debit' : 'credit',
    category: tx.subClass?.title || 'Uncategorised',
    merchant: tx.merchant?.businessName || null,
    account_id: tx.account,
    status: tx.status,
  }));

  res.json({
    transactions: shaped,
    meta: {
      count: shaped.length,
      from,
      to,
    },
  });
});

/**
 * GET /api/transactions/summary
 *
 * Returns spending breakdown by category for the given period.
 * Useful for the dashboard "where did my money go" chart.
 *
 * Query params: from, to (same as above)
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

  const to = req.query.to || new Date().toISOString().split('T')[0];
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const from = req.query.from || fromDate.toISOString().split('T')[0];

  const transactions = await basiq.getTransactions(profile.basiq_user_id, { from, to });

  // Only look at debits (spending)
  const debits = transactions.filter(tx => parseFloat(tx.amount) < 0);

  // Group by category
  const byCategory = debits.reduce((acc, tx) => {
    const cat = tx.subClass?.title || 'Uncategorised';
    if (!acc[cat]) acc[cat] = { category: cat, total: 0, count: 0 };
    acc[cat].total += Math.abs(parseFloat(tx.amount));
    acc[cat].count += 1;
    return acc;
  }, {});

  const categories = Object.values(byCategory)
    .sort((a, b) => b.total - a.total)
    .map(c => ({ ...c, total: c.total.toFixed(2) }));

  const totalSpent = debits.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);

  res.json({
    period: { from, to },
    total_spent: totalSpent.toFixed(2),
    currency: 'AUD',
    categories,
  });
});

module.exports = router;
