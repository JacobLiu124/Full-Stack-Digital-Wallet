const axios = require('axios');

const BASE_URL = process.env.BASIQ_BASE_URL || 'https://au-api.basiq.io';
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Get a server-side Basiq API token.
 * Basiq tokens last 30 minutes — we cache and reuse them.
 */
async function getBasiqToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const response = await axios.post(
    `${BASE_URL}/token`,
    'scope=SERVER_ACCESS',
    {
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.BASIQ_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'basiq-version': '3.0',
      },
    }
  );

  cachedToken = response.data.access_token;
  tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
  return cachedToken;
}

/**
 * Returns an axios instance pre-configured with the Basiq auth token.
 */
async function basiqClient() {
  const token = await getBasiqToken();
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'basiq-version': '3.0',
    },
  });
}

/**
 * Create or retrieve a Basiq user for this wallet user.
 * Basiq represents your users as "users" in their system.
 * We store the Basiq user ID in our profiles table after first creation.
 */
async function getOrCreateBasiqUser({ email, mobile, firstName, lastName, basiqUserId }) {
  const client = await basiqClient();

  if (basiqUserId) {
    // Already linked — return existing Basiq user
    const { data } = await client.get(`/users/${basiqUserId}`);
    return data;
  }

  // First time — create a Basiq user
  const { data } = await client.post('/users', {
    email,
    mobile,
    firstName,
    lastName,
  });

  return data;
}

/**
 * Generate a Basiq "auth link" — a URL you send the user to so they can
 * securely connect their bank. Basiq handles the bank login UI.
 * After the user connects, Basiq redirects to your frontend with a code.
 */
async function createAuthLink(basiqUserId) {
  const client = await basiqClient();
  const { data } = await client.post(`/users/${basiqUserId}/auth_link`);
  return data; // { links: { public: "https://connect.basiq.io/..." } }
}

/**
 * Get all bank accounts connected by this user.
 */
async function getAccounts(basiqUserId) {
  const client = await basiqClient();
  const { data } = await client.get(`/users/${basiqUserId}/accounts`);
  return data.data || [];
}

/**
 * Get transactions for a specific account.
 * Optionally filter by date range: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
 */
async function getTransactions(basiqUserId, filters = {}) {
  const client = await basiqClient();
  const params = new URLSearchParams();
  if (filters.from) params.append('filter[from]', filters.from);
  if (filters.to) params.append('filter[to]', filters.to);
  if (filters.accountId) params.append('filter[account]', filters.accountId);

  const { data } = await client.get(
    `/users/${basiqUserId}/transactions?${params.toString()}`
  );
  return data.data || [];
}

module.exports = {
  getOrCreateBasiqUser,
  createAuthLink,
  getAccounts,
  getTransactions,
};
