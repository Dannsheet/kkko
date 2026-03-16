import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Auth from '../components/Auth/Auth';
import { useAuth } from '../hooks/useAuth';

const AuthPage = () => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">
        Cargando...
      </div>
    );
  }

  if (session) {
    const fromPath = location?.state?.from?.pathname;
    const target = typeof fromPath === 'string' && fromPath.startsWith('/') ? fromPath : '/dashboard';
    return <Navigate to={target} replace />;
  }

  return <Auth />;
};

export default AuthPage;
