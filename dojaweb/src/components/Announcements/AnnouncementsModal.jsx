import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const ANNOUNCEMENTS_VERSION = 'v3';

const AnnouncementsModal = () => {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  const storageKey = useMemo(() => {
    const uid = user?.id ? String(user.id) : 'anon';
    return `announcements_dismissed_${ANNOUNCEMENTS_VERSION}_${uid}`;
  }, [user?.id]);

  useEffect(() => {
    if (loading) return;
    const id = window.setTimeout(() => {
      if (!user?.id) {
        setOpen(false);
        setPage(0);
        return;
      }

      try {
        const dismissed = localStorage.getItem(storageKey);
        if (dismissed) {
          setOpen(false);
          return;
        }
      } catch {
        // ignore
      }

      setOpen(true);
      setPage(0);
    }, 0);

    return () => window.clearTimeout(id);
  }, [loading, storageKey, user?.id]);

  const pages = useMemo(
    () => [
      <div key="p1" className="text-sm text-white/90 leading-relaxed">
        <div className="text-center font-bold">� ¡Bienvenido a la plataforma Kia!</div>

        <div className="mt-4 space-y-3">
          <div>
            Nos alegra tenerte con nosotros. Aquí podrás participar en nuestro sistema de reseñas y comenzar a
            generar comisiones de manera sencilla desde tu celular.
          </div>

          <div>
            Explora los planes disponibles, comparte tu opinión calificando los vehículos y recibe recompensas por
            cada reseña completada. Además, puedes obtener bonificaciones al comenzar y al participar en nuestra
            comunidad.
          </div>

          <div>✨ Empieza hoy, completa tus primeras reseñas y comienza a ganar.</div>
        </div>
      </div>,

      <div key="p2" className="text-sm text-white/90 leading-relaxed">
        <div className="text-center font-bold">� Planes de Reseñas Disponibles</div>

        <div className="mt-4 space-y-3">
          <div>
            En la plataforma puedes elegir el plan que mejor se adapte a ti y comenzar a generar ganancias por cada
            reseña completada.
          </div>

          <div className="space-y-2">
            <div>VIP1: Inversión $14 —$1</div>
            <div>VIP2: Inversión $28 —$2</div>
            <div>VIP3: Inversión $42 —$3</div>
            <div>VIP4: Inversión $70 -$5</div>
            <div>VIP5: Inversión $112 -$7</div>
            <div>VIP6: Inversión $196 - $12</div>
            <div>VIP7: Inversión $350 —$22</div>
            <div>VIP8: Inversión $560 -$35</div>
            <div>VIP9: Inversión $700 -$44</div>
          </div>

          <div>� Mientras mayor sea tu plan, mayor será tu ganancia por cada reseña realizada.</div>
        </div>
      </div>,
    ],
    [],
  );

  const totalPages = pages.length;
  const isFirst = page <= 0;
  const isLast = page >= totalPages - 1;

  const close = () => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      // ignore
    }
    setOpen(false);
    setPage(0);
  };

  const next = () => {
    if (isLast) {
      close();
      return;
    }
    setPage((p) => Math.min(p + 1, totalPages - 1));
  };

  const prev = () => {
    setPage((p) => Math.max(p - 1, 0));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-doja-dark/90 shadow-2xl">
        <div className="px-6 py-4 border-b border-white/10">
          <div className="text-center text-lg font-semibold">Anuncio</div>
        </div>

        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">{pages[page]}</div>

        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={prev}
            disabled={isFirst}
            className="text-sm text-white/70 disabled:opacity-40"
          >
            Atrás
          </button>

          <button
            type="button"
            onClick={next}
            className="text-sm font-medium text-doja-light-cyan"
          >
            {isLast ? 'Cerrar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsModal;
