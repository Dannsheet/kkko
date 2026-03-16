import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = () => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        Cargando...
      </div>
    );
  }

  if (!session) return <Navigate to="/" replace state={{ from: location }} />;

  return <Outlet />;
};

export default ProtectedRoute;
