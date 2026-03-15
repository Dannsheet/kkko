import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getMyReferralProfile, getMyReferralStats } from '../lib/api.js';
import './Invitar.css';

const Invitar = () => {
  const { user } = useAuth();

  const [toast, setToast] = useState(null);
  const [serverInviteCode, setServerInviteCode] = useState('');
  const [inviteCodeLoading, setInviteCodeLoading] = useState(true);

  const [refStats, setRefStats] = useState(null);
  const [refStatsLoading, setRefStatsLoading] = useState(true);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        setInviteCodeLoading(true);
        setRefStatsLoading(true);

        const [profileRes, statsRes] = await Promise.allSettled([
          getMyReferralProfile(),
          getMyReferralStats(),
        ]);

        if (!alive) return;

        if (profileRes.status === 'fulfilled') {
          const code = String(profileRes.value?.invite_code || profileRes.value?.inviteCode || '').trim();
          setServerInviteCode(code);
        }

        if (statsRes.status === 'fulfilled') {
          setRefStats(statsRes.value || null);
        } else {
          setRefStats(null);
        }
      } catch {
        if (!alive) return;
        setRefStats(null);
      } finally {
        if (alive) {
          setInviteCodeLoading(false);
          setRefStatsLoading(false);
        }
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
  }, []);

  const inviteCode = useMemo(() => (serverInviteCode ? serverInviteCode : ''), [serverInviteCode]);

  const inviteLink = useMemo(() => {
    if (!inviteCode) return '';
    const base = String(window.location.origin || '').replace(/\/$/, '');
    return `${base}/?ref=${encodeURIComponent(inviteCode)}`;
  }, [inviteCode]);

  const handleCopy = useCallback(
    async (value) => {
      try {
        await navigator.clipboard.writeText(String(value || ''));
        showToast('success', 'Copiado');
      } catch {
        showToast('error', 'No se pudo copiar');
      }
    },
    [showToast],
  );

  const normalizedNiveles = useMemo(() => {
    const niveles = Array.isArray(refStats?.niveles) ? refStats.niveles : [];
    if (!niveles.length) return [];
    const byLevel = new Map();
    for (const row of niveles) {
      const lvl = Number(row?.nivel);
      if (!Number.isFinite(lvl)) continue;
      if (!byLevel.has(lvl)) byLevel.set(lvl, row);
    }
    const normalize = (nivel) => {
      const src = byLevel.get(Number(nivel)) || {};
      return {
        nivel,
        plantillaTotal: Number(src?.plantillaTotal ?? 0) || 0,
        numeroActivos: Number(src?.numeroActivos ?? 0) || 0,
        equipoRecarga: Number(src?.equipoRecarga ?? 0) || 0,
      };
    };
    return [normalize(1), normalize(2), normalize(3)];
  }, [refStats?.niveles]);

  return (
    <div className="min-h-full bg-white text-[#131e29] p-4">
      <h1 className="pageTitleNeon text-2xl font-bold text-center">INVITAR AMIGOS</h1>

      {toast && (
        <div
          className="mt-4 px-4 py-3 rounded-xl border text-sm font-medium"
          style={{
            borderColor: toast.type === 'error' ? '#ff4d4f' : '#131e29',
            backgroundColor: toast.type === 'error' ? 'rgba(255, 77, 79, 0.08)' : 'rgba(19, 30, 41, 0.08)',
            color: toast.type === 'error' ? '#ff4d4f' : '#131e29',
          }}
        >
          {toast.message}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
        <div className="text-sm text-[#131e29]/70">Código de invitación</div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#131e29]">
            {inviteCodeLoading ? '—' : inviteCode || '—'}
          </div>
          <button
            type="button"
            onClick={() => handleCopy(inviteCode)}
            disabled={inviteCodeLoading || !inviteCode}
            className="shrink-0 rounded-xl border border-black/10 bg-white p-3 hover:bg-black/5 transition"
            aria-label="Copiar código"
          >
            <Copy className="w-5 h-5 text-[#131e29]/70" />
          </button>
        </div>

        <div className="mt-4 text-sm text-[#131e29]/70">Enlace de invitación</div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-xs sm:text-sm font-medium break-all text-[#131e29]">
            {inviteLink || '—'}
          </div>
          <button
            type="button"
            onClick={() => handleCopy(inviteLink)}
            className="shrink-0 rounded-xl border border-black/10 bg-white p-3 hover:bg-black/5 transition"
            aria-label="Copiar enlace"
          >
            <Copy className="w-5 h-5 text-[#131e29]/70" />
          </button>
        </div>

        <div className="mt-5">
          <div className="text-sm font-semibold text-center">Niveles de referidos</div>
          {refStatsLoading ? (
            <div className="mt-2 text-sm text-[#131e29]/60 text-center">Cargando...</div>
          ) : normalizedNiveles.length ? (
            <div className="mt-3 grid grid-cols-1 gap-3">
              {normalizedNiveles.map((lvl) => (
                <div key={lvl?.nivel} className="rounded-2xl border border-black/10 bg-white p-3">
                  <div className="text-sm font-semibold text-center">Nivel {lvl?.nivel}</div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[11px] text-[#131e29]/60">Miembros</div>
                      <div className="text-sm font-semibold">{String(lvl?.plantillaTotal ?? 0)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#131e29]/60">Activos</div>
                      <div className="text-sm font-semibold">{String(lvl?.numeroActivos ?? 0)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#131e29]/60">Recarga</div>
                      <div className="text-sm font-semibold">{Number(lvl?.equipoRecarga ?? 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-[#131e29]/60 text-center">Aún no tienes referidos.</div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
        <div className="text-sm font-semibold text-center">
          🏎️ Por invitar a tus amigos a ser parte de nuestro equipo de trabajo recibiras buenos reembolsos de recarga:
        </div>
        <div className="mt-3 space-y-2 text-sm text-[#131e29]/80 text-center">
          <div>💰Reembolso por recarga de nivel 1: 10%</div>
          <div>💰Reembolso por recarga de nivel 2: 1%</div>
          <div>💰Reembolso por recarga de nivel 3: 1%</div>
        </div>
      </div>

      <div className="h-24" />
    </div>
  );
};

export default Invitar;
