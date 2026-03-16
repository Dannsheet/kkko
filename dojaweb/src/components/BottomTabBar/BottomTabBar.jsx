import React, { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Award, Home, User } from 'lucide-react';
import {
  apiFetch,
  getCuentaInfo,
  getMyReferralProfile,
  getMyReferralStats,
  getReviewsModels,
  getReviewsStatus,
} from '../../lib/api.js';
import './BottomTabBar.css';

const BottomTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefetchedRef = useRef(new Set());

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

  const prefetchRoute = useCallback((to) => {
    const target = String(to || '');
    if (!target) return;
    if (prefetchedRef.current.has(target)) return;
    prefetchedRef.current.add(target);

    if (target === '/vip') {
      Promise.allSettled([
        apiFetch('/api/vip/planes', { cacheTtlMs: 60000 }),
        getReviewsModels(),
        getReviewsStatus(),
        getCuentaInfo(),
        apiFetch('/api/suscripcion/mis-planes', { cacheTtlMs: 12000 }),
      ]).catch(() => {});
      return;
    }

    if (target === '/perfil') {
      Promise.allSettled([
        getCuentaInfo(),
        getMyReferralProfile(),
        getMyReferralStats(),
      ]).catch(() => {});
    }
  }, []);

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
              onMouseEnter={() => prefetchRoute(tab.to)}
              onTouchStart={() => prefetchRoute(tab.to)}
              onFocus={() => prefetchRoute(tab.to)}
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
