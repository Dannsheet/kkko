import React from 'react';
import { useNavigate } from 'react-router-dom';

const Tutorial = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="https://dcdewcwelmovpacghegr.supabase.co/storage/v1/object/sign/videos/download.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZTljMTc5Ni01YjQ3LTQ1YTYtOTM5MC1hYjY5YzZiNjc3MzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2aWRlb3MvZG93bmxvYWQubXA0IiwiaWF0IjoxNzczMjExNTQzLCJleHAiOjE4MDQ3NDc1NDN9.NeK3z4nLkZqU2OA5_yg1utKsU6gr9d31gi1t5tiGJ3k"
        autoPlay
        muted
        loop
        playsInline
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.78) 100%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-[520px] px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[16px] font-semibold">Tutorial</h1>
          <button
            type="button"
            className="text-[12px] text-white/80 hover:text-white"
            onClick={() => navigate('/dashboard')}
          >
            Volver
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-white/25 bg-white/80 backdrop-blur-md p-4 text-[12px] text-[#131e29] space-y-2 shadow-sm">
          <div>1) Registrate y gana 1 dolar</div>
          <div>2) Inscribete en kia para trabajar con nostros y empesar a generar ingresos llenando encuestas para kia ec</div>
          <div>3) Recuerda que por el tipo de vehiculo a escoger sera tu recompensa diaria.</div>
          <div className="pt-2">En kia pensamos en todos y damos en pleos para todos.</div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
