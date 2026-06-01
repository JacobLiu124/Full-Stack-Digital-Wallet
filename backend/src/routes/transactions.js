import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../services/supabase.js';

const router = Router();

/**
 * POST /api/transactions/pay
 * Debit sender, credit recipient, record both sides in transaction history.
 */
router.post('/pay', requireAuth, async (req, res) => {
  console.log('PAY BODY:', req.body); // add this
  try {
    const { recipientUsername, amount, note } = req.body;

    if (!recipientUsername || !amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid payment details' });
    }

    const amountNum = parseFloat(Number(amount).toFixed(2));

    // Fetch sender
    const { data: sender } = await supabase
      .from('users')
      .select('id, username, balance, bank_connected')
      .eq('id', req.userId)
      .single();

    if (!sender) return res.status(404).json({ error: 'Sender not found' });
    if (!sender.bank_connected) {
      return res.status(400).json({ error: 'Connect your bank before making payments' });
    }
    if (sender.balance < amountNum) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Fetch recipient
    const { data: recipient } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', recipientUsername.toLowerCase().replace('@', ''))
      .maybeSingle();

    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
    if (recipient.id === sender.id) {
      return res.status(400).json({ error: "You can't pay yourself" });
    }

    const txId = uuidv4();

    // Debit sender
    await supabase
      .from('users')
      .update({ balance: parseFloat((sender.balance - amountNum).toFixed(2)) })
      .eq('id', sender.id);

    // Credit recipient
    const { data: recipientFull } = await supabase
      .from('users')
      .select('balance')
      .eq('id', recipient.id)
      .single();

    await supabase
      .from('users')
      .update({ balance: parseFloat(((recipientFull?.balance || 0) + amountNum).toFixed(2)) })
      .eq('id', recipient.id);

    // Record transaction for sender
    await supabase.from('transactions').insert({
      id: uuidv4(),
      reference_id: txId,
      user_id: sender.id,
      counterpart_id: recipient.id,
      counterpart_username: recipient.username,
      type: 'payment_sent',
      amount: amountNum,
      note: note || null,
      status: 'completed',
    });

    // Record transaction for recipient
    await supabase.from('transactions').insert({
      id: uuidv4(),
      reference_id: txId,
      user_id: recipient.id,
      counterpart_id: sender.id,
      counterpart_username: sender.username,
      type: 'payment_received',
      amount: amountNum,
      note: note || null,
      status: 'completed',
    });

    if (req.body.referenceId) {
      await supabase
        .from('transactions')
        .delete()
        .eq('reference_id', req.body.referenceId)
        .in('type', ['request_received', 'request_sent']);
    }

    return res.json({
      success: true,
      message: `Paid @${recipient.username} $${amountNum.toFixed(2)}`,
      newBalance: parseFloat((sender.balance - amountNum).toFixed(2)),
    });
  } catch (err) {
    console.error('Pay error:', err);
    return res.status(500).json({ error: 'Payment failed', details: err.message });
  }
});

/**
 * POST /api/transactions/request
 * Creates a pending payment request from sender → recipient.
 */
router.post('/request', requireAuth, async (req, res) => {
  try {
    const { recipientUsername, amount, note } = req.body;

    if (!recipientUsername || !amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid request details' });
    }

    const amountNum = parseFloat(Number(amount).toFixed(2));

    // Fetch requester
    const { data: requester } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', req.userId)
      .single();

    // Fetch target
    const { data: target } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', recipientUsername.toLowerCase().replace('@', ''))
      .maybeSingle();

    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.id === requester.id) {
      return res.status(400).json({ error: "You can't request money from yourself" });
    }

    const txId = uuidv4();

    // Record request for requester (outgoing request)
    await supabase.from('transactions').insert({
      id: uuidv4(),
      reference_id: txId,
      user_id: requester.id,
      counterpart_id: target.id,
      counterpart_username: target.username,
      type: 'request_sent',
      amount: amountNum,
      note: note || null,
      status: 'pending',
    });

    // Record request for target (incoming request)
    await supabase.from('transactions').insert({
      id: uuidv4(),
      reference_id: txId,
      user_id: target.id,
      counterpart_id: requester.id,
      counterpart_username: requester.username,
      type: 'request_received',
      amount: amountNum,
      note: note || null,
      status: 'pending',
    });

    return res.json({
      success: true,
      message: `Requested $${amountNum.toFixed(2)} from @${target.username}`,
    });
  } catch (err) {
    console.error('Request error:', err);
    return res.status(500).json({ error: 'Request failed', details: err.message });
  }
});

/**
 * POST /api/transactions/request/:referenceId/accept
 * Accept an incoming money request.
 */
router.post('/request/:referenceId/accept', requireAuth, async (req, res) => {
  try {
    const { referenceId } = req.params;

    // Find the incoming request
    const { data: incomingTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference_id', referenceId)
      .eq('user_id', req.userId)
      .eq('type', 'request_received')
      .eq('status', 'pending')
      .single();

    if (!incomingTx) {
      return res.status(404).json({ error: 'Request not found or already handled' });
    }

    const { data: payer } = await supabase
      .from('users')
      .select('id, balance, bank_connected')
      .eq('id', req.userId)
      .single();

    if (!payer.bank_connected) {
      return res.status(400).json({ error: 'Connect your bank before paying requests' });
    }

    if (payer.balance < incomingTx.amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Debit payer
    await supabase
      .from('users')
      .update({ balance: parseFloat((payer.balance - incomingTx.amount).toFixed(2)) })
      .eq('id', payer.id);

    // Credit requester
    const { data: requesterData } = await supabase
      .from('users')
      .select('balance')
      .eq('id', incomingTx.counterpart_id)
      .single();

    await supabase
      .from('users')
      .update({
        balance: parseFloat(((requesterData?.balance || 0) + incomingTx.amount).toFixed(2)),
      })
      .eq('id', incomingTx.counterpart_id);

    // Update both request records to completed
    await supabase
      .from('transactions')
      .update({ status: 'completed' })
      .eq('reference_id', referenceId);

    return res.json({ success: true, message: 'Payment sent' });
  } catch (err) {
    console.error('Accept request error:', err);
    return res.status(500).json({ error: 'Failed to accept request' });
  }
});

/**
 * POST /api/transactions/request/:referenceId/decline
 */
router.post('/request/:referenceId/decline', requireAuth, async (req, res) => {
  try {
    const { referenceId } = req.params;

    await supabase
      .from('transactions')
      .update({ status: 'declined' })
      .eq('reference_id', referenceId);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to decline request' });
  }
});

/**
 * GET /api/transactions/history
 * Full transaction history for the authenticated user.
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return res.json({ transactions });
  } catch (err) {
    console.error('History error:', err);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
