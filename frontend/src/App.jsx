import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import BankConnectPage from './pages/BankConnectPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

function ProtectedRoute({ children, requireBank = false }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/" replace />;
  if (requireBank && !user.bank_connected) return <Navigate to="/connect-bank" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user && !user.bank_connected) return <Navigate to="/connect-bank" replace />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function FullPageSpinner() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)',
    }}>
      <div style={{
        width: 32, height: 32, border: '2px solid var(--bg-4)',
        borderTopColor: 'var(--accent)', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PublicRoute><AuthPage /></PublicRoute>} />
          <Route path="/connect-bank" element={
            <ProtectedRoute><BankConnectPage /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute requireBank={true}><DashboardPage /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
