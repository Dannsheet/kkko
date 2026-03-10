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

const ScrollRestore = () => {
  const location = useLocation();

  React.useEffect(() => {
    try {
      const html = document.documentElement;
      const body = document.body;

      html.style.overflow = '';
      html.style.position = '';
      html.style.height = '';

      body.style.overflow = '';
      body.style.position = '';
      body.style.height = '';
    } catch {
      // ignore
    }

    // Scroll to top of the app's main scroll container if present.
    // Falls back to window scroll for pages that use body scrolling.
    try {
      const el = document.querySelector('[data-scroll-container="main"]');
      if (el && typeof el.scrollTo === 'function') {
        el.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
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
            <Route path="/wallet" element={<Navigate to="/perfil" replace />} />
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
