import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabase.js';
import { createBasiqUser } from '../services/basiq.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, username, password } = req.body;

    if (!name || !email || !phone || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check username/email uniqueness
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Email or username already taken' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create Basiq user
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];

    let basiqUserId = null;
    try {
      const basiqUser = await createBasiqUser({
        email,
        mobile: phone,
        firstName,
        lastName,
      });
      basiqUserId = basiqUser.id;
    } catch (basiqErr) {
      console.error('Basiq user creation failed:', basiqErr?.response?.data || basiqErr.message);
      // Continue without Basiq — bank link will be required later
    }

    // Insert into Supabase
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone,
        username: username.toLowerCase(),
        password_hash: passwordHash,
        basiq_user_id: basiqUserId,
        bank_connected: false,
        balance: 0.00,
      })
      .select('id, name, email, phone, username, bank_connected, balance, basiq_user_id, created_at')
      .single();

    if (error) throw error;

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash, ...safeUser } = user;
    return res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
import { requireAuth } from '../middleware/auth.js';

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone, username, bank_connected, balance, basiq_user_id, created_at')
      .eq('id', req.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both fields required' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.userId)
      .single();

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', req.userId);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
