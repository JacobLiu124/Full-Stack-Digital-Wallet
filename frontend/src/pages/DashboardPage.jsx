import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext.jsx';
import { getHistory, getAccounts, refreshBank } from '../lib/api.js';
import Navbar from '../components/Navbar.jsx';
import BalanceCard from '../components/BalanceCard.jsx';
import ActionButtons from '../components/ActionButtons.jsx';
import TransactionHistory from '../components/TransactionHistory.jsx';
import PayModal from '../components/PayModal.jsx';
import RequestModal from '../components/RequestModal.jsx';
import PendingRequestBanner from '../components/PendingRequestBanner.jsx';
import styles from './DashboardPage.module.css';
import SplitModal from '../components/SplitModal.jsx';

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [modal, setModal] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [prefill, setPrefill] = useState(null); // { username, amount, note, referenceId }

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [txRes, accRes] = await Promise.all([getHistory(), getAccounts()]);
      const txs = txRes.data.transactions || [];
      setTransactions(txs);
      setAccounts(accRes.data.accounts || []);

      // Pull out any pending incoming requests
      const pending = txs.filter(
        (t) => t.type === 'request_received' && t.status === 'pending'
      );
      setPendingRequests(pending);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBank();
      await refreshUser();
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const onTransactionComplete = async () => {
    await refreshUser();
    await loadData();
    setModal(null);
    setPrefill(null);
  };

  const handleBannerClick = (request) => {
    console.log('RAW REQUEST OBJECT:', request);
    setPrefill({
      username: request.counterpart_username,
      amount: request.amount,
      note: request.note,
      referenceId: request.reference_id,  
    });
    setModal('pay');
  };

  return (
    <div className={styles.page}>
      <Navbar
        user={user}
        accounts={accounts}
        onRefreshAccounts={loadData}
      />

      <main className={styles.main}>
        <div className={styles.container}>

          {/* Pending request banners */}
          {pendingRequests.map((req) => (
            <PendingRequestBanner
              key={req.id}
              request={req}
              onClick={() => handleBannerClick(req)}
            />
          ))}

          <BalanceCard
            user={user}
            accounts={accounts}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />

          <ActionButtons
            onPay={() => { setPrefill(null); setModal('pay'); }}
            onRequest={() => setModal('request')}
            onSplit={() => setModal('split')}
          />

          <TransactionHistory
            transactions={transactions}
            loading={loadingData}
            currentUsername={user?.username}
          />
        </div>
      </main>

      {modal === 'pay' && (
        <PayModal
          onClose={() => { setModal(null); setPrefill(null); }}
          onSuccess={onTransactionComplete}
          prefill={prefill}
        />
      )}
      {modal === 'request' && (
        <RequestModal
          onClose={() => setModal(null)}
          onSuccess={onTransactionComplete}
        />
      )}
      {modal === 'split' && (
        <SplitModal
          onClose={() => setModal(null)}
          onSuccess={onTransactionComplete}
        />
      )}
    </div>
  );
}