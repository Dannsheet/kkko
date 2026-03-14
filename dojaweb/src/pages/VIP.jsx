import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Crown, Loader2, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  apiFetch,
  buyVip,
  createVipIntent,
  getCuentaInfo,
  getMyPlan,
  getMyPlans,
  getReviewsModels,
  getReviewsStatus,
  startVipTrial,
  submitReview,
} from '../lib/api.js';
import './VIP.css';

const countWords = (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
};

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
  const [reviewsStatus, setReviewsStatus] = useState(null);
  const [reviewsModels, setReviewsModels] = useState([]);

  const [reviewPlanId, setReviewPlanId] = useState(null);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showToast = useCallback((type, message) => setToast({ type, message }), []);

  useEffect(() => {
    if (!reviewSuccess) return;
    const id = window.setTimeout(() => setReviewSuccess(''), 4500);
    return () => window.clearTimeout(id);
  }, [reviewSuccess]);

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
      setReviewsStatus(null);
      setReviewsModels([]);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      let latestSubs = [];
      const [planesData, modelsData, cuentaData, myPlansData, statusData] = await Promise.allSettled([
        apiFetch('/api/vip/planes'),
        getReviewsModels(),
        getCuentaInfo(),
        getMyPlans(),
        getReviewsStatus(),
      ]);

      setPlans(planesData.status === 'fulfilled' && Array.isArray(planesData.value) ? planesData.value : []);
      setReviewsModels(modelsData.status === 'fulfilled' && Array.isArray(modelsData.value) ? modelsData.value : []);

      if (cuentaData.status === 'fulfilled') {
        const cuenta = cuentaData.value;
        const nextBalance = Number(cuenta?.balance || 0);
        setBalance(Number.isFinite(nextBalance) ? nextBalance : 0);
      } else {
        setBalance(0);
      }

      try {
        if (myPlansData.status === 'fulfilled') {
          const myPlansResp = myPlansData.value;
          const planes = Array.isArray(myPlansResp?.planes) ? myPlansResp.planes : [];
          latestSubs = planes;
          setActiveSubs(planes);

          if (planes.length) {
            setActiveSub(planes[0] || null);
          } else {
            const miPlan = await getMyPlan();
            setActiveSub(miPlan || null);
          }
        } else {
          throw myPlansData.reason;
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

      if (statusData.status === 'fulfilled') {
        const status = statusData.value;
        setReviewsStatus(status || null);
        const ids = Array.isArray(status?.planes)
          ? status.planes.map((p) => Number(p?.plan_id)).filter((id) => Number.isFinite(id))
          : [];
        setActivePlanIds(Array.from(new Set(ids)));
      } else {
        const fallbackIds = Array.isArray(latestSubs)
          ? latestSubs
              .map((s) => Number(s?.plan_id))
              .filter((id) => Number.isFinite(id))
          : [];
        setActivePlanIds(Array.from(new Set(fallbackIds)));
        setReviewsStatus(null);
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
    if (!reviewsStatus?.planes?.length) return;
    setNowTs(Date.now());
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [reviewsStatus?.planes?.length]);

  const formatCountdown = useCallback((diffMs) => {
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  const getMsUntilEcuadorMidnight = useCallback((now) => {
    const nowDate = now instanceof Date ? now : new Date(Number(now || Date.now()));
    if (!Number.isFinite(nowDate.getTime())) return null;

    const tz = 'America/Guayaquil';

    const ymdParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(nowDate);

    const year = Number(ymdParts.find((p) => p.type === 'year')?.value);
    const month = Number(ymdParts.find((p) => p.type === 'month')?.value);
    const day = Number(ymdParts.find((p) => p.type === 'day')?.value);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

    const nextDayUtcGuess = Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0);

    const tzOffsetMsAt = (ts) => {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const parts = dtf.formatToParts(new Date(ts));
      const y = Number(parts.find((p) => p.type === 'year')?.value);
      const m = Number(parts.find((p) => p.type === 'month')?.value);
      const d = Number(parts.find((p) => p.type === 'day')?.value);
      const hh = Number(parts.find((p) => p.type === 'hour')?.value);
      const mm = Number(parts.find((p) => p.type === 'minute')?.value);
      const ss = Number(parts.find((p) => p.type === 'second')?.value);
      if (![y, m, d, hh, mm, ss].every((n) => Number.isFinite(n))) return 0;
      const asUtc = Date.UTC(y, m - 1, d, hh, mm, ss);
      return asUtc - ts;
    };

    const offsetAtGuess = tzOffsetMsAt(nextDayUtcGuess);
    const ecuMidnightUtc = nextDayUtcGuess - offsetAtGuess;
    const diff = ecuMidnightUtc - nowDate.getTime();
    return Number.isFinite(diff) ? Math.max(0, diff) : null;
  }, []);

  const reviewsPlans = useMemo(() => {
    const rows = Array.isArray(reviewsStatus?.planes) ? reviewsStatus.planes : [];
    return rows
      .map((p) => {
        const diffMs = getMsUntilEcuadorMidnight(Number(nowTs || 0));
        return {
          plan_id: Number(p?.plan_id),
          puede_resenar: Boolean(p?.puede_resenar ?? p?.puede_ver ?? false),
          recompensa: Number(p?.recompensa ?? 0) || 0,
          next_available_at: p?.next_available_at ?? reviewsStatus?.next_available_at ?? null,
          countdown: diffMs != null ? { diffMs, text: formatCountdown(diffMs) } : null,
          modelo: p?.modelo || null,
        };
      })
      .filter((p) => Number.isFinite(p?.plan_id));
  }, [formatCountdown, getMsUntilEcuadorMidnight, nowTs, reviewsStatus]);

  const currentReviewPlan = useMemo(() => {
    if (!Number.isFinite(Number(reviewPlanId))) return null;
    return reviewsPlans.find((p) => Number(p?.plan_id) === Number(reviewPlanId)) || null;
  }, [reviewPlanId, reviewsPlans]);

  const reviewWordCount = useMemo(() => countWords(reviewComment), [reviewComment]);
  const reviewTooLong = reviewWordCount > 150;

  const onStartReview = useCallback(
    (planId) => {
      setReviewPlanId(Number(planId));
      setReviewStars(0);
      setReviewComment('');
      setReviewError('');
      setReviewSuccess('');
    },
    [],
  );

  const onSubmitReview = useCallback(async () => {
    try {
      setReviewError('');
      setReviewSuccess('');

      const plan = currentReviewPlan;
      const modelId = Number(plan?.modelo?.id);
      if (!Number.isFinite(modelId)) {
        setReviewError('Este plan no tiene un modelo configurado');
        return;
      }

      if (!Number.isFinite(Number(reviewStars)) || Number(reviewStars) < 1 || Number(reviewStars) > 5) {
        setReviewError('Debes seleccionar una calificación de 1 a 5 estrellas');
        return;
      }

      if (!String(reviewComment || '').trim()) {
        setReviewError('Debes escribir tu reseña');
        return;
      }

      if (reviewTooLong) {
        setReviewError('La reseña no puede superar 150 palabras');
        return;
      }

      setReviewSubmitting(true);
      const resp = await submitReview({
        modelo_id: modelId,
        estrellas: Number(reviewStars),
        comentario: String(reviewComment).trim(),
        plan_id: Number(plan?.plan_id),
      });

      setReviewSuccess(String(resp?.message || 'Reseña enviada correctamente'));
      showToast('success', String(resp?.message || 'Reseña enviada'));

      setReviewComment('');
      setReviewStars(0);
      setReviewPlanId(null);

      const status = await getReviewsStatus();
      setReviewsStatus(status || null);
    } catch (e) {
      const msg = String(e?.message || 'No se pudo enviar la reseña');
      setReviewError(msg);
      showToast('error', msg);
    } finally {
      setReviewSubmitting(false);
    }
  }, [currentReviewPlan, reviewComment, reviewStars, reviewTooLong, showToast]);

  const modelByPlanId = useMemo(() => {
    const map = new Map();
    for (const p of reviewsPlans) {
      if (p?.plan_id != null && p?.modelo) map.set(Number(p.plan_id), p.modelo);
    }
    for (const m of Array.isArray(reviewsModels) ? reviewsModels : []) {
      const pid = Number(m?.plan_id);
      if (!Number.isFinite(pid)) continue;
      if (!map.has(pid)) map.set(pid, m);
    }
    return map;
  }, [reviewsModels, reviewsPlans]);

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

    const isTrialPlan =
      Number(price) === 0 &&
      Number(plan?.duracion_dias) === 3 &&
      Number(plan?.ganancia_diaria) === 1;

    if (isTrialPlan) {
      setBuyingPlanId(plan.id);
      try {
        const resp = await startVipTrial(plan.id);
        showToast('success', resp?.message || 'Trial iniciado');
        await loadVipData();
      } catch (e) {
        console.error('[VIP] trial start error', e);
        showToast('error', e?.message || 'No se pudo iniciar el trial');
      } finally {
        setBuyingPlanId(null);
      }
      return;
    }

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
        <h1 className="pageTitleNeon absolute left-1/2 -translate-x-1/2 text-2xl font-bold">Reseñas</h1>
        <div className="flex items-center gap-3" />
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

      <div className="mt-0 px-4 py-5">
        <div className="text-sm font-semibold text-[#131e29]">Reseñas</div>
      </div>

      {user && reviewsPlans.length ? (
        <div className="mt-0 bg-white px-4 py-5 border-b border-black/10">
          <div className="text-sm font-semibold text-[#131e29]">Tus planes activos (Reseñas)</div>
          <div className="mt-3 space-y-3">
            {reviewsPlans.map((p) => {
              const modelName = p?.modelo?.nombre || p?.modelo?.slug || `Plan #${p.plan_id}`;
              const imageUrl = p?.modelo?.imagen_url || '';
              const canReview = Boolean(p?.puede_resenar);
              const countdown = p?.countdown;

              return (
                <div
                  key={p.plan_id}
                  className="border border-black/10 bg-white p-3 rounded-2xl flex items-stretch gap-3"
                >
                  <div className="w-[84px] h-[72px] rounded-xl overflow-hidden border border-black/10 bg-black/5 flex items-center justify-center">
                    {imageUrl ? (
                      <img src={imageUrl} alt={modelName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-[11px] text-[#131e29]/50">Sin imagen</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{modelName}</div>
                    <div className="mt-1 text-xs text-[#131e29]/60">Plan #{p.plan_id}</div>
                    {!canReview ? (
                      <div className="mt-2 text-xs text-[#131e29]/60">
                        Próxima reseña en{' '}
                        <span className="font-extrabold text-[#131e29]">
                          {countdown?.text || '—'}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-[#131e29]/60">Ya puedes reseñar.</div>
                    )}
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <button
                      type="button"
                      disabled={!canReview}
                      className={
                        'rounded-xl px-3 py-2 text-xs font-extrabold transition border ' +
                        (canReview
                          ? 'bg-[#131e29] text-white border-[#131e29] hover:opacity-90'
                          : 'bg-black/5 text-[#131e29]/40 border-black/10 cursor-not-allowed')
                      }
                      onClick={() => {
                        onStartReview(p.plan_id);
                      }}
                    >
                      Dar reseña
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {reviewPlanId != null && currentReviewPlan?.modelo ? (
            <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold truncate">
                    {currentReviewPlan?.modelo?.nombre || `Plan #${currentReviewPlan.plan_id}`}
                  </div>
                  <div className="mt-1 text-xs text-[#131e29]/60">Plan #{currentReviewPlan.plan_id}</div>
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-extrabold text-[#131e29]/70 hover:text-[#131e29] hover:bg-black/5 transition"
                  onClick={() => {
                    setReviewPlanId(null);
                    setReviewStars(0);
                    setReviewComment('');
                    setReviewError('');
                    setReviewSuccess('');
                  }}
                  disabled={reviewSubmitting}
                >
                  Cerrar
                </button>
              </div>

              {!currentReviewPlan?.puede_resenar ? (
                <div className="mt-3 text-xs text-[#131e29]/60">
                  Debes esperar hasta las 00:00 (hora Ecuador) para enviar otra reseña.
                  <div className="mt-1">
                    Próxima reseña en{' '}
                    <span className="font-extrabold text-[#131e29]">{currentReviewPlan?.countdown?.text || '—'}</span>
                  </div>
                </div>
              ) : (
                <>
                  {reviewError ? (
                    <div className="mt-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-400">
                      {reviewError}
                    </div>
                  ) : null}
                  {reviewSuccess ? (
                    <div className="mt-3 px-4 py-3 rounded-xl border border-black/10 bg-black/5 text-xs text-[#131e29]/80">
                      {reviewSuccess}
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <div className="text-xs font-semibold text-[#131e29]/70">Calificación</div>
                    <div className="mt-2 flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={
                            'rounded-lg border px-2 py-2 transition ' +
                            (value <= reviewStars
                              ? 'bg-[#131e29] text-white border-[#131e29]'
                              : 'bg-white text-[#131e29]/60 border-black/10 hover:bg-black/5')
                          }
                          onClick={() => setReviewStars(value)}
                          disabled={reviewSubmitting}
                          aria-label={`Calificar ${value} estrellas`}
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-semibold text-[#131e29]/70">Tu reseña</div>
                    <textarea
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[#131e29] placeholder:text-[#131e29]/40 outline-none focus:ring-2 focus:ring-black/10"
                      placeholder="Escribe tu reseña (máximo 150 palabras)"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={5}
                      disabled={reviewSubmitting}
                    />
                    <div className={reviewTooLong ? 'mt-2 text-[11px] text-red-500' : 'mt-2 text-[11px] text-[#131e29]/50'}>
                      {reviewWordCount}/150 palabras
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-4 w-full rounded-2xl bg-[#131e29] hover:opacity-90 px-4 py-3 text-sm font-extrabold text-white transition disabled:opacity-50"
                    disabled={reviewSubmitting || reviewTooLong}
                    onClick={onSubmitReview}
                  >
                    {reviewSubmitting ? 'Enviando…' : 'Enviar reseña'}
                  </button>
                </>
              )}
            </div>
          ) : null}
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
          <div className="mt-4 grid grid-cols-1 gap-3">
            {!loadError && plans.length === 0 && (
              <div className="border border-black/10 bg-white p-4 text-sm text-[#131e29]/70">
                No hay planes disponibles para mostrar.
              </div>
            )}
            {plans
              .sort((a, b) => {
                const isTrialA =
                  Number(a.precio) === 0 &&
                  Number(a.duracion_dias) === 3 &&
                  Number(a.ganancia_diaria) === 1;
                const isTrialB =
                  Number(b.precio) === 0 &&
                  Number(b.duracion_dias) === 3 &&
                  Number(b.ganancia_diaria) === 1;
                return isTrialA ? -1 : isTrialB ? 1 : 0;
              })
              .map((plan) => {
                const level = getVipLevel(plan);
                const meta = level ? vipDailyByLevel[level] : null;
                const price = Number(plan?.precio || meta?.price || 0);
                const daily = Number.isFinite(Number(plan?.ganancia_diaria)) ? Number(plan?.ganancia_diaria) : meta?.daily;
                const isBuying = buyingPlanId === plan.id;
                const planId = Number(plan?.id);
                const alreadyActive = Number.isFinite(planId) && Array.isArray(activePlanIds) && activePlanIds.includes(planId);
                const maxReached = Array.isArray(activePlanIds) && activePlanIds.length >= 8;
                const isDisabled = Boolean(isBuying || alreadyActive || maxReached);

                const isTrialPlan =
                  Number(price) === 0 &&
                  Number(plan?.duracion_dias) === 3 &&
                  Number(plan?.ganancia_diaria) === 1;

                const model = modelByPlanId.get(planId) || null;
                const modelName = model?.nombre || plan?.nombre || `Plan #${planId}`;
                const imageUrl = model?.imagen_url || '';

                return (
                  <div
                    key={plan.id}
                    className="border border-black/10 bg-white p-3 rounded-2xl flex items-stretch gap-3"
                  >
                    <div className="w-[84px] h-[72px] rounded-xl overflow-hidden border border-black/10 bg-black/5 flex items-center justify-center">
                      {imageUrl ? (
                        <img src={imageUrl} alt={modelName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-[11px] text-[#131e29]/50">Sin imagen</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{modelName}</div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-black/10 bg-white px-1.5 py-1.5 sm:px-2 sm:py-2 text-center min-w-0">
                          <div className="text-[9px] sm:text-[10px] text-[#131e29]/60 leading-tight">Inversión</div>
                          <div className="mt-0.5 text-[11px] sm:text-xs font-extrabold text-[#131e29] truncate">
                            ${Number(price).toFixed(2)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-black/10 bg-white px-1.5 py-1.5 sm:px-2 sm:py-2 text-center min-w-0">
                          <div className="text-[9px] sm:text-[10px] text-[#131e29]/60 leading-tight">Ganancias</div>
                          <div className="mt-0.5 text-[11px] sm:text-xs font-extrabold text-[#131e29] truncate">
                            {typeof daily === 'number' ? `$${Number(daily).toFixed(2)}` : '—'}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleBuy(plan)}
                          className={
                            'rounded-xl border px-1.5 py-1.5 sm:px-2 sm:py-2 text-center text-[11px] sm:text-xs font-extrabold transition truncate ' +
                            (alreadyActive || maxReached
                              ? 'bg-black/5 border-black/10 text-[#131e29]/40 cursor-not-allowed'
                              : 'bg-[#131e29] border-[#131e29] text-white hover:opacity-90')
                          }
                        >
                          {isBuying
                            ? '...'
                            : alreadyActive
                              ? 'Activo'
                              : maxReached
                                ? 'Límite'
                                : isTrialPlan
                                  ? 'Iniciar'
                                  : 'Comprar'}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-start pt-1">
                      <Crown className="w-5 h-5 text-[#131e29]" />
                    </div>
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
