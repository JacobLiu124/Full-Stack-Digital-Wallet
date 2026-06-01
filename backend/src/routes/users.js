import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../services/supabase.js';

const router = Router();

/**
 * GET /api/users/search?q=username
 * Search for users by username. Returns minimal public info only.
 */
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }

    const query = q.toLowerCase().replace('@', '');

    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, name')
      .ilike('username', `${query}%`)
      .neq('id', req.userId)
      .limit(10);

    if (error) throw error;

    // Return ONLY public-safe fields
    return res.json({
      users: users.map((u) => ({ username: u.username, name: u.name })),
    });
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
