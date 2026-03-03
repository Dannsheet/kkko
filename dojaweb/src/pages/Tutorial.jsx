import React from 'react';
import { useNavigate } from 'react-router-dom';

const Tutorial = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-[#131e29]">
      <div className="mx-auto w-full max-w-[520px] px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[16px] font-semibold">Tutorial</h1>
          <button
            type="button"
            className="text-[12px] text-[#131e29]/70 hover:text-[#131e29]"
            onClick={() => navigate('/dashboard')}
          >
            Volver
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-white border border-black/10 p-4 text-[12px] text-[#131e29]/80 space-y-2">
          <div>1) Realiza tu inversion inicial.</div>
          <div>2) Completa las tareas.</div>
          <div>3) Recibe tu recompensa.</div>
          <div>4) ¡Comienza a Ganar con Dajo!</div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
