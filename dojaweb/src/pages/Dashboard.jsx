import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, ArrowLeftRight, BookOpen } from 'lucide-react';
import SurveysSection from '../components/Trailers/Trailers';
import HomeCarousel from '../components/HomeCarousel/HomeCarousel';

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-[#131e29]">
      {/* Carousel */}
      {/* (Carrusel oculto por cambio de estética) */}

      {/* Action Buttons */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="mb-7 md:mb-9">
          <HomeCarousel />
        </div>
        {/* Horizontal for all screens, with different gaps */}
        <div className="flex flex-row items-center justify-center gap-8 md:gap-12 lg:gap-20">
          <button onClick={() => navigate('/wallet')} className="group flex flex-col items-center justify-center transition-all duration-300">
            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg group-hover:shadow-orange-500/50">
              <Wallet className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-white" />
            </div>
            <span className="text-[#131e29] text-sm md:text-base lg:text-lg font-medium mt-3">Billetera</span>
          </button>

          <button
            onClick={() => navigate('/wallet', { state: { openWithdraw: true } })}
            className="group flex flex-col items-center justify-center transition-all duration-300"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full bg-[#131e29] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              <ArrowLeftRight className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-white" />
            </div>
            <span className="text-[#131e29] text-sm md:text-base lg:text-lg font-medium mt-3">Retirar</span>
          </button>

          <button onClick={() => navigate('/tutorial')} className="group flex flex-col items-center justify-center transition-all duration-300">
            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full bg-[#131e29] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              <BookOpen className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-white" />
            </div>
            <span className="text-[#131e29] text-sm md:text-base lg:text-lg font-medium mt-3">Tutorial</span>
          </button>
        </div>
      </div>

      {/* Sección de encuestas/reseñas */}
      <div className="container mx-auto px-4 pb-12 md:pb-16">
        <SurveysSection />
      </div>
    </div>
  );
};

export default Dashboard;