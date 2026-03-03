import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Crown, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch, buyVip, createVipIntent, getCuentaInfo, getMyPlan, getMyPlans, getVideosStatus } from '../lib/api.js';
import './VIP.css';

const VIP = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [plans, setPlans] = useState([]);
  const [activeSub, setActiveSub] = useState(null);
  const [activeSubs, setActiveSubs] = useState([]);
  const [activePlanIds, setActivePlanIds] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buyingPlanId, setBuyingPlanId] = useState(null);
  const [toast, setToast] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showToast = useCallback((type, message) => setToast({ type, message }), []);

  const activeSubsView = useMemo(() => {
    const src = Array.isArray(activeSubs) && activeSubs.length ? activeSubs : activeSub?.plan_id ? [activeSub] : [];
    const rows = src
      .map((s) => {
        const raw = s?.expira_en || s?.expires_at || s?.vence_en || s?.expiresAt || null;
        const d = (() => {
          if (!raw) return null;
          const str = String(raw).trim();
          if (!str) return null;
          const hasTz = /Z$|[+-]\d{2}:\d{2}$/.test(str);
          if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
            return new Date(str.replace(' ', 'T') + 'Z');
          }
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str) && !hasTz) {
            return new Date(`${str}Z`);
          }
          return new Date(str);
        })();
        const expiryMs = d && Number.isFinite(d.getTime()) ? d.getTime() : null;
        return {
          subscription_id: s?.subscription_id ?? s?.id ?? null,
          plan_id: s?.plan_id ?? s?.plan?.id ?? null,
          nombre: s?.nombre ?? s?.plan?.nombre ?? s?.plan?.name ?? null,
          expira_en: raw,
          expiryMs,
        };
      })
      .filter((r) => r?.plan_id != null);

    rows.sort((a, b) => {
      const at = a?.expiryMs ?? Number.POSITIVE_INFINITY;
      const bt = b?.expiryMs ?? Number.POSITIVE_INFINITY;
      return at - bt;
    });

    return rows;
  }, [activeSub, activeSubs]);

  useEffect(() => {
    if (!activeSubsView.length) return;
    setNowTs(Date.now());
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeSubsView.length]);

  const countdownFor = useCallback(
    (expiryMs) => {
      if (!Number.isFinite(Number(expiryMs))) return null;
      const diffMs = Math.max(0, Number(expiryMs) - Number(nowTs || 0));
      const totalMinutes = Math.floor(diffMs / 60000);
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;
      return { days, hours, minutes, diffMs };
    },
    [nowTs],
  );

  const vipDailyByLevel = useMemo(
    () => ({
      1: { price: 10, daily: 0.5 },
      2: { price: 20, daily: 1 },
      3: { price: 50, daily: 2.4 },
      4: { price: 200, daily: 9.5 },
      5: { price: 400, daily: 20 },
      6: { price: 600, daily: 31 },
      7: { price: 1200, daily: 62 },
      8: { price: 3000, daily: 150 },
      9: { price: 6000, daily: 300 },
    }),
    [],
  );

  const getVipLevel = (plan) => {
    const raw = String(plan?.nombre || '');
    const m = raw.match(/vip\s*(\d+)/i);
    const n = m ? Number(m[1]) : null;
    return Number.isFinite(n) ? n : null;
  };

  const loadVipData = useCallback(async () => {
    if (!user) {
      setPlans([]);
      setActiveSub(null);
      setActiveSubs([]);
      setActivePlanIds([]);
      setBalance(0);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      let latestSubs = [];
      const planesData = await apiFetch('/api/vip/planes');
      setPlans(Array.isArray(planesData) ? planesData : []);

      const cuenta = await getCuentaInfo();
      const nextBalance = Number(cuenta?.balance || 0);
      setBalance(Number.isFinite(nextBalance) ? nextBalance : 0);

      try {
        const myPlansResp = await getMyPlans();
        const planes = Array.isArray(myPlansResp?.planes) ? myPlansResp.planes : [];
        latestSubs = planes;
        setActiveSubs(planes);

        if (planes.length) {
          setActiveSub(planes[0] || null);
        } else {
          const miPlan = await getMyPlan();
          setActiveSub(miPlan || null);
        }
      } catch (e) {
        const msg = String(e?.message || '');
        const lower = msg.toLowerCase();
        if (e?.status === 404 || lower.includes('sin suscripción activa') || lower.includes('sin suscripcion activa')) {
          setActiveSub(null);
          setActiveSubs([]);
          latestSubs = [];
        } else {
          throw e;
        }
      }

      try {
        const status = await getVideosStatus();
        const ids = Array.isArray(status?.planes)
          ? status.planes
              .map((p) => Number(p?.plan_id))
              .filter((id) => Number.isFinite(id))
          : [];
        setActivePlanIds(Array.from(new Set(ids)));
      } catch {
        const fallbackIds = Array.isArray(latestSubs)
          ? latestSubs
              .map((s) => Number(s?.plan_id))
              .filter((id) => Number.isFinite(id))
          : [];
        setActivePlanIds(Array.from(new Set(fallbackIds)));
      }
    } catch (e) {
      console.error('[VIP] load error', e);
      const msg = e?.message || 'No se pudo cargar VIP';
      setLoadError(msg);
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  }, [showToast, user]);

  useEffect(() => {
    if (authLoading) return;
    loadVipData();
  }, [authLoading, loadVipData]);

  const handleBuy = async (plan) => {
    if (!user) {
      showToast('error', 'Debes iniciar sesión.');
      return;
    }
    const planId = Number(plan?.id);
    if (Number.isFinite(planId) && activePlanIds.includes(planId)) {
      showToast('error', 'Ya tienes este plan activo.');
      return;
    }
    if (Array.isArray(activePlanIds) && activePlanIds.length >= 8) {
      showToast('error', 'Límite alcanzado: máximo 8 planes activos.');
      return;
    }
    const price = Number(plan?.precio || 0);
    if (Number(balance || 0) < price) {
      showToast('error', 'Saldo insuficiente. Recarga tu billetera para comprar este plan.');
      try {
        await createVipIntent(plan.id);
      } catch (e) {
        console.error('[VIP] create intent error', e);
      }
      navigate('/wallet', { state: { vipPlanId: plan.id } });
      return;
    }

    setBuyingPlanId(plan.id);
    try {
      const resp = await buyVip(plan.id);
      const nbRaw = resp?.newBalance ?? resp?.new_balance;
      if (nbRaw != null) {
        const nb = Number(nbRaw);
        setBalance(Number.isFinite(nb) ? nb : balance);
      }
      showToast('success', resp?.message || 'Plan activado');
      await loadVipData();
    } catch (e) {
      console.error('[VIP] buy error', e);
      showToast('error', e?.message || 'No se pudo activar el plan');
    } finally {
      setBuyingPlanId(null);
    }
  };

  return (
    <div className="min-h-full bg-white text-[#131e29] p-0">
      <div className="relative flex items-center justify-between min-h-[32px]">
        <h1 className="pageTitleNeon absolute left-1/2 -translate-x-1/2 text-2xl font-bold">VIP</h1>
        <div className="flex items-center gap-3">
          <div className="vipStatusPill" aria-label="Estado de suscripción">
            <span className="vipStatusPill__text">
              {activePlanIds?.length
                ? `VIP Activo (${activePlanIds.length})`
                : activeSub?.plan_id
                  ? String(activeSub?.nombre || activeSub?.plan_id)
                  : 'Cuenta gratis'}
            </span>
          </div>
          <button
            type="button"
            className="text-sm text-[#131e29]/60 hover:text-[#131e29] transition"
            onClick={() => navigate('/dashboard')}
          >
            Volver
          </button>
        </div>
      </div>

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

      {loadError && !loading && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="text-sm font-semibold text-red-400">Error cargando VIP</div>
          <div className="mt-2 text-xs text-[#131e29]/70 font-mono break-words">{loadError}</div>
        </div>
      )}

      <div className="mt-5 bg-white px-4 py-4 border-t border-b border-black/10">
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#131e29]/70">Balance</div>
          <div className="text-lg font-semibold text-[#131e29]">{Number(balance || 0).toFixed(2)} USDT</div>
        </div>
        <button
          type="button"
          className="mt-3 w-full rounded-xl bg-[#131e29] hover:opacity-90 border border-[#131e29] py-3 text-sm font-semibold text-white transition"
          onClick={() => navigate('/wallet')}
        >
          Recargar
        </button>
      </div>

      {activeSubsView.length ? (
        <div className="mt-0 bg-white px-4 py-4 border-b border-black/10">
          <div className="mt-3 flex items-center gap-2 text-[#131e29] font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            Suscripción activa
          </div>

          <div className="mt-3 space-y-2">
            {activeSubsView.map((s) => {
              const cd = countdownFor(s?.expiryMs);
              const expiryLabel = (() => {
                if (!s?.expira_en) return '—';
                const d = new Date(String(s.expira_en));
                return Number.isFinite(d.getTime()) ? d.toLocaleString() : String(s.expira_en);
              })();

              return (
                <div key={s?.subscription_id || s?.plan_id} className="border border-black/10 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-[#131e29]/70">Plan</div>
                      <div className="text-sm font-semibold text-[#131e29]">
                        <span className="font-mono">{s?.nombre || `#${s?.plan_id}`}</span>
                      </div>
                      <div className="mt-1 text-xs text-[#131e29]/60">Expira: {expiryLabel}</div>
                    </div>
                    {cd ? (
                      <div className="text-right">
                        <div className="text-[11px] text-[#131e29]/60">Termina en</div>
                        <div className="mt-1 text-sm font-extrabold text-[#131e29]">
                          {cd.days}d {String(cd.hours).padStart(2, '0')}h {String(cd.minutes).padStart(2, '0')}m
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-0 px-4 py-5">
        <div className="text-sm text-[#131e29]/70">Planes disponibles</div>

        {loading ? (
          <div className="mt-6 flex items-center justify-center text-[#131e29]/60">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Cargando...
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4">
            {!loadError && plans.length === 0 && (
              <div className="border border-black/10 bg-white p-4 text-sm text-[#131e29]/70">
                No hay planes disponibles para mostrar.
              </div>
            )}
            {plans.map((plan) => {
              const level = getVipLevel(plan);
              const meta = level ? vipDailyByLevel[level] : null;
              const price = Number(plan?.precio || meta?.price || 0);
              const daily = Number.isFinite(Number(plan?.ganancia_diaria)) ? Number(plan?.ganancia_diaria) : meta?.daily;
              const isBuying = buyingPlanId === plan.id;
              const planId = Number(plan?.id);
              const alreadyActive = Number.isFinite(planId) && Array.isArray(activePlanIds) && activePlanIds.includes(planId);
              const maxReached = Array.isArray(activePlanIds) && activePlanIds.length >= 8;
              const isDisabled = Boolean(isBuying || alreadyActive || maxReached);

              return (
                <div key={plan.id} className="border border-black/10 bg-white p-4">
                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleBuy(plan)}
                    className={
                      'w-full rounded-xl py-3 text-sm font-extrabold transition ' +
                      (alreadyActive || maxReached
                        ? 'bg-black/5 border border-black/10 text-[#131e29]/40 cursor-not-allowed'
                        : 'bg-[#131e29] text-white hover:opacity-90')
                    }
                  >
                    {isBuying ? 'Procesando...' : alreadyActive ? 'Activo' : maxReached ? 'Límite alcanzado' : 'Suscribirse'}
                  </button>

                  <div className="mt-3 text-center text-[12px] text-[#131e29]/70">
                    Compra para recibir las siguientes ganancias
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Crown className="w-5 h-5 text-[#131e29]" />
                    <div className="text-lg font-semibold">{plan.nombre}</div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-black/10 bg-white p-3 text-center">
                      <div className="text-[11px] text-[#131e29]/60">Precio</div>
                      <div className="mt-1 text-base font-extrabold text-[#131e29]">${Number(price).toFixed(2)}</div>
                    </div>
                    <div className="rounded-xl border border-black/10 bg-white p-3 text-center">
                      <div className="text-[11px] text-[#131e29]/60">Ganancia diaria</div>
                      <div className="mt-1 text-base font-extrabold text-[#131e29]">
                        {typeof daily === 'number' ? `$${daily}` : '—'}
                      </div>
                    </div>
                  </div>

                  {plan?.limite_tareas != null ? (
                    <div className="mt-3 text-center text-xs text-[#131e29]/60">
                      Límite de tareas: {plan.limite_tareas}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VIP;
