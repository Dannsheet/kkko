import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronRight, Copy, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getBalanceMovements,
  getCuentaInfo,
  getMyReferralMembers,
  getMyReferralProfile,
  getMyReferralStats,
} from '../lib/api.js';
import './Promocion.css';

const useCountUp = (target, { durationMs = 900, decimals = 0 } = {}) => {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const to = Number(target || 0);
    if (!Number.isFinite(to)) {
      queueMicrotask(() => setValue(0));
      return undefined;
    }

    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = (ts) => {
      if (!startRef.current) {
        startRef.current = ts;
        setValue(0);
      }
      const p = Math.min(1, (ts - startRef.current) / durationMs);
      const eased = 1 - (1 - p) ** 3;
      const next = to * eased;
      setValue(next);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [durationMs, target]);

  const fixed = useMemo(() => {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return 0;
    const m = decimals > 0 ? Number(n.toFixed(decimals)) : Math.round(n);
    return Number.isFinite(m) ? m : 0;
  }, [decimals, value]);

  return fixed;
};

const NivelCard = ({ nivel, neonStyle, onOpenMembers }) => {
  const plantillaTotal = useCountUp(nivel?.plantillaTotal, { durationMs: 900, decimals: 0 });
  const numeroActivos = useCountUp(nivel?.numeroActivos, { durationMs: 900, decimals: 0 });
  const equipoRecarga = useCountUp(nivel?.equipoRecarga, { durationMs: 900, decimals: 2 });
  const regresoTotal = useCountUp(nivel?.regresoTotal, { durationMs: 900, decimals: 2 });
  const gananciasHoy = useCountUp(nivel?.gananciasHoy, { durationMs: 900, decimals: 2 });

  return (
    <div className="bg-white border border-black/10 rounded-2xl p-5 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold">Datos de nivel {nivel.nivel}</h3>
        <button
          type="button"
          onClick={() => onOpenMembers?.(nivel?.nivel)}
          className="flex items-center gap-2 text-[#131e29]/60 hover:text-[#131e29] transition-colors"
        >
          <span className="text-sm">Lista de miembros</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-3xl font-bold" style={neonStyle}>
            {plantillaTotal}
          </div>
          <div className="text-xs text-[#131e29]/60 mt-1">Plantilla total</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold" style={neonStyle}>
            {numeroActivos}
          </div>
          <div className="text-xs text-[#131e29]/60 mt-1">Número de Activos</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold" style={neonStyle}>
            {equipoRecarga}
          </div>
          <div className="text-xs text-[#131e29]/60 mt-1">Equipo de recarga</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold" style={neonStyle}>
            {regresoTotal}
          </div>
          <div className="text-xs text-[#131e29]/60 mt-1">Regreso total</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold" style={neonStyle}>
            {gananciasHoy}
          </div>
          <div className="text-xs text-[#131e29]/60 mt-1">Ganancias de hoy</div>
        </div>
      </div>
    </div>
  );
};

const Promocion = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(() => ({
    totalIngresos: 0,
    ingresosHoy: 0,
    recargaTotal: 0,
    agregadoHoy: 0,
    niveles: [
      { nivel: 1, plantillaTotal: 0, numeroActivos: 0, equipoRecarga: 0, regresoTotal: 0, gananciasHoy: 0 },
      { nivel: 2, plantillaTotal: 0, numeroActivos: 0, equipoRecarga: 0, regresoTotal: 0, gananciasHoy: 0 },
      { nivel: 3, plantillaTotal: 0, numeroActivos: 0, equipoRecarga: 0, regresoTotal: 0, gananciasHoy: 0 },
    ],
  }));
  const [loadError, setLoadError] = useState('');
  const [totalGanado, setTotalGanado] = useState(0);
  const [membersOpen, setMembersOpen] = useState(false);
  const [membersLevel, setMembersLevel] = useState(1);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [members, setMembers] = useState([]);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLoading, setInviteLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [userIngresosHoy, setUserIngresosHoy] = useState(0);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const [statsRes, cuentaRes, profileRes, movsRes] = await Promise.allSettled([
          getMyReferralStats(),
          getCuentaInfo(),
          getMyReferralProfile(),
          getBalanceMovements(),
        ]);
        if (!alive) return;

        const resp = statsRes.status === 'fulfilled' ? statsRes.value : null;
        const cuenta = cuentaRes.status === 'fulfilled' ? cuentaRes.value : null;
        const profile = profileRes.status === 'fulfilled' ? profileRes.value : null;
        const movimientos = movsRes.status === 'fulfilled' ? movsRes.value : null;

        if (statsRes.status !== 'fulfilled' || !resp) {
          const reason = statsRes.status === 'rejected' ? statsRes.reason : null;
          throw new Error(String(reason?.message || 'No se pudo cargar la promoción'));
        }

        const code = String(profile?.invite_code || profile?.inviteCode || '').trim();
        setInviteCode(code);
        setInviteLoading(false);

        const nextTotalGanado = Number(cuenta?.total_ganado ?? cuenta?.totalGanado ?? 0);
        setTotalGanado(Number.isFinite(nextTotalGanado) ? nextTotalGanado : 0);

        const serverGanadoHoy = Number(cuenta?.ganado_hoy ?? cuenta?.ganadoHoy ?? NaN);
        if (Number.isFinite(serverGanadoHoy)) {
          setUserIngresosHoy(serverGanadoHoy);
        } else {
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
          const rows = Array.isArray(movimientos) ? movimientos : [];
          const hoy = rows.reduce((acc, m) => {
            const ts = m?.creado_en ? new Date(String(m.creado_en)).getTime() : NaN;
            if (!Number.isFinite(ts)) return acc;
            if (ts < startOfDay.getTime() || ts >= endOfDay.getTime()) return acc;
            const monto = Number(m?.monto ?? 0);
            if (!Number.isFinite(monto) || monto <= 0) return acc;
            return acc + monto;
          }, 0);
          setUserIngresosHoy(Number.isFinite(hoy) ? hoy : 0);
        }

        setLoadError('');
        const niveles = Array.isArray(resp?.niveles) ? resp.niveles : [];
        const byLevel = new Map(niveles.map((n) => [Number(n?.nivel), n]));
        const normalizeNivel = (nivel) => {
          const n = byLevel.get(Number(nivel)) || {};
          return {
            nivel,
            plantillaTotal: Number(n?.plantillaTotal ?? 0) || 0,
            numeroActivos: Number(n?.numeroActivos ?? 0) || 0,
            equipoRecarga: Number(n?.equipoRecarga ?? 0) || 0,
            regresoTotal: Number(n?.regresoTotal ?? 0) || 0,
            gananciasHoy: Number(n?.gananciasHoy ?? 0) || 0,
          };
        };

        setData({
          totalIngresos: Number(resp?.totalIngresos ?? 0) || 0,
          ingresosHoy: Number(resp?.ingresosHoy ?? 0) || 0,
          recargaTotal: Number(resp?.recargaTotal ?? 0) || 0,
          agregadoHoy: Number(resp?.agregadoHoy ?? 0) || 0,
          niveles: [normalizeNivel(1), normalizeNivel(2), normalizeNivel(3)],
        });
      } catch (e) {
        if (!alive) return;
        setLoadError(String(e?.message || 'No se pudo cargar la promoción'));
        setInviteLoading(false);
        setUserIngresosHoy(0);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, []);

  const handleCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(String(value || ''));
      setToast({ type: 'success', message: 'Copiado' });
    } catch {
      setToast({ type: 'error', message: 'No se pudo copiar' });
    }
  };

  const neonCyanStyle = useMemo(
    () => ({
      color: '#131e29',
      textShadow: 'none',
    }),
    [],
  );
  const recargaTotal = useCountUp(data.recargaTotal, { durationMs: 900, decimals: 2 });
  const agregadoHoy = useCountUp(data.agregadoHoy, { durationMs: 900, decimals: 2 });

  const radio = 100;
  const circunferencia = 2 * Math.PI * radio;

  const chartPct = useMemo(() => {
    const recoValue = Number(data?.totalIngresos ?? 0);
    const totalValue = Math.max(Number(totalGanado ?? 0), recoValue, 0);
    if (!Number.isFinite(totalValue) || totalValue <= 0) {
      return { reco: 0, score: 0, inv: 0 };
    }

    const reco = Math.max(0, Math.min(100, (recoValue / totalValue) * 100));
    const remaining = Math.max(0, 100 - reco);
    const score = remaining * 0.6;
    const inv = remaining * 0.4;
    return { reco, score, inv };
  }, [data?.totalIngresos, totalGanado]);

  const totalPct = useCountUp(100, { durationMs: 900, decimals: 0 });
  const scorePct = useCountUp(chartPct.score, { durationMs: 1100, decimals: 0 });
  const recoPct = useCountUp(chartPct.reco, { durationMs: 1100, decimals: 0 });
  const invPct = useCountUp(chartPct.inv, { durationMs: 1100, decimals: 0 });

  const segScore = (Number(scorePct || 0) / 100) * circunferencia;
  const segReco = (Number(recoPct || 0) / 100) * circunferencia;
  const segInv = (Number(invPct || 0) / 100) * circunferencia;

  const ringStroke = 22;

  const maskMemberEmail = (raw) => {
    const s = String(raw || '').trim();
    if (!s) return '—';
    if (s.length <= 4) return s;
    return `${s.slice(0, 4)}****`;
  };

  const openMembers = async (level) => {
    const lvl = Number(level) || 1;
    setMembersLevel(lvl);
    setMembersOpen(true);
    setMembersLoading(true);
    setMembersError('');
    setMembers([]);
    try {
      const resp = await getMyReferralMembers(lvl);
      const rows = Array.isArray(resp?.members) ? resp.members : Array.isArray(resp) ? resp : [];
      setMembers(rows);
    } catch (e) {
      setMembersError(String(e?.message || 'No se pudo cargar la lista de miembros'));
    } finally {
      setMembersLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-white text-[#131e29] p-4">
      <div className="relative flex justify-between items-center mb-6 min-h-[32px]">
        <h1 className="pageTitleNeon absolute left-1/2 -translate-x-1/2 text-2xl font-bold">ANÁLISIS</h1>
        <div />
      </div>

      {toast ? (
        <div
          className="mb-4 px-4 py-3 rounded-xl border text-sm font-medium"
          style={{
            borderColor: toast.type === 'error' ? '#ff4d4f' : '#131e29',
            backgroundColor: toast.type === 'error' ? 'rgba(255, 77, 79, 0.08)' : 'rgba(19, 30, 41, 0.08)',
            color: toast.type === 'error' ? '#ff4d4f' : '#131e29',
          }}
        >
          {toast.message}
        </div>
      ) : null}

      {loadError ? (
        <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/40 bg-red-500/10 text-sm text-red-200">
          {loadError}
        </div>
      ) : null}

      <div className="mb-6 rounded-2xl bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-[#131e29]/60">Tu código de invitación</div>
            <div className="mt-1 text-lg font-semibold tracking-widest">
              {inviteLoading ? '—' : inviteCode || '—'}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(inviteCode)}
              disabled={inviteLoading || !inviteCode}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#131e29]/80 hover:bg-black/5 transition disabled:opacity-50 disabled:hover:bg-black/5"
            >
              <Copy className="w-4 h-4" />
              Copiar
            </button>
            <button
              type="button"
              onClick={() => navigate('/invitar')}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#131e29]/80 hover:bg-black/5 transition"
            >
              <UserPlus className="w-4 h-4" />
              Invitar
            </button>
          </div>
        </div>
        <div className="mt-3 text-xs text-[#131e29]/60 leading-relaxed">
          Comparte tu código solo con personas de confianza. Las comisiones se generan cuando tu equipo compra planes VIP.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4">
          <p className="text-[#131e29]/70 text-sm mb-2">Ingresos totales del usuario</p>
          <p className="text-3xl font-bold" style={neonCyanStyle}>
            {Number(totalGanado || 0).toFixed(2)} USDT
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4">
          <p className="text-[#131e29]/70 text-sm mb-2">Ingresos añadidos hoy</p>
          <p className="text-3xl font-bold" style={neonCyanStyle}>
            {Number(userIngresosHoy || 0).toFixed(2)} USDT
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-[#131e29]">Análisis de beneficios</h2>

        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="relative w-48 h-48 sm:w-64 sm:h-64">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 256 256">
              <circle
                cx="128"
                cy="128"
                r={radio}
                stroke="rgba(19, 30, 41, 0.10)"
                strokeWidth={ringStroke}
                fill="none"
              />
              <circle
                cx="128"
                cy="128"
                r={radio}
                stroke="#31f1c7"
                strokeWidth={ringStroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${segScore} ${circunferencia}`}
                strokeDashoffset="0"
                style={{ filter: 'drop-shadow(0 0 10px rgba(49, 241, 199, 0.45))' }}
              />
              <circle
                cx="128"
                cy="128"
                r={radio}
                stroke="rgba(139, 92, 246, 0.95)"
                strokeWidth={ringStroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${segReco} ${circunferencia}`}
                strokeDashoffset={-segScore}
                style={{ filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.35))' }}
              />
              <circle
                cx="128"
                cy="128"
                r={radio}
                stroke="#ec4899"
                strokeWidth={ringStroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${segInv} ${circunferencia}`}
                strokeDashoffset={-(segScore + segReco)}
                style={{ filter: 'drop-shadow(0 0 10px rgba(236, 72, 153, 0.35))' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold" style={neonCyanStyle}>
                  {totalPct}%
                </p>
                <p className="text-xs text-[#131e29]/60">Total</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 w-full max-w-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-indigo-500" />
                <span className="text-sm">Ingresos por recomendación</span>
              </div>
              <span className="text-sm font-bold" style={neonCyanStyle}>
                {recoPct}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-orange-500" />
                <span className="text-sm">Ingresos por puntuación</span>
              </div>
              <span className="text-sm font-bold" style={neonCyanStyle}>
                {scorePct}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-pink-500" />
                <span className="text-sm">Ingreso de inversión</span>
              </div>
              <span className="text-sm font-bold" style={neonCyanStyle}>
                {invPct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold">Recarga total del equipo</h3>
          <span className="text-2xl font-bold" style={neonCyanStyle}>
            {Number(recargaTotal || 0).toFixed(2)} USDT
          </span>
        </div>
        <div className="text-sm text-[#131e29]/60">
          <span>Agregado hoy: </span>
          <span className="font-semibold" style={neonCyanStyle}>
            {Number(agregadoHoy || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {data.niveles.map((nivel) => (
        <NivelCard key={nivel.nivel} nivel={nivel} neonStyle={neonCyanStyle} onOpenMembers={openMembers} />
      ))}

      {membersOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-black/10 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold">Lista de miembros (Nivel {membersLevel})</div>
              <button
                type="button"
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#131e29]/80 hover:bg-black/5 transition"
                onClick={() => setMembersOpen(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-3">
              {membersLoading ? (
                <div className="text-sm text-[#131e29]/60">Cargando...</div>
              ) : membersError ? (
                <div className="px-4 py-3 rounded-xl border border-red-500/40 bg-red-500/10 text-sm text-red-200">
                  {membersError}
                </div>
              ) : members.length === 0 ? (
                <div className="text-sm text-[#131e29]/60">Sin miembros en este nivel.</div>
              ) : (
                <div className="mt-2 space-y-2 max-h-[60vh] overflow-auto pr-1">
                  {members.map((m) => {
                    const plans = Array.isArray(m?.active_plans) ? m.active_plans : [];
                    return (
                      <div key={m?.id || m?.email} className="rounded-2xl border border-black/10 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold break-all">{maskMemberEmail(m?.email)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-[#131e29]/60">Planes activos</div>
                            <div className="text-sm font-semibold" style={neonCyanStyle}>{plans.length}</div>
                          </div>
                        </div>

                        {plans.length ? (
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {plans.map((p) => (
                              <div key={p?.subscription_id || `${p?.plan_id}-${p?.expires_at}`} className="rounded-xl border border-black/10 bg-white px-3 py-2">
                                <div className="text-xs text-[#131e29]/60">Plan</div>
                                <div className="text-sm font-semibold">#{p?.plan_id ?? '—'}</div>
                                <div className="mt-1 text-[11px] text-[#131e29]/60 break-all">
                                  Expira: {p?.expires_at ? String(p.expires_at) : '—'}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Promocion;
