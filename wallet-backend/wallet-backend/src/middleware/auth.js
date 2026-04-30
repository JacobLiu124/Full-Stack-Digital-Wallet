const supabase = require('../supabaseClient');

/**
 * requireAuth middleware
 *
 * The frontend logs in via Supabase directly and receives a JWT access token.
 * That token is sent in the Authorization header: "Bearer <token>"
 * This middleware verifies the token and attaches the user to req.user.
 *
 * Usage: router.get('/protected', requireAuth, handler)
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  // Ask Supabase to verify the token — returns the user if valid
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Attach user to request so route handlers can access req.user.id etc.
  req.user = user;
  next();
}

module.exports = { requireAuth };
