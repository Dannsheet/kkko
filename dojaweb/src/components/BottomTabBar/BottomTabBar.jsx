import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Award, Home, User } from 'lucide-react';
import './BottomTabBar.css';

const BottomTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = useMemo(
    () => [
      { id: 'home', label: 'Inicio', icon: Home, to: '/dashboard' },
      { id: 'vip', label: 'Reseñas', icon: Award, to: '/vip' },
      { id: 'perfil', label: 'Perfil', icon: User, to: '/perfil' },
    ],
    [],
  );

  const activeId = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/vip')) return 'vip';
    if (p.startsWith('/perfil')) return 'perfil';
    if (p.startsWith('/dashboard')) return 'home';
    return null;
  }, [location.pathname]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-doja-bg/90 border-t border-white/10 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-around px-2 py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeId;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate(tab.to)}
              className={active ? 'bottomtab__btn bottomtab__btn--active' : 'bottomtab__btn'}
              aria-label={tab.label}
            >
              <Icon
                className={active ? 'bottomtab__icon bottomtab__icon--active' : 'bottomtab__icon'}
              />
              <span className={active ? 'bottomtab__label bottomtab__label--active' : 'bottomtab__label'}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomTabBar;
