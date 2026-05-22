const axios = require('axios');

const BASE_URL = process.env.BASIQ_BASE_URL || 'https://au-api.basiq.io';
let cachedToken = null;
let tokenExpiresAt = 0;

async function getBasiqToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

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

async function getOrCreateBasiqUser({ email, mobile, firstName, lastName, basiqUserId }) {
  const client = await basiqClient();
  if (basiqUserId) {
    const { data } = await client.get(`/users/${basiqUserId}`);
    return data;
  }
  const { data } = await client.post('/users', { email, mobile, firstName, lastName });
  return data;
}

async function createAuthLink(basiqUserId) {
  const client = await basiqClient();
  const { data } = await client.post(`/users/${basiqUserId}/auth_link`);
  return data;
}

async function getAccounts(basiqUserId) {
  const client = await basiqClient();
  const { data } = await client.get(`/users/${basiqUserId}/accounts`);
  return data.data || [];
}

async function getTransactions(basiqUserId, filters = {}) {
  const client = await basiqClient();
  const params = new URLSearchParams();
  if (filters.from) params.append('filter[from]', filters.from);
  if (filters.to) params.append('filter[to]', filters.to);
  if (filters.accountId) params.append('filter[account]', filters.accountId);

  const { data } = await client.get(`/users/${basiqUserId}/transactions?${params.toString()}`);
  return data.data || [];
}

/**
 * Initiate a payment via Basiq (NPP/PayID).
 * Money moves bank-to-bank — we never hold funds.
 */
async function initiatePayment(basiqUserId, { from_account_id, to_bsb, to_account, to_name, amount, description }) {
  const client = await basiqClient();

  const { data } = await client.post(`/users/${basiqUserId}/payments`, {
    from: { accountId: from_account_id },
    to: {
      bsb: to_bsb,
      accountNumber: to_account,
      accountName: to_name,
    },
    amount: parseFloat(amount).toFixed(2),
    description,
  });

  return data;
}

module.exports = {
  getOrCreateBasiqUser,
  createAuthLink,
  getAccounts,
  getTransactions,
  initiatePayment,
};
