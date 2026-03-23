import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './lib/auth.jsx';
import ProtectedRoute from './routes/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ProtectedLayout from './layouts/ProtectedLayout';
import VIP from './pages/VIP';
import Invitar from './pages/Invitar';
import Perfil from './pages/Perfil';
import Admin from './pages/Admin';
import Withdraw from './pages/Withdraw';
import Tutorial from './pages/Tutorial';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import AdminRoute from './routes/AdminRoute';
import Wallet from './pages/Wallet';

const ScrollRestore = () => {
  const location = useLocation();

  React.useEffect(() => {
    // On mobile/iOS Safari, avoid manipulating html/body overflow to prevent scroll issues
    // Just scroll to top safely
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {
      // ignore
    }
  }, [location.pathname]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollRestore />
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/vip" element={<VIP />} />
              <Route path="/invitar" element={<Invitar />} />
              <Route path="/perfil" element={<Perfil />} />
            </Route>
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/retirar" element={<Withdraw />} />
            <Route path="/tutorial" element={<Tutorial />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
