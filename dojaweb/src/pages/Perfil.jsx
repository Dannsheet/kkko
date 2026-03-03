import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Headset, LogOut, Send, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getCuentaInfo, getMe, getMyReferralProfile, getMyReferralStats } from '../lib/api.js';
import { supabase } from '../supabaseClient';
import './Perfil.css';

const Perfil = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [recargaAcumulada, setRecargaAcumulada] = useState(0);
  const [ganadoReferidos, setGanadoReferidos] = useState(0);
  const [ganadoVideos, setGanadoVideos] = useState(0);
  const [retiroAcumulativo, setRetiroAcumulativo] = useState(0);
  const [totalComisiones, setTotalComisiones] = useState(0);
  const [teamSize, setTeamSize] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [comisionesError, setComisionesError] = useState('');
  const [serverInviteCode, setServerInviteCode] = useState('');
  const [inviteCodeLoading, setInviteCodeLoading] = useState(true);

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
        const resp = await getMyReferralProfile();
        const code = String(resp?.invite_code || resp?.inviteCode || '').trim();
        if (alive && code) setServerInviteCode(code);
      } catch {
        // ignore
      } finally {
        if (alive) setInviteCodeLoading(false);
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

  const openExternal = useCallback((url) => {
    try {
      window.open(String(url), '_blank', 'noreferrer');
    } catch {
      // ignore
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const inviteCode = useMemo(() => (serverInviteCode ? serverInviteCode : ''), [serverInviteCode]);

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

  const loadCuenta = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const cuenta = await getCuentaInfo();
      const nextRecarga = Number(cuenta?.recarga_acumulada ?? 0);
      const nextRef = Number(cuenta?.ganado_referidos ?? 0);
      const nextVideos = Number(cuenta?.ganado_videos ?? 0);
      const nextWithdrawn = Number(cuenta?.retiro_acumulativo ?? 0);
      setRecargaAcumulada(Number.isFinite(nextRecarga) ? nextRecarga : 0);
      setGanadoReferidos(Number.isFinite(nextRef) ? nextRef : 0);
      setGanadoVideos(Number.isFinite(nextVideos) ? nextVideos : 0);
      setRetiroAcumulativo(Number.isFinite(nextWithdrawn) ? nextWithdrawn : 0);
    } catch {
      setRecargaAcumulada(0);
      setGanadoReferidos(0);
      setGanadoVideos(0);
      setRetiroAcumulativo(0);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCuenta();
  }, [loadCuenta]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const resp = await getMyReferralStats();
        const v = Number(resp?.totalIngresos ?? 0);
        const niveles = Array.isArray(resp?.niveles) ? resp.niveles : [];
        const size = niveles.reduce((acc, n) => acc + (Number(n?.plantillaTotal || 0) || 0), 0);
        if (!alive) return;
        setComisionesError('');
        setTotalComisiones(Number.isFinite(v) ? v : 0);
        setTeamSize(Number.isFinite(size) ? size : 0);
      } catch (e) {
        if (!alive) return;
        setTotalComisiones(0);
        setTeamSize(0);
        setComisionesError(String(e?.message || 'No se pudieron cargar las comisiones'));
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const me = await getMe();
        const flag = Boolean(me?.usuario?.is_admin);
        if (!alive) return;
        setIsAdmin(flag);
      } catch {
        if (!alive) return;
        setIsAdmin(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, []);

  const metrics = useMemo(
    () => {
      const baseTotalComisiones = Number(totalComisiones || 0);
      const baseReferidos = Number(ganadoReferidos || 0);
      const baseVideos = Number(ganadoVideos || 0);
      const gananciasTotales =
        (Number.isFinite(baseReferidos) ? baseReferidos : 0) +
        (Number.isFinite(baseVideos) ? baseVideos : 0);
      const baseRetirado = Number(retiroAcumulativo || 0);
      const valorActualRaw = (Number(gananciasTotales) || 0) - (Number(baseRetirado) || 0);
      const valorActual = Number.isFinite(valorActualRaw) ? valorActualRaw : 0;

      return [
        { label: 'Valor Recargado (USDT)', value: Number(recargaAcumulada || 0).toFixed(2) },
        { label: 'Ingresos totales', value: Number(gananciasTotales || 0).toFixed(2) },
        { label: 'Valor actual', value: Number(valorActual || 0).toFixed(2) },
        { label: 'Comisión de video', value: (Number.isFinite(baseVideos) ? baseVideos : 0).toFixed(2) },
        { label: 'Referidos', value: (Number.isFinite(baseTotalComisiones) ? baseTotalComisiones : 0).toFixed(2) },
        { label: 'Valor retirado', value: Number(retiroAcumulativo || 0).toFixed(2) },
        { label: 'Tamaño total del equipo', value: String(teamSize || 0) },
      ];
    },
    [ganadoReferidos, ganadoVideos, recargaAcumulada, retiroAcumulativo, teamSize, totalComisiones],
  );

  const neonCyanStyle = useMemo(
    () => ({
      color: '#131e29',
      textShadow: 'none',
    }),
    [],
  );

  return (
    <div className="min-h-full bg-white text-[#131e29] p-0">
      <div className="relative flex items-center justify-between min-h-[32px]">
        <h1 className="pageTitleNeon absolute left-1/2 -translate-x-1/2 text-2xl font-bold">PERFIL</h1>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-sm text-[#131e29]/60 hover:text-[#131e29] transition"
        >
          Volver
        </button>

        {isAdmin ? (
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="text-sm text-[#131e29]/60 hover:text-[#131e29] transition"
          >
            Administrar
          </button>
        ) : null}
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

      <div className="mt-4 bg-white px-4 py-4 border-t border-b border-black/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-[#131e29]/60">Cuenta</div>
            <div className="text-sm font-semibold break-all">{user?.email || user?.phone || '—'}</div>
          </div>

          <div className="text-right">
            <div className="text-sm text-[#131e29]/60">Código de invitación</div>
            <div className="flex items-center justify-end gap-2">
              <div className="text-sm font-semibold">{inviteCodeLoading ? '—' : inviteCode || '—'}</div>
              <button
                type="button"
                onClick={() => handleCopy(inviteCode)}
                disabled={inviteCodeLoading || !inviteCode}
                className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-[#131e29]/70 hover:text-[#131e29] hover:bg-black/5 transition"
                aria-label="Copiar código"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {comisionesError ? (
        <div className="mt-4 px-4 py-3 border border-red-500/40 bg-red-500/10 text-sm text-red-200">
          {comisionesError}
        </div>
      ) : null}

      <div className="mt-0 px-4 py-4 border-b border-black/10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="border border-black/10 bg-white p-4">
            <div className="text-[12px] text-[#131e29]/60 leading-tight">{m.label}</div>
            <div className="mt-2 text-lg font-semibold" style={neonCyanStyle}>
              {loading ? '—' : m.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-0 bg-white overflow-hidden border-b border-black/10">
        <div className="px-4 py-4">
          <div className="text-sm font-semibold">Soporte</div>
          <div className="mt-1 text-xs text-[#131e29]/60">Telegram de soporte: t.me/dajoweb</div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => openExternal('https://t.me/dajoweb')}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#131e29]/80 hover:bg-black/5 transition"
            >
              <Headset className="w-4 h-4" />
              Abrir soporte
            </button>
            <button
              type="button"
              onClick={() => handleCopy('https://t.me/dajoweb')}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#131e29]/80 hover:bg-black/5 transition"
            >
              <Copy className="w-4 h-4" />
              Copiar
            </button>
          </div>
        </div>

        <div className="h-px bg-black/10" />
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-black/5 transition"
          onClick={() => openExternal('https://t.me/+ilGl4Gd5iX02ZDE5')}
        >
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-[#131e29]/70" />
            <div className="text-sm font-semibold">Canal de Telegram</div>
          </div>
          <div className="text-[#131e29]/40">›</div>
        </button>
        <div className="h-px bg-black/10" />
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-black/5 transition"
          onClick={() => openExternal('https://t.me/+7A4MLkKVNQtiN2Nh')}
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#131e29]/70" />
            <div className="text-sm font-semibold">Grupo de Telegram</div>
          </div>
          <div className="text-[#131e29]/40">›</div>
        </button>
        <div className="h-px bg-black/10" />
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-black/5 transition"
          onClick={handleSignOut}
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-[#131e29]/70" />
            <div className="text-sm font-semibold">Cerrar sesión</div>
          </div>
          <div className="text-[#131e29]/40">›</div>
        </button>
      </div>

      <div className="h-24" />
    </div>
  );
};

export default Perfil;
