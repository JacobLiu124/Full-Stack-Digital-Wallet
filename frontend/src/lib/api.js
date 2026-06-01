import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${BASE}/api`,
  withCredentials: false,
});

// Inject auth token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wallet_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto logout on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('wallet_token');
      localStorage.removeItem('wallet_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// Bank
export const getBankLinkToken = () => api.get('/bank/link-token');
export const confirmBankConnection = () => api.post('/bank/confirm');
export const getAccounts = () => api.get('/bank/accounts');
export const refreshBank = () => api.post('/bank/refresh');

// Transactions
export const pay = (data) => api.post('/transactions/pay', data);
export const requestMoney = (data) => api.post('/transactions/request', data);
export const acceptRequest = (refId) => api.post(`/transactions/request/${refId}/accept`);
export const declineRequest = (refId) => api.post(`/transactions/request/${refId}/decline`);
export const getHistory = () => api.get('/transactions/history');

// Users
export const searchUsers = (q) => api.get(`/users/search?q=${encodeURIComponent(q)}`);
