const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/auth/register
 *
 * Creates a new user in Supabase Auth AND a matching profile row in the
 * public.profiles table. Called by your frontend's sign-up form.
 *
 * Body: { email, password, full_name }
 */
router.post('/register', async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'email, password and full_name are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // 1. Create the user in Supabase Auth (admin API — bypasses email confirmation for now)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // set false if you want to require email confirmation
    user_metadata: { full_name },
  });

  if (authError) {
    // Supabase returns a clear error if the email is already taken
    return res.status(400).json({ error: authError.message });
  }

  // 2. Create a profile row in your public.profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,     // same UUID as auth.users
      full_name,
      email,
      created_at: new Date().toISOString(),
    });

  if (profileError) {
    console.error('Profile creation failed:', profileError);
    // User was created in Auth but profile insert failed — log and continue.
    // A database trigger (see README) is a safer alternative.
  }

  res.status(201).json({
    message: 'Account created successfully',
    user: {
      id: authData.user.id,
      email: authData.user.email,
      full_name,
    },
  });
});

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's info.
 * The frontend sends the Supabase JWT; this verifies it and returns the profile.
 */
router.get('/me', requireAuth, async (req, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, created_at')
    .eq('id', req.user.id)
    .single();

  if (error) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  res.json({ user: profile });
});

module.exports = router;
