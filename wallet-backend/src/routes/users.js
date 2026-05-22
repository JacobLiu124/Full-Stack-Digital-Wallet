const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

/**
 * GET /api/users/profile
 */
router.get('/profile', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) return res.status(404).json({ error: 'Profile not found' });

    res.json({ profile: data });
  } catch (err) {
    console.error('[GET /profile]', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PATCH /api/users/profile
 * Body: { full_name?, phone?, avatar_url? }
 */
router.patch('/profile', async (req, res) => {
  try {
    const { full_name, phone, avatar_url } = req.body;

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: 'No valid fields provided to update' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update profile' });

    res.json({ profile: data });
  } catch (err) {
    console.error('[PATCH /profile]', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
