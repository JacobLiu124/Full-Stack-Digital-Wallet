const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Body: { email, password, full_name }
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'email, password and full_name are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) return res.status(400).json({ error: authError.message });

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name,
        email,
        created_at: new Date().toISOString(),
      });

    if (profileError) console.error('Profile creation failed:', profileError);

    res.status(201).json({
      message: 'Account created successfully',
      user: { id: authData.user.id, email: authData.user.email, full_name },
    });
  } catch (err) {
    console.error('[POST /register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) return res.status(404).json({ error: 'Profile not found' });

    res.json({ user: profile });
  } catch (err) {
    console.error('[GET /me]', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
