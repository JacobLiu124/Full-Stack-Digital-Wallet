import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASIQ_API_URL = 'https://au-api.basiq.io';
const BASIQ_API_KEY = process.env.BASIQ_API_KEY;

let cachedToken = null;
let tokenExpiry = null;

/**
 * Get a server-side access token from Basiq (client_credentials).
 * Tokens last 3600s; we cache and reuse them.
 */
export async function getBasiqToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await axios.post(
    `${BASIQ_API_URL}/token`,
    'scope=SERVER_ACCESS',
    {
      headers: {
        Authorization: `Basic ${BASIQ_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'basiq-version': '3.0',
      },
    }
  );

  cachedToken = response.data.access_token;
  tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
  return cachedToken;
}

/**
 * Create a Basiq user for a newly registered wallet user.
 */
export async function createBasiqUser({ email, mobile, firstName, lastName }) {
  const token = await getBasiqToken();

  const response = await axios.post(
    `${BASIQ_API_URL}/users`,
    { email, mobile, firstName, lastName },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'basiq-version': '3.0',
      },
    }
  );

  return response.data;
}

/**
 * Get a Basiq user-scoped token for the consent UI.
 * This token is returned to the frontend ONLY for the bank-link step,
 * it grants no API access other than consent flow.
 */
export async function getBasiqUserToken(basiqUserId) {
  const token = await getBasiqToken();

  const response = await axios.post(
    `${BASIQ_API_URL}/users/${basiqUserId}/auth_link`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'basiq-version': '3.0',
      },
    }
  );

  return response.data;
}

/**
 * Fetch all accounts for a Basiq user.
 */
export async function getBasiqAccounts(basiqUserId) {
  const token = await getBasiqToken();

  const response = await axios.get(
    `${BASIQ_API_URL}/users/${basiqUserId}/accounts`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'basiq-version': '3.0',
      },
    }
  );

  return response.data;
}

/**
 * Fetch all transactions for a Basiq user.
 */
export async function getBasiqTransactions(basiqUserId) {
  const token = await getBasiqToken();

  const response = await axios.get(
    `${BASIQ_API_URL}/users/${basiqUserId}/transactions`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'basiq-version': '3.0',
      },
    }
  );

  return response.data;
}

/**
 * Refresh data for a Basiq user (re-fetches latest from bank).
 */
export async function refreshBasiqConnections(basiqUserId) {
  const token = await getBasiqToken();

  const response = await axios.post(
    `${BASIQ_API_URL}/users/${basiqUserId}/refresh`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'basiq-version': '3.0',
      },
    }
  );

  return response.data;
}
