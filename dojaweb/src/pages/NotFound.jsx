import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-white text-[#131e29] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6">
        <h1 className="text-xl font-semibold">Página no disponible</h1>
        <p className="mt-2 text-sm text-[#131e29]/70">
          Esta sección aún no está habilitada o la ruta no existe.
        </p>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            className="flex-1 rounded-xl bg-white hover:bg-black/5 border border-black/10 py-3 text-sm font-medium transition"
            onClick={() => navigate(-1)}
          >
            Volver
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-[#131e29] hover:opacity-90 border border-[#131e29] py-3 text-sm font-semibold text-white transition"
            onClick={() => navigate(session ? '/dashboard' : '/', { replace: true })}
          >
            {session ? 'Ir al dashboard' : 'Ir al inicio'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
