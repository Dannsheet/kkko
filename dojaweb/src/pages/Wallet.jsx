import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, QrCode, RefreshCw, Send, Wallet as WalletIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { supabase } from '../supabaseClient';
import {
  createDepositRequest,
  createBankDeposit,
  createVipIntent,
  getCuentaInfo,
  getMyBankDeposits,
  getVipCurrent,
  resetWithdrawPin,
  setWithdrawPin,
  withdrawCreate,
  withdrawValidate,
} from '../lib/api.js';

const WalletPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [saldoInterno, setSaldoInterno] = useState(0);
  const [saldoGanancias, setSaldoGanancias] = useState(0);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState(null);

  const [depositLoading, setDepositLoading] = useState(false);
  const [deposit, setDeposit] = useState(null);
  const [confirmDepositLoading, setConfirmDepositLoading] = useState(false);

  const [rechargeMethod, setRechargeMethod] = useState('crypto');

  const [bankAmount, setBankAmount] = useState('');
  const [bankReceiptFile, setBankReceiptFile] = useState(null);
  const [bankSubmitting, setBankSubmitting] = useState(false);
  const [myBankDepositsLoading, setMyBankDepositsLoading] = useState(false);
  const [myBankDeposits, setMyBankDeposits] = useState([]);

  const [vipActive, setVipActive] = useState(false);
  const [vipLoading, setVipLoading] = useState(false);

  const [pollingActive, setPollingActive] = useState(false);

  const lastBalanceRef = useRef(0);
  const lastVipIntentPlanIdRef = useRef(null);

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

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showToast = useCallback((type, message) => setToast({ type, message }), []);

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

  const openWithdrawSupportTelegram = useCallback(() => {
    const email = String(user?.email || '').trim();
    const message = `Hola soy ${email || ''} tengo problemas con mi retiro`;
    const url = `https://t.me/dajoweb?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [user?.email]);

  const shouldOpenWithdrawFromNav = useMemo(() => Boolean(location?.state?.openWithdraw), [location?.state]);

  useEffect(() => {
    if (!shouldOpenWithdrawFromNav) return;
    setWithdrawOpen(true);
  }, [shouldOpenWithdrawFromNav]);

  const loadCuenta = useCallback(async () => {
    setLoading(true);
    setHistoryLoading(true);
    try {
      const data = await getCuentaInfo();
      const next = Number(data?.balance || 0);
      setSaldoInterno(Number.isFinite(next) ? next : 0);
      const sg = Number(data?.saldo_ganancias);
      setSaldoGanancias(Number.isFinite(sg) ? sg : 0);
      setHistory(data?.movimientos_recientes ?? null);

      return {
        balance: Number.isFinite(next) ? next : 0,
      };
    } catch (e) {
      console.error('[Wallet] /cuenta/info error', e);
      showToast('error', e?.message || 'No se pudo cargar tu cuenta');
      setSaldoInterno(0);
      setSaldoGanancias(0);
      setHistory(null);
      return null;
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  }, [showToast]);

  const bankAccounts = useMemo(
    () => [
      {
        title: 'Cuenta 1',
        bank: '—',
        holder: '—',
        account: '—',
        type: '—',
      },
      {
        title: 'Cuenta 2',
        bank: '—',
        holder: '—',
        account: '—',
        type: '—',
      },
      {
        title: 'Cuenta 3',
        bank: '—',
        holder: '—',
        account: '—',
        type: '—',
      },
    ],
    [],
  );

  const loadMyBankDeposits = useCallback(async () => {
    setMyBankDepositsLoading(true);
    try {
      const resp = await getMyBankDeposits();
      setMyBankDeposits(Array.isArray(resp?.items) ? resp.items : []);
    } catch {
      setMyBankDeposits([]);
    } finally {
      setMyBankDepositsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyBankDeposits();
  }, [loadMyBankDeposits]);

  const buildReceiptPublicPreview = useCallback(async (path) => {
    const bucket = 'bank-receipts';
    const clean = String(path || '').trim();
    if (!clean) return null;
    try {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(clean, 60 * 60);
      return data?.signedUrl ?? null;
    } catch {
      return null;
    }
  }, []);

  const [bankReceiptPreviewUrl, setBankReceiptPreviewUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!bankReceiptFile) {
      setBankReceiptPreviewUrl(null);
      return () => {
        alive = false;
      };
    }
    try {
      const url = URL.createObjectURL(bankReceiptFile);
      setBankReceiptPreviewUrl(url);
      return () => {
        alive = false;
        try {
          if (alive) return;
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      };
    } catch {
      setBankReceiptPreviewUrl(null);
    }
    return () => {
      alive = false;
    };
  }, [bankReceiptFile]);

  const handleSubmitBankDeposit = async () => {
    const amount = Number(bankAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('error', 'Monto inválido');
      return;
    }
    if (!bankReceiptFile) {
      showToast('error', 'Debes subir el comprobante');
      return;
    }

    setBankSubmitting(true);
    try {
      const bucket = 'bank-receipts';
      const ext = String(bankReceiptFile.name || '').split('.').pop() || 'jpg';
      const safeExt = ext.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'jpg';
      const path = `${String(user?.id || 'anonymous')}/${Date.now()}.${safeExt}`;

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(path, bankReceiptFile, { upsert: false, contentType: bankReceiptFile.type || undefined });
      if (uploadErr) throw uploadErr;

      await createBankDeposit({ amount, receipt_path: path });
      showToast('success', 'Solicitud enviada. Espera aprobación.');
      setBankAmount('');
      setBankReceiptFile(null);
      await loadMyBankDeposits();
    } catch (e) {
      showToast('error', e?.message || 'No se pudo enviar la solicitud');
    } finally {
      setBankSubmitting(false);
    }
  };

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

  useEffect(() => {
    loadCuenta();
  }, [loadCuenta]);

  useEffect(() => {
    lastBalanceRef.current = Number(saldoInterno || 0);
  }, [saldoInterno]);

  const vipPlanIdFromNav = useMemo(() => {
    const raw = location?.state?.vipPlanId;
    const n = Number.parseInt(String(raw ?? '').trim(), 10);
    return Number.isFinite(n) ? n : null;
  }, [location?.state?.vipPlanId]);

  useEffect(() => {
    if (!vipPlanIdFromNav) return;
    if (lastVipIntentPlanIdRef.current === vipPlanIdFromNav) return;
    lastVipIntentPlanIdRef.current = vipPlanIdFromNav;

    createVipIntent(vipPlanIdFromNav)
      .then(() => {
        showToast('success', 'Plan seleccionado. Deposita para activar tu VIP.');
      })
      .catch((e) => {
        console.error('[Wallet] create vip intent error', e);
      });
  }, [showToast, vipPlanIdFromNav]);

  const formattedBalance = useMemo(() => Number(saldoInterno || 0).toFixed(2), [saldoInterno]);

  const formattedSaldoGanancias = useMemo(() => Number(saldoGanancias || 0).toFixed(2), [saldoGanancias]);

  const withdrawBalanceNumber = useMemo(() => Number(saldoGanancias || 0), [saldoGanancias]);

  const estado = useMemo(() => '—', []);

  const isCuentaActiva = useMemo(() => Boolean(vipActive), [vipActive]);

  const withdrawFeePercent = useMemo(
    () => ({
      'BEP20-USDT': 0.1,
    }),
    [],
  );

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
      console.error('[Wallet] /deposit/request error', e);
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
      const res = await loadCuenta();
      const next = Number(res?.balance);

      let vipActive = false;
      try {
        const vip = await getVipCurrent();
        vipActive = Boolean(vip?.is_active);
      } catch {
        // ignore
      }

      if (vipActive) {
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
      console.error('[Wallet] confirm deposit error', e);
      showToast('error', e?.message || 'No se pudo actualizar');
    } finally {
      setConfirmDepositLoading(false);
    }
  };

  useEffect(() => {
    if (!pollingActive) return;
    const id = window.setInterval(() => {
      loadCuenta().then((res) => {
        const prev = lastBalanceRef.current;
        const next = Number(res?.balance);
        if (Number.isFinite(next) && next > prev) {
          setPollingActive(false);
        }
      }).then(() => {
        return getVipCurrent().then((vip) => {
          if (vip?.is_active) setPollingActive(false);
        });
      }).catch(() => {
        // ignore
      });
    }, 10_000);
    return () => window.clearInterval(id);
  }, [loadCuenta, pollingActive]);

  const validateWithdrawForm = () => {
    const monto = Number(withdrawForm.monto);
    if (!Number.isFinite(monto) || monto <= 0) return 'Monto inválido';
    if (!withdrawForm.red) return 'Debes seleccionar una red';

    const feePercent = Number(withdrawFeePercent?.[withdrawForm.red]);
    if (!Number.isFinite(feePercent) || feePercent <= 0) return 'Red no soportada';

    if (monto < 3) return `El retiro mínimo es 3 USDT. Ingresa mínimo ${Number(3).toFixed(2)} USDT`;

    const fee = Math.round(monto * feePercent * 100) / 100;
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
      console.error('[Wallet] /api/withdraw/validate error', e);
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
      console.error('[Wallet] reset pin error', e);
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
      console.error('[Wallet] /api/set-withdraw-pin error', e);
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
      closeWithdraw();
      navigate('/perfil', { replace: true });
    } catch (e) {
      console.error('[Wallet] /api/withdraw/create error', e);
      showToast('error', e?.message || 'No se pudo crear el retiro');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const historyItems = useMemo(() => (Array.isArray(history) ? history : null), [history]);

  const extractStatusFromDescripcion = useCallback((descripcion) => {
    const d = String(descripcion || '').toLowerCase();
    if (!d) return '';
    if (d.includes('pendiente')) return 'pendiente';
    if (d.includes('enviado')) return 'enviado';
    if (d.includes('completado')) return 'completado';
    if (d.includes('confirmado')) return 'confirmado';
    if (d.includes('aprobado')) return 'aprobado';
    if (d.includes('rechazado')) return 'rechazado';
    return '';
  }, []);

  const normalizeTipo = useCallback((tipo) => String(tipo || '').toLowerCase(), []);

  const kindFromTipo = useCallback((tipo) => {
    const t = normalizeTipo(tipo);
    if (['ingreso', 'deposito', 'depósito', 'deposit'].includes(t)) return 'deposito';
    if (['retiro', 'withdraw', 'withdrawal'].includes(t)) return 'retiro';
    if (['ganancia', 'ganancias', 'earning', 'earnings'].includes(t)) return 'ganancia';
    if (['suscripcion', 'suscripción', 'subscription', 'suscripciones'].includes(t)) return 'suscripcion';
    return t || 'movimiento';
  }, [normalizeTipo]);

  const normalizeMov = useCallback(
    (raw) => {
      const amount = raw?.monto != null ? Number(raw.monto) : null;
      const createdAt = raw?.creado_en || null;
      const kind = kindFromTipo(raw?.tipo);
      const directEstado = String(raw?.estado || '').trim().toLowerCase();
      const status = directEstado || extractStatusFromDescripcion(raw?.descripcion);

      return {
        id: raw?.id,
        usuario_id: raw?.usuario_id,
        kind,
        tipo: raw?.tipo,
        descripcion: raw?.descripcion,
        status,
        amount: Number.isFinite(amount) ? amount : null,
        createdAt,
      };
    },
    [extractStatusFromDescripcion, kindFromTipo],
  );

  const normalizedHistory = useMemo(() => (historyItems ? historyItems.map(normalizeMov) : []), [historyItems, normalizeMov]);

  const withdrawMontoNumber = useMemo(() => Number(withdrawForm.monto), [withdrawForm.monto]);
  const insufficientByForm = useMemo(
    () =>
      Number.isFinite(withdrawMontoNumber) &&
      withdrawMontoNumber > 0 &&
      withdrawMontoNumber > withdrawBalanceNumber,
    [withdrawMontoNumber, withdrawBalanceNumber],
  );
  const insufficientByValidated = useMemo(() => {
    const total = Number(withdrawValidated?.total);
    if (!Number.isFinite(total) || total <= 0) return false;
    return total > withdrawBalanceNumber;
  }, [withdrawValidated?.total, withdrawBalanceNumber]);

  useEffect(() => {
    const targetId = withdrawCreated?.id;
    if (!targetId) return;

    const match = normalizedHistory.find((m) => m.kind === 'retiro' && String(m.id) === String(targetId));
    if (!match?.status) return;

    const current = String(withdrawCreated?.estado || 'pendiente').toLowerCase();
    if (String(match.status).toLowerCase() === current) return;
    setWithdrawCreated((prev) => (prev ? { ...prev, estado: match.status } : prev));
  }, [normalizedHistory, withdrawCreated?.estado, withdrawCreated?.id]);

  return (
    <div className="min-h-screen bg-white text-[#131e29]">
      <div className="mx-auto w-full max-w-[520px] px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[16px] font-semibold">Billetera</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl bg-white hover:bg-black/5 border border-black/10 px-3 py-2 text-[12px] transition"
              onClick={() => {
                loadCuenta();
              }}
              disabled={loading || historyLoading}
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCw className={(loading || historyLoading) ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
                Actualizar
              </span>
            </button>
            <button
              type="button"
              className="text-[12px] text-[#131e29]/70 hover:text-[#131e29]"
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

        <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[13px] font-semibold text-[#131e29]">Recargar</div>
            <div className="inline-flex rounded-xl border border-black/10 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setRechargeMethod('crypto')}
                className={
                  rechargeMethod === 'crypto'
                    ? 'px-3 py-2 text-[12px] font-semibold bg-black/5 text-[#131e29]'
                    : 'px-3 py-2 text-[12px] font-semibold text-[#131e29]/70 hover:text-[#131e29]'
                }
              >
                Cripto
              </button>
              <button
                type="button"
                onClick={() => setRechargeMethod('bank')}
                className={
                  rechargeMethod === 'bank'
                    ? 'px-3 py-2 text-[12px] font-semibold bg-black/5 text-[#131e29]'
                    : 'px-3 py-2 text-[12px] font-semibold text-[#131e29]/70 hover:text-[#131e29]'
                }
              >
                Banco
              </button>
            </div>
          </div>

          {rechargeMethod === 'bank' ? (
            <div className="mt-3">
              <div className="text-[12px] text-[#131e29]/70">
                Realiza la transferencia a una de las siguientes cuentas y sube el comprobante.
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3">
                {bankAccounts.map((acc, idx) => (
                  <div key={idx} className="rounded-xl border border-black/10 bg-white p-3">
                    <div className="text-sm font-semibold text-[#131e29]">{acc.title}</div>
                    <div className="mt-2 text-[12px] text-[#131e29]/70">Banco: {acc.bank}</div>
                    <div className="mt-1 text-[12px] text-[#131e29]/70">Titular: {acc.holder}</div>
                    <div className="mt-1 text-[12px] text-[#131e29]/70">Tipo: {acc.type}</div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="text-[12px] text-[#131e29]/70 font-mono break-all">{acc.account}</div>
                      <button
                        type="button"
                        onClick={() => handleCopy(acc.account)}
                        className="shrink-0 rounded-lg border border-black/10 bg-white px-2 py-2 hover:bg-black/5 transition"
                        aria-label="Copiar cuenta"
                      >
                        <Copy className="w-4 h-4 text-[#131e29]/70" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <div>
                  <div className="text-[12px] text-[#131e29]/70 mb-2">Monto (USDT)</div>
                  <input
                    value={bankAmount}
                    onChange={(e) => setBankAmount(e.target.value)}
                    placeholder="10"
                    className="w-full rounded-xl bg-white border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/20"
                    disabled={bankSubmitting}
                  />
                </div>

                <div>
                  <div className="text-[12px] text-[#131e29]/70 mb-2">Comprobante (imagen)</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setBankReceiptFile(f);
                    }}
                    className="w-full text-sm"
                    disabled={bankSubmitting}
                  />
                  {bankReceiptPreviewUrl ? (
                    <img
                      src={bankReceiptPreviewUrl}
                      alt="Comprobante"
                      className="mt-3 w-full max-h-[260px] object-contain rounded-xl border border-black/10"
                    />
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={handleSubmitBankDeposit}
                  disabled={bankSubmitting}
                  className="rounded-xl bg-[#131e29] hover:opacity-90 border border-[#131e29] py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                >
                  {bankSubmitting ? 'Enviando...' : 'Enviar comprobante'}
                </button>
              </div>

              <div className="mt-4">
                <div className="text-[12px] font-semibold text-[#131e29]">Mis solicitudes (Banco)</div>
                {myBankDepositsLoading ? (
                  <div className="mt-2 text-sm text-[#131e29]/60">Cargando...</div>
                ) : myBankDeposits.length ? (
                  <div className="mt-2 space-y-2">
                    {myBankDeposits.slice(0, 10).map((row) => (
                      <BankDepositRow key={row.id} row={row} buildReceiptPublicPreview={buildReceiptPublicPreview} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-[#131e29]/60">Aún no tienes solicitudes.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-3 text-[12px] text-[#131e29]/60">
              Usa "Recargar" arriba para generar tu dirección cripto.
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-[#131e29]/70">Saldo interno</div>
            <div className="text-[16px] font-semibold text-[#131e29]">{formattedBalance} USDT</div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-[12px] text-[#131e29]/70">Total ganado</div>
            <div className="text-[12px] text-[#131e29]/80">{formattedSaldoGanancias} USDT</div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-[12px] text-[#131e29]/70">Estado</div>
            <div className="text-[12px] text-[#131e29]/80">{estado}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setRechargeMethod('crypto');
              handleCreateDepositAddress();
            }}
            disabled={depositLoading}
            className="rounded-2xl bg-[#131e29] hover:opacity-90 border border-[#131e29] p-4 text-left transition disabled:opacity-50"
          >
            <div className="flex items-center gap-2 text-white font-semibold">
              <QrCode className="w-5 h-5" />
              Recargar
            </div>
            <div className="mt-1 text-[12px] text-white/80">Genera tu dirección de depósito</div>
          </button>

          <button
            type="button"
            onClick={openWithdraw}
            disabled={!isCuentaActiva || vipLoading}
            className="rounded-2xl bg-white hover:bg-black/5 p-4 text-left transition disabled:opacity-50"
          >
            <div className="flex items-center gap-2 text-[#131e29] font-semibold">
              <Send className="w-5 h-5" />
              Retirar
            </div>
            <div className="mt-1 text-[12px] text-[#131e29]/70">Solicitud de retiro (PIN)</div>
          </button>
        </div>

        
        {!isCuentaActiva ? (
          <div className="mt-3 text-[11px] text-red-400">
            Debes tener un plan activo para poder retirar.
          </div>
        ) : null}

        {isCuentaActiva ? (
          <div className="mt-3 text-[11px] text-[#131e29]/70">
            El retiro mínimo es de 3 USDT. Se descontará comisión del 10% por retiro
          </div>
        ) : null}

        {deposit && (
          <div className="mt-4 rounded-2xl bg-white border border-black/10 p-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#131e29]">
              <WalletIcon className="w-5 h-5 text-[#131e29]/70" />
              Dirección de depósito
            </div>
            <div className="mt-3 flex items-start gap-4">
              <div className="min-w-0">
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
                  className="mt-3 w-full rounded-xl bg-doja-cyan/20 hover:bg-doja-cyan/30 border border-doja-cyan/40 py-3 text-sm font-semibold text-doja-cyan transition disabled:opacity-50"
                >
                  {confirmDepositLoading ? 'Confirmando...' : 'Confirmar pago'}
                </button>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-[#131e29]/60">
              Envía únicamente USDT por la red indicada. Si envías otra moneda o red, podrías perder los fondos.
            </div>
          </div>
        )}

        {null}
      </div>

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
                {insufficientByForm ? <div className="mt-2 text-[11px] text-[#131e29]/70">Saldo insuficiente.</div> : null}
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
                {insufficientByValidated ? (
                  <div className="mt-2 text-[11px] text-[#131e29]/70">Saldo insuficiente para cubrir el total.</div>
                ) : null}
              </div>
            ) : null}

            {withdrawCreated ? (
              <div className="mt-4 rounded-xl border border-black/10 bg-white p-3">
                <div className="text-xs text-[#131e29]/70">Estado</div>
                <div className="mt-1 text-sm text-[#131e29]/80">{String(withdrawCreated?.estado || 'pendiente')}</div>
                {withdrawCreated?.id ? (
                  <div className="mt-1 text-[11px] text-[#131e29]/60 font-mono break-all">id: {String(withdrawCreated.id)}</div>
                ) : null}
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
                disabled={withdrawLoading || insufficientByForm || !isCuentaActiva}
                className="rounded-xl bg-white hover:bg-black/5 border border-black/10 py-3 text-sm font-semibold transition disabled:opacity-50"
              >
                {withdrawLoading ? 'Validando...' : 'Validar'}
              </button>
              <button
                type="button"
                onClick={handleWithdrawCreate}
                disabled={withdrawLoading || !withdrawValidated?.ok || insufficientByValidated}
                className="rounded-xl bg-[#131e29] hover:opacity-90 border border-[#131e29] py-3 text-sm font-semibold text-white transition disabled:opacity-50"
              >
                {withdrawLoading ? 'Creando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BankDepositRow = ({ row, buildReceiptPublicPreview }) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let alive = true;
    const path = String(row?.receipt_path || '').trim();
    if (!path) {
      const timer = setTimeout(() => {
        if (alive) setUrl(null);
      }, 0);
      return () => {
        alive = false;
        clearTimeout(timer);
      };
    }
    buildReceiptPublicPreview(path).then((u) => {
      if (!alive) return;
      setUrl(u || null);
    });
    return () => {
      alive = false;
    };
  }, [buildReceiptPublicPreview, row?.receipt_path]);

  return (
    <div className="rounded-xl border border-black/10 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-[#131e29] font-semibold">{Number(row?.amount ?? 0).toFixed(2)} USDT</div>
          <div className="mt-1 text-[11px] text-[#131e29]/60 font-mono break-all">{String(row?.id || '')}</div>
          <div className="mt-1 text-[12px] text-[#131e29]/70">estado: {String(row?.status || '—')}</div>
        </div>
      </div>
      {url ? (
        <img src={url} alt="Comprobante" className="mt-3 w-full max-h-[220px] object-contain rounded-xl border border-black/10" />
      ) : null}
    </div>
  );
};

export default WalletPage;
