import React from 'react';

const Dashboard = () => {
  return (
    <div className="h-[calc(100vh-72px)] bg-white text-white relative overflow-hidden">
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: "url(/fondo1.jpg)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.85) 100%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 h-full flex flex-col">
        <div className="flex-1 flex items-end">
          <div className="w-full px-5 pb-16">
            <div className="max-w-md">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">¿Qué es Kia?</div>
              <div className="mt-3 text-sm sm:text-base text-white/85 leading-relaxed">
                Somos una empresa automotriz fundada en 1944, dedicada a la fabricación de vehículos innovadores y de alta
                calidad. Desde nuestros inicios, hemos trabajado para superar las expectativas de nuestros clientes y liderar
                el mercado automovilístico global.
              </div>
              <button
                type="button"
                className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#1f3d35]/90 hover:bg-[#1f3d35] px-6 py-3 text-sm font-extrabold text-white transition"
              >
                Conoce más
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;