const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');
const basiq = require('../services/basiq');

router.use(requireAuth);

/**
 * GET /api/transactions
 * Query params: from, to, accountId, limit
 */
router.get('/', async (req, res) => {
  try {
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
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const transactions = await basiq.getTransactions(profile.basiq_user_id, {
      from,
      to,
      accountId: req.query.accountId,
    });

    const shaped = transactions.slice(0, limit).map(tx => ({
      id: tx.id,
      date: tx.postDate,
      description: tx.description,
      amount: tx.amount,
      balance: tx.balance,
      type: parseFloat(tx.amount) < 0 ? 'debit' : 'credit',
      category: tx.subClass?.title || 'Uncategorised',
      merchant: tx.merchant?.businessName || null,
      account_id: tx.account,
      status: tx.status,
    }));

    res.json({ transactions: shaped, meta: { count: shaped.length, from, to } });
  } catch (err) {
    console.error('[GET /transactions]', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * GET /api/transactions/summary
 * Spending breakdown by category.
 * Query params: from, to
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

    const to = req.query.to || new Date().toISOString().split('T')[0];
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const from = req.query.from || fromDate.toISOString().split('T')[0];

    const transactions = await basiq.getTransactions(profile.basiq_user_id, { from, to });

    const debits = transactions.filter(tx => parseFloat(tx.amount) < 0);

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
  } catch (err) {
    console.error('[GET /transactions/summary]', err);
    res.status(500).json({ error: 'Failed to fetch transaction summary' });
  }
});

module.exports = router;
