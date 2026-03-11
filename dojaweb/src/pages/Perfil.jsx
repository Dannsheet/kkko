import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, BookOpen, Copy, Gift, Headset, LogOut, QrCode, Send, Users, Wallet as WalletIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  createDepositRequest,
  getCuentaInfo,
  getMe,
  getMyReferralProfile,
  getMyReferralStats,
  getVipCurrent,
  resetWithdrawPin,
  setWithdrawPin,
  withdrawCreate,
  withdrawValidate,
} from '../lib/api.js';
import { supabase } from '../supabaseClient';
import './Perfil.css';

const Perfil = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const [saldoInterno, setSaldoInterno] = useState(0);
  const [saldoGanancias, setSaldoGanancias] = useState(0);

  const [depositLoading, setDepositLoading] = useState(false);
  const [deposit, setDeposit] = useState(null);
  const [confirmDepositLoading, setConfirmDepositLoading] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  const lastBalanceRef = useRef(0);

  const [vipActive, setVipActive] = useState(false);
  const [vipLoading, setVipLoading] = useState(false);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawValidated, setWithdrawValidated] = useState(null);
  const [withdrawCreated, setWithdrawCreated] = useState(null);
  const [withdrawForm, setWithdrawForm] = useState({ monto: '', red: 'BEP20-USDT', direccion: '', pin: '' });
  const [withdrawNeedsPinSetup, setWithdrawNeedsPinSetup] = useState(false);
  const [withdrawPinFailedAttempts, setWithdrawPinFailedAttempts] = useState(0);
  const [withdrawPinResetOpen, setWithdrawPinResetOpen] = useState(false);
  const [withdrawPinResetPassword, setWithdrawPinResetPassword] = useState('');
  const [withdrawPinResetNewPin, setWithdrawPinResetNewPin] = useState('');
  const [withdrawPinResetConfirmPin, setWithdrawPinResetConfirmPin] = useState('');

  const shouldOpenWithdrawFromNav = useMemo(() => Boolean(location?.state?.openWithdraw), [location?.state]);

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

  const openWithdrawSupportTelegram = useCallback(() => {
    const email = String(user?.email || '').trim();
    const message = `Hola soy ${email || ''} tengo problemas con mi retiro`;
    const url = `https://t.me/dajoweb?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [user?.email]);

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
      const nextBalance = Number(cuenta?.balance || 0);
      const nextGanancias = Number(cuenta?.saldo_ganancias);
      setSaldoInterno(Number.isFinite(nextBalance) ? nextBalance : 0);
      setSaldoGanancias(Number.isFinite(nextGanancias) ? nextGanancias : 0);
      const nextRecarga = Number(cuenta?.recarga_acumulada ?? 0);
      const nextRef = Number(cuenta?.ganado_referidos ?? 0);
      const nextVideos = Number(cuenta?.ganado_videos ?? 0);
      const nextWithdrawn = Number(cuenta?.retiro_acumulativo ?? 0);
      setRecargaAcumulada(Number.isFinite(nextRecarga) ? nextRecarga : 0);
      setGanadoReferidos(Number.isFinite(nextRef) ? nextRef : 0);
      setGanadoVideos(Number.isFinite(nextVideos) ? nextVideos : 0);
      setRetiroAcumulativo(Number.isFinite(nextWithdrawn) ? nextWithdrawn : 0);
    } catch {
      setSaldoInterno(0);
      setSaldoGanancias(0);
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
    lastBalanceRef.current = Number(saldoInterno || 0);
  }, [saldoInterno]);

  useEffect(() => {
    let alive = true;
    if (!user?.id) return () => {
      alive = false;
    };

    setVipLoading(true);
    getVipCurrent()
      .then((vip) => {
        if (!alive) return;
        setVipActive(Boolean(vip?.is_active));
      })
      .catch(() => {
        if (!alive) return;
        setVipActive(false);
      })
      .finally(() => {
        if (!alive) return;
        setVipLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [user?.id]);

  const withdrawBalanceNumber = useMemo(() => Number(saldoGanancias || 0), [saldoGanancias]);
  const isCuentaActiva = useMemo(() => Boolean(vipActive), [vipActive]);

  useEffect(() => {
    if (!shouldOpenWithdrawFromNav) return;
    if (!isCuentaActiva) {
      showToast('error', 'Debes tener un plan activo para retirar');
      return;
    }
    setWithdrawOpen(true);
    setWithdrawValidated(null);
    setWithdrawCreated(null);
    setWithdrawNeedsPinSetup(false);
    setWithdrawPinFailedAttempts(0);
    setWithdrawPinResetOpen(false);
    setWithdrawPinResetPassword('');
    setWithdrawPinResetNewPin('');
    setWithdrawPinResetConfirmPin('');
  }, [isCuentaActiva, shouldOpenWithdrawFromNav, showToast]);

  const withdrawFees = useMemo(
    () => ({
      'BEP20-USDT': 1,
    }),
    [],
  );

  const depositNetwork = useMemo(() => {
    if (!deposit) return '';
    return String(deposit?.red || deposit?.network || deposit?.chain || deposit?.network_name || '').trim();
  }, [deposit]);

  const depositAddress = useMemo(() => {
    if (!deposit) return '';
    return String(deposit?.direccion || deposit?.address || deposit?.wallet_address || '').trim();
  }, [deposit]);

  const depositMemo = useMemo(() => {
    if (!deposit) return '';
    return String(deposit?.memo || deposit?.tag || deposit?.memo_tag || '').trim();
  }, [deposit]);

  const openWithdraw = () => {
    if (!isCuentaActiva) {
      showToast('error', 'Debes tener un plan activo para retirar');
      return;
    }
    setWithdrawOpen(true);
    setWithdrawValidated(null);
    setWithdrawCreated(null);
    setWithdrawNeedsPinSetup(false);
    setWithdrawPinFailedAttempts(0);
    setWithdrawPinResetOpen(false);
    setWithdrawPinResetPassword('');
    setWithdrawPinResetNewPin('');
    setWithdrawPinResetConfirmPin('');
  };

  const closeWithdraw = () => {
    setWithdrawOpen(false);
    setWithdrawLoading(false);
    setWithdrawPinResetOpen(false);
  };

  const handleCreateDepositAddress = async () => {
    setDepositLoading(true);
    try {
      lastBalanceRef.current = Number(saldoInterno || 0);
      const data = await createDepositRequest({ currency: 'USDT' });
      const raw = data?.data || data;
      const normalized = raw
        ? {
            ...raw,
            red: String(raw?.red || raw?.network || raw?.chain || raw?.network_name || raw?.currency || 'USDT').trim(),
            direccion: String(raw?.payment_address || raw?.direccion || raw?.address || raw?.wallet_address || '').trim(),
            memo: String(raw?.memo || raw?.tag || raw?.memo_tag || '').trim() || undefined,
          }
        : null;
      setDeposit(normalized);
      showToast('success', 'Dirección generada');
      setPollingActive(true);
    } catch (e) {
      console.error('[Perfil] /deposit/request error', e);
      showToast('error', e?.message || 'No se pudo generar la dirección');
      setDeposit(null);
    } finally {
      setDepositLoading(false);
    }
  };

  const handleConfirmDeposit = async () => {
    setConfirmDepositLoading(true);
    try {
      const prev = lastBalanceRef.current;
      await loadCuenta();
      const next = Number(lastBalanceRef.current);

      let nextVipActive = false;
      try {
        const vip = await getVipCurrent();
        nextVipActive = Boolean(vip?.is_active);
      } catch {
        // ignore
      }

      if (nextVipActive) {
        setPollingActive(false);
        showToast('success', 'Suscripción activada');
        return;
      }

      if (Number.isFinite(next) && next > prev) {
        setPollingActive(false);
        showToast('success', 'Pago confirmado');
      } else {
        showToast('error', 'Pago pendiente. Aún no se confirma el depósito (intenta en unos minutos).');
      }
    } catch (e) {
      console.error('[Perfil] confirm deposit error', e);
      showToast('error', e?.message || 'No se pudo actualizar');
    } finally {
      setConfirmDepositLoading(false);
    }
  };

  useEffect(() => {
    if (!pollingActive) return;
    const id = window.setInterval(() => {
      loadCuenta()
        .then(() => {
          const prev = lastBalanceRef.current;
          return getVipCurrent()
            .then((vip) => {
              if (vip?.is_active) setPollingActive(false);
            })
            .catch(() => {
              // ignore
            })
            .finally(() => {
              const now = lastBalanceRef.current;
              if (Number.isFinite(now) && Number.isFinite(prev) && now > prev) setPollingActive(false);
            });
        })
        .catch(() => {
          // ignore
        });
    }, 10_000);
    return () => window.clearInterval(id);
  }, [loadCuenta, pollingActive]);

  const validateWithdrawForm = () => {
    const monto = Number(withdrawForm.monto);
    if (!Number.isFinite(monto) || monto <= 0) return 'Monto inválido';
    if (!withdrawForm.red) return 'Debes seleccionar una red';
    const fee = Number(withdrawFees?.[withdrawForm.red]);
    if (!Number.isFinite(fee) || fee <= 0) return 'Red no soportada';
    if (monto < 5) return `El retiro mínimo es 5 USDT. Ingresa mínimo ${Number(5).toFixed(2)} USDT`;
    const neto = monto - fee;
    if (!Number.isFinite(neto) || neto <= 0) return 'Monto inválido';
    if (!withdrawForm.direccion.trim()) return 'Debes ingresar una dirección externa';
    if (!withdrawForm.pin.trim()) return 'Debes ingresar el PIN';
    if (!isCuentaActiva) return 'Tu cuenta no está activa';
    if (monto > withdrawBalanceNumber) return 'Saldo insuficiente';
    return '';
  };

  const handleWithdrawValidate = async () => {
    const msg = validateWithdrawForm();
    if (msg) {
      showToast('error', msg);
      return;
    }
    setWithdrawLoading(true);
    try {
      const monto = Number(withdrawForm.monto);
      const data = await withdrawValidate({ monto, red: withdrawForm.red, pin: withdrawForm.pin });
      setWithdrawValidated(data || null);
      setWithdrawNeedsPinSetup(false);
      setWithdrawPinFailedAttempts(0);
      showToast('success', 'Validación correcta');
    } catch (e) {
      console.error('[Perfil] /api/withdraw/validate error', e);
      const msg = String(e?.message || 'No se pudo validar');
      const intentosRestantes = Number(e?.payload?.intentos_restantes);
      if (e?.status === 401 && msg.toLowerCase().includes('pin incorrecto') && Number.isFinite(intentosRestantes)) {
        const attempts = Math.max(0, 3 - intentosRestantes);
        setWithdrawPinFailedAttempts(attempts);
      }
      if (String(msg).toLowerCase().includes('pin de retiro no configurado')) {
        setWithdrawNeedsPinSetup(true);
      }
      showToast('error', msg);
      setWithdrawValidated(null);
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleWithdrawResetPin = async () => {
    const pwd = String(withdrawPinResetPassword || '').trim();
    const newPin = String(withdrawPinResetNewPin || '').trim();
    const confirmPin = String(withdrawPinResetConfirmPin || '').trim();
    if (!pwd) {
      showToast('error', 'Ingresa tu contraseña');
      return;
    }
    if (!newPin || newPin.length < 4) {
      showToast('error', 'PIN inválido (mínimo 4 dígitos)');
      return;
    }
    if (newPin !== confirmPin) {
      showToast('error', 'Los PIN no coinciden');
      return;
    }
    setWithdrawLoading(true);
    try {
      await resetWithdrawPin({ password: pwd, pin: newPin });
      setWithdrawPinFailedAttempts(0);
      setWithdrawPinResetOpen(false);
      setWithdrawPinResetPassword('');
      setWithdrawPinResetNewPin('');
      setWithdrawPinResetConfirmPin('');
      showToast('success', 'PIN actualizado. Ahora valida tu retiro.');
    } catch (e) {
      console.error('[Perfil] reset pin error', e);
      showToast('error', e?.message || 'No se pudo reiniciar el PIN');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleWithdrawSetPin = async () => {
    const pin = String(withdrawForm.pin || '').trim();
    if (!pin || pin.length < 4) {
      showToast('error', 'PIN inválido (mínimo 4 dígitos)');
      return;
    }
    setWithdrawLoading(true);
    try {
      await setWithdrawPin(pin);
      setWithdrawNeedsPinSetup(false);
      showToast('success', 'PIN configurado. Ahora valida tu retiro.');
    } catch (e) {
      console.error('[Perfil] /api/set-withdraw-pin error', e);
      showToast('error', e?.message || 'No se pudo configurar el PIN');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleWithdrawCreate = async () => {
    if (!withdrawValidated?.ok) {
      showToast('error', 'Primero valida el retiro');
      return;
    }
    setWithdrawLoading(true);
    try {
      const monto = Number(withdrawForm.monto);
      const data = await withdrawCreate({
        monto,
        red: withdrawForm.red,
        direccion: withdrawForm.direccion,
        pin: withdrawForm.pin,
      });
      setWithdrawCreated(data?.retiro ?? null);
      showToast('success', 'Retiro creado. Procesando...');
      loadCuenta();
    } catch (e) {
      console.error('[Perfil] /api/withdraw/create error', e);
      showToast('error', e?.message || 'No se pudo crear el retiro');
    } finally {
      setWithdrawLoading(false);
    }
  };

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

      <div className="mt-0 px-4 py-4 border-b border-black/0">
        <div className="bg-white rounded-2xl overflow-hidden">
          {metrics.map((m, idx) => (
            <div key={m.label}>
              <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[12px] text-[#131e29]/60 leading-tight">{m.label}</div>
                  <div className="text-lg font-semibold text-right" style={neonCyanStyle}>
                    {loading ? '—' : m.value}
                  </div>
                </div>
              </div>
              {idx < metrics.length - 1 ? <div className="h-px bg-black/10" /> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-0 bg-white overflow-hidden border-b border-black/10">
        <div className="px-4 py-4">
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={handleCreateDepositAddress}
              disabled={depositLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#131e29] hover:opacity-90 px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
            >
              <QrCode className="w-4 h-4" />
              Recargar
            </button>
          </div>

          {!isCuentaActiva ? (
            <div className="mt-2 text-[11px] text-red-400">Debes tener un plan activo para poder retirar.</div>
          ) : (
            <div className="mt-2 text-[11px] text-[#131e29]/70">
              El retiro mínimo es de 5 USDT. Se descontará comisión de 1 USDT por retiro
            </div>
          )}
        </div>

        <div className="h-px bg-black/10" />
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-black/5 transition"
          onClick={() => navigate('/invitar')}
        >
          <div className="flex items-center gap-3">
            <Gift className="w-5 h-5 text-[#131e29]/70" />
            <div className="text-sm font-semibold">Invitar amigo</div>
          </div>
          <div className="text-[#131e29]/40">›</div>
        </button>

        <div className="h-px bg-black/10" />
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-black/5 transition"
          onClick={() => navigate('/tutorial')}
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-[#131e29]/70" />
            <div className="text-sm font-semibold">Tutorial</div>
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

      {deposit ? (
        <div className="mt-4 px-4">
          <div className="rounded-2xl bg-white border border-black/10 p-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#131e29]">
              <WalletIcon className="w-5 h-5 text-[#131e29]/70" />
              Dirección de depósito
            </div>

            <div className="mt-3">
              <div className="text-[12px] text-[#131e29]/60">Red</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="text-[12px] text-[#131e29]/90 font-mono break-all">{depositNetwork || '—'}</div>
                {depositNetwork ? (
                  <button
                    type="button"
                    onClick={() => handleCopy(depositNetwork)}
                    className="shrink-0 rounded-lg border border-black/10 bg-white p-2 hover:bg-black/5 transition"
                    aria-label="Copiar red"
                  >
                    <Copy className="w-4 h-4 text-[#131e29]/70" />
                  </button>
                ) : null}
              </div>

              <div className="mt-2 text-[12px] text-[#131e29]/60">Dirección</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="text-[12px] text-[#131e29]/90 font-mono break-all">{depositAddress || '—'}</div>
                {depositAddress ? (
                  <button
                    type="button"
                    onClick={() => handleCopy(depositAddress)}
                    className="shrink-0 rounded-lg border border-black/10 bg-white p-2 hover:bg-black/5 transition"
                    aria-label="Copiar dirección"
                  >
                    <Copy className="w-4 h-4 text-[#131e29]/70" />
                  </button>
                ) : null}
              </div>

              {depositMemo ? (
                <>
                  <div className="mt-2 text-[12px] text-[#131e29]/60">Memo</div>
                  <div className="text-[12px] text-[#131e29]/90 font-mono break-all">{depositMemo}</div>
                </>
              ) : null}

              <button
                type="button"
                onClick={handleConfirmDeposit}
                disabled={confirmDepositLoading}
                className="mt-3 w-full rounded-xl bg-[#131e29] hover:opacity-90 border border-[#131e29] py-3 text-sm font-semibold text-white transition disabled:opacity-50"
              >
                {confirmDepositLoading ? 'Confirmando...' : 'Confirmar pago'}
              </button>

              <button
                type="button"
                onClick={openWithdrawSupportTelegram}
                className="mt-3 w-full rounded-xl bg-white hover:bg-black/5 border border-black/10 py-3 text-sm font-semibold text-[#131e29]/80 transition"
              >
                Problema al retirar
              </button>
            </div>

            <div className="mt-3 text-[11px] text-[#131e29]/60">
              Envía únicamente USDT por la red indicada. Si envías otra moneda o red, podrías perder los fondos.
            </div>
          </div>
        </div>
      ) : null}

      {withdrawOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={closeWithdraw}
            aria-label="Cerrar"
          />

          <div className="relative w-full max-w-sm rounded-2xl border border-black/10 bg-white p-5 text-[#131e29]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Retirar USDT</div>
                <div className="mt-1 text-xs text-[#131e29]/60">Primero valida, luego confirma.</div>
              </div>
              <button
                type="button"
                onClick={closeWithdraw}
                className="rounded-lg px-2 py-1 text-[#131e29]/60 hover:text-[#131e29] hover:bg-black/5 transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-[#131e29]/70 mb-2">Monto (total)</label>
                <input
                  value={withdrawForm.monto}
                  onChange={(e) => setWithdrawForm((p) => ({ ...p, monto: e.target.value }))}
                  placeholder="11"
                  className="w-full rounded-xl bg-white border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/20"
                />
              </div>

              <div>
                <label className="block text-xs text-[#131e29]/70 mb-2">Red</label>
                <select
                  value={withdrawForm.red}
                  onChange={(e) => setWithdrawForm((p) => ({ ...p, red: e.target.value }))}
                  className="w-full rounded-xl bg-white border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/20"
                  disabled
                >
                  <option value="BEP20-USDT">BEP20-USDT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#131e29]/70 mb-2">Dirección externa</label>
                <input
                  value={withdrawForm.direccion}
                  onChange={(e) => setWithdrawForm((p) => ({ ...p, direccion: e.target.value }))}
                  placeholder="0x... / T..."
                  className="w-full rounded-xl bg-white border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/20"
                />
              </div>

              <div>
                <label className="block text-xs text-[#131e29]/70 mb-2">PIN</label>
                <input
                  type="password"
                  value={withdrawForm.pin}
                  onChange={(e) => setWithdrawForm((p) => ({ ...p, pin: e.target.value }))}
                  placeholder="1234"
                  className="w-full rounded-xl bg-white border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/20"
                />
                {withdrawPinFailedAttempts >= 2 ? (
                  <button
                    type="button"
                    onClick={() => setWithdrawPinResetOpen(true)}
                    className="mt-2 text-[11px] text-[#131e29] font-semibold hover:text-[#131e29]/80 transition"
                    disabled={withdrawLoading}
                  >
                    ¿Olvidaste tu PIN? Reiniciarlo
                  </button>
                ) : null}
              </div>
            </div>

            {withdrawPinResetOpen ? (
              <div className="mt-4 rounded-xl border border-black/10 bg-white p-3">
                <div className="text-xs text-[#131e29]/70">Reiniciar PIN</div>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs text-[#131e29]/70 mb-2">Contraseña</label>
                    <input
                      type="password"
                      value={withdrawPinResetPassword}
                      onChange={(e) => setWithdrawPinResetPassword(e.target.value)}
                      placeholder="Tu contraseña"
                      className="w-full rounded-xl bg-white border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#131e29]/70 mb-2">Nuevo PIN</label>
                    <input
                      type="password"
                      value={withdrawPinResetNewPin}
                      onChange={(e) => setWithdrawPinResetNewPin(e.target.value)}
                      placeholder="1234"
                      className="w-full rounded-xl bg-white border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#131e29]/70 mb-2">Confirmar nuevo PIN</label>
                    <input
                      type="password"
                      value={withdrawPinResetConfirmPin}
                      onChange={(e) => setWithdrawPinResetConfirmPin(e.target.value)}
                      placeholder="1234"
                      className="w-full rounded-xl bg-white border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWithdrawPinResetOpen(false)}
                      className="rounded-xl bg-white hover:bg-black/5 border border-black/10 py-3 text-sm font-semibold transition disabled:opacity-50"
                      disabled={withdrawLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleWithdrawResetPin}
                      className="rounded-xl bg-[#131e29] hover:opacity-90 border border-[#131e29] py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                      disabled={withdrawLoading}
                    >
                      {withdrawLoading ? 'Guardando...' : 'Guardar PIN'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {withdrawValidated?.ok ? (
              <div className="mt-4 rounded-xl border border-black/10 bg-black/5 p-3">
                <div className="text-xs text-[#131e29]/70">Resumen</div>
                <div className="mt-1 text-sm text-[#131e29] font-semibold">
                  {Number(withdrawValidated?.total || 0).toFixed(2)} - {Number(withdrawValidated?.fee || 0).toFixed(2)} = {Number(withdrawValidated?.monto || 0).toFixed(2)} USDT
                </div>
              </div>
            ) : null}

            {withdrawCreated ? (
              <div className="mt-4 rounded-xl border border-black/10 bg-white p-3">
                <div className="text-xs text-[#131e29]/70">Estado</div>
                <div className="mt-1 text-sm text-[#131e29]/80">{String(withdrawCreated?.estado || 'pendiente')}</div>
              </div>
            ) : null}

            {withdrawNeedsPinSetup ? (
              <div className="mt-4 rounded-xl border border-black/10 bg-black/5 p-3">
                <div className="text-xs text-[#131e29]/80">Tu PIN de retiro no está configurado.</div>
                <button
                  type="button"
                  onClick={handleWithdrawSetPin}
                  disabled={withdrawLoading}
                  className="mt-3 w-full rounded-xl bg-[#131e29] hover:opacity-90 border border-[#131e29] py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                >
                  {withdrawLoading ? 'Guardando...' : 'Configurar PIN'}
                </button>
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleWithdrawValidate}
                disabled={withdrawLoading || !isCuentaActiva}
                className="rounded-xl bg-white hover:bg-black/5 border border-black/10 py-3 text-sm font-semibold transition disabled:opacity-50"
              >
                {withdrawLoading ? 'Validando...' : 'Validar'}
              </button>
              <button
                type="button"
                onClick={handleWithdrawCreate}
                disabled={withdrawLoading || !withdrawValidated?.ok}
                className="rounded-xl bg-[#131e29] hover:opacity-90 border border-[#131e29] py-3 text-sm font-semibold text-white transition disabled:opacity-50"
              >
                {withdrawLoading ? 'Creando...' : 'Confirmar'}
              </button>
            </div>

            <button
              type="button"
              onClick={openWithdrawSupportTelegram}
              className="mt-3 w-full rounded-xl bg-white hover:bg-black/5 border border-black/10 py-3 text-sm font-semibold text-[#131e29]/80 transition"
            >
              Problema al retirar
            </button>
          </div>
        </div>
      )}

      <div className="h-24" />
    </div>
  );
};

export default Perfil;
