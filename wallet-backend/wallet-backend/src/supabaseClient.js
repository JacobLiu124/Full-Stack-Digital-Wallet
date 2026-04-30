const { createClient } = require('@supabase/supabase-js');

// Service role client — has admin privileges, NEVER send this key to the frontend.
// Used by the backend to verify user JWTs and perform DB operations.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = supabase;
