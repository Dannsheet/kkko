import { supabase } from '../supabaseClient';

const _apiFetchCache = new Map();

const parseJsonSafely = async (res) => {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  const trimmed = String(text).trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    return { html: trimmed };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const API_BASE_URL = (() => {
  try {
    const raw = import.meta?.env?.VITE_BACKEND_URL || '';
    return String(raw || '').replace(/\/$/, '');
  } catch {
    return '';
  }
})();

export const apiFetch = async (path, options = {}) => {
  const { method = 'GET', body, headers: extraHeaders, cacheTtlMs = 0 } = options;

  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;

  const headers = { Accept: 'application/json', ...(extraHeaders || {}) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const url = (() => {
    if (/^https?:\/\//i.test(path)) return path;
    if (String(path || '').startsWith('/api/pexels')) return path;
    if (!API_BASE_URL) return path;
    if (String(path || '').startsWith('/')) return `${API_BASE_URL}${path}`;
    return `${API_BASE_URL}/${path}`;
  })();

  const cacheTtl = Number(cacheTtlMs || 0);
  const canCache = method === 'GET' && body === undefined && Number.isFinite(cacheTtl) && cacheTtl > 0;
  const cacheKey = canCache ? `${accessToken || ''}|${url}` : '';
  if (canCache) {
    const hit = _apiFetchCache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) return hit.payload;
    if (hit) _apiFetchCache.delete(cacheKey);
  }

  if (
    import.meta.env.PROD &&
    !API_BASE_URL &&
    !/^https?:\/\//i.test(path) &&
    String(path || '').startsWith('/api/')
  ) {
    throw new Error(
      'Falta configurar VITE_BACKEND_URL en producción (Vercel). Debe ser, por ejemplo: https://lol-backend-production.up.railway.app'
    );
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await parseJsonSafely(res);

  if (!res.ok) {
    const primary = payload && (payload.error || payload.message);
    const msg =
      (typeof primary === 'string' ? primary : primary ? JSON.stringify(primary) : '') ||
      (payload && payload.html ? `Endpoint no encontrado (${res.status})` : '') ||
      (payload && typeof payload.raw === 'string' ? payload.raw : '') ||
      `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  if (canCache) {
    _apiFetchCache.set(cacheKey, { expiresAt: Date.now() + cacheTtl, payload });
  } else if (method !== 'GET') {
    _apiFetchCache.clear();
  }

  return payload;
};

export const getMe = () => apiFetch('/api/me', { cacheTtlMs: 8000 });

export const adminGetSummary = () => apiFetch('/api/admin/summary');

export const adminGetUsers = ({ search, limit, offset } = {}) => {
  const params = new URLSearchParams();
  if (search) params.set('search', String(search));
  if (Number.isFinite(Number(limit))) params.set('limit', String(limit));
  if (Number.isFinite(Number(offset))) params.set('offset', String(offset));
  const q = params.toString();
  return apiFetch(`/api/admin/users${q ? `?${q}` : ''}`);
};

export const adminGetUserDetail = (userId) => {
  if (!userId) throw new Error('Falta userId');
  return apiFetch(`/api/admin/users/${encodeURIComponent(String(userId))}`);
};

export const adminGetUserReferrals = (userId) => {
  if (!userId) throw new Error('Falta userId');
  return apiFetch(`/api/admin/users/${encodeURIComponent(String(userId))}/referrals`);
};

export const adminConfirmUserWithdrawal = ({ userId, withdrawalId }) => {
  if (!userId) throw new Error('Falta userId');
  if (!withdrawalId) throw new Error('Falta withdrawalId');
  return apiFetch(
    `/api/admin/users/${encodeURIComponent(String(userId))}/withdrawals/${encodeURIComponent(String(withdrawalId))}/confirm`,
    { method: 'POST' },
  );
};

export const getWalletHistory = () => apiFetch('/api/wallet/history');

export const createDepositAddress = () => apiFetch('/api/deposit/address', { method: 'POST' });

export const withdrawValidate = async (body) => {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) throw new Error('Debes iniciar sesión');
  return apiFetch('/api/withdraw/validate', { method: 'POST', body });
};

export const withdrawCreate = async (body) => {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) throw new Error('Debes iniciar sesión');
  return apiFetch('/api/withdraw/create', { method: 'POST', body });
};

export const setWithdrawPin = async (pin) => {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) throw new Error('Debes iniciar sesión');
  return apiFetch('/api/set-withdraw-pin', { method: 'POST', body: { pin } });
};

export const resetWithdrawPin = async ({ password, pin }) => {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) throw new Error('Debes iniciar sesión');
  return apiFetch('/api/withdraw/pin/reset', { method: 'POST', body: { password, pin } });
};

export const getUserBalance = async () => {
  try {
    return await apiFetch('/api/user/balance');
  } catch (e) {
    if (e?.status !== 404) throw e;
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) throw new Error('Debes iniciar sesión');

    const tryTables = [
      { table: 'cuentas', col: 'user_id', field: 'balance' },
      { table: 'cuentas', col: 'usuario_id', field: 'balance' },
      { table: 'usuarios', col: 'id', field: 'balance' },
    ];

    let lastErr;
    for (const cfg of tryTables) {
      const { data: row, error } = await supabase
        .from(cfg.table)
        .select(cfg.field)
        .eq(cfg.col, userId)
        .maybeSingle();
      if (error) {
        lastErr = error;
        continue;
      }
      const bal = Number(row?.[cfg.field] || 0);
      return { saldo_interno: Number.isFinite(bal) ? bal : 0 };
    }
    throw new Error(lastErr?.message || 'No se pudo obtener el saldo');
  }
};

export const createDepositRequest = async (body) => {
  const resp = await apiFetch('/api/deposit/address', { method: 'POST', body });
  const address =
    resp?.address ||
    resp?.payment_address ||
    resp?.direccion ||
    resp?.data?.address ||
    resp?.data?.payment_address ||
    '';
  const network = resp?.network || resp?.red || resp?.data?.network || resp?.data?.red || '';

  return {
    message: 'Dirección de depósito generada',
    data: {
      payment_address: String(address || '').trim(),
      network: String(network || '').trim(),
    },
  };
};

export const createVipIntent = (planId) =>
  apiFetch('/api/vip/intent', { method: 'POST', body: { plan_id: planId } });

export const buyVip = (planId) => apiFetch('/api/vip/buy', { method: 'POST', body: { plan_id: planId } });

export const startVipTrial = (planId) => apiFetch('/api/vip/trial/start', { method: 'POST', body: { plan_id: planId } });

export const getVipCurrent = async () => {
  try {
    return await apiFetch('/api/vip/current');
  } catch (e) {
    if (e?.status !== 404) throw e;
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) return { is_active: false };

    const nowIso = new Date().toISOString();
    const candidates = [
      { table: 'suscripciones', col: 'usuario_id' },
      { table: 'suscripciones', col: 'user_id' },
      { table: 'subscriptions', col: 'user_id' },
      { table: 'subscriptions', col: 'usuario_id' },
    ];

    let lastErr;
    for (const c of candidates) {
      const { data: row, error } = await supabase
        .from(c.table)
        .select('*')
        .eq(c.col, userId)
        .order('expires_at', { ascending: false })
        .maybeSingle();
      if (error) {
        lastErr = error;
        continue;
      }

      const expiresAt = row?.expires_at || row?.expira_en || row?.vence_en || null;
      const isActiveFlag = row?.is_active ?? row?.activa ?? row?.activo;
      const isActive = Boolean(isActiveFlag) && (!expiresAt || String(expiresAt) > nowIso);

      return {
        is_active: isActive,
        expires_at: expiresAt,
        plan: row?.plan || null,
      };
    }

    throw new Error(lastErr?.message || 'No se pudo validar la suscripción');
  }
};

export const vipActivate = async (planId) => {
  try {
    return await apiFetch('/api/vip/activate', { method: 'POST', body: { plan_id: planId } });
  } catch (e) {
    if (e?.status !== 404) throw e;
    return apiFetch('/api/vip/buy', { method: 'POST', body: { plan_id: planId } });
  }
};

export const getBalanceMovements = async () => {
  try {
    return await apiFetch('/api/balance/movements');
  } catch (e) {
    if (e?.status !== 404) throw e;
    return apiFetch('/api/wallet/history');
  }
};

export const getMyPlan = () => apiFetch('/api/suscripcion/mi-plan');

export const getMyPlans = async () => {
  try {
    return await apiFetch('/api/suscripcion/mis-planes');
  } catch (e) {
    if (e?.status !== 404) throw e;
    const single = await getMyPlan();
    if (single?.plan_activo) {
      return {
        ok: true,
        planes: [
          {
            subscription_id: null,
            plan_id: single?.plan_id,
            nombre: single?.nombre ?? null,
            limite_tareas: single?.limite_tareas ?? null,
            ganancia_diaria: single?.ganancia_diaria ?? null,
            expira_en: single?.expira_en ?? null,
            created_at: null,
          },
        ],
      };
    }
    return { ok: true, planes: [] };
  }
};

export const getReviewsStatus = () => apiFetch('/api/reviews/status', { cacheTtlMs: 12000 });

export const getReviewsModels = () => apiFetch('/api/reviews/models', { cacheTtlMs: 60000 });

export const submitReview = ({ modelo_id, estrellas, comentario, plan_id } = {}) =>
  apiFetch('/api/reviews/enviar', {
    method: 'POST',
    body: { modelo_id, estrellas, comentario, plan_id },
  });

// Legacy wrappers kept for backward compatibility in older screens/components.
export const getVideosStatus = () => getReviewsStatus();

export const verVideo = ({ video_id, calificacion, comentario, plan_id } = {}) =>
  submitReview({ modelo_id: video_id, estrellas: calificacion, comentario, plan_id });

export const getCuentaInfo = async () => {
  const ts = Date.now();
  const [cuentaRes, meRes] = await Promise.allSettled([
    apiFetch(`/api/cuenta/info?ts=${ts}`, { cacheTtlMs: 8000 }),
    getMe(),
  ]);

  const cuenta = cuentaRes.status === 'fulfilled' ? cuentaRes.value : null;
  const me = meRes.status === 'fulfilled' ? meRes.value : null;

  const saldoInterno = Number(me?.usuario?.saldo_interno ?? me?.usuario?.saldoInterno ?? NaN);
  const cuentaBalance = Number(cuenta?.balance ?? cuenta?.saldo_interno ?? cuenta?.saldoInterno ?? NaN);
  const nextBalance = Number.isFinite(saldoInterno) ? saldoInterno : Number.isFinite(cuentaBalance) ? cuentaBalance : 0;

  const totalGanado = Number(
    cuenta?.total_ganado ??
      cuenta?.totalGanado ??
      me?.cuenta?.total_ganado ??
      me?.cuenta?.totalGanado ??
      NaN
  );

  return {
    ...(typeof cuenta === 'object' && cuenta ? cuenta : {}),
    saldo_interno: nextBalance,
    balance: nextBalance,
    total_ganado: Number.isFinite(totalGanado) ? totalGanado : 0,
  };
};

export const linkReferral = (invite_code) =>
  apiFetch('/api/referrals/link', { method: 'POST', body: { invite_code } });

export const getMyReferrals = () => apiFetch('/api/referrals/me/referrals');

export const getMyCommissions = () => apiFetch('/api/referrals/me/commissions');

export const getMyReferralProfile = () => apiFetch('/api/referrals/me/profile');

export const getMyReferralStats = () => apiFetch('/api/referrals/me/stats', { cacheTtlMs: 15000 });

export const getMyDeposits = () => apiFetch('/api/deposits/me');

export const getMyWithdrawals = () => apiFetch('/api/withdraw/me');

export const getMyReferralMembers = (level) => {
  const n = Number(level);
  const q = Number.isFinite(n) && n > 0 ? `?level=${encodeURIComponent(String(n))}` : '';
  return apiFetch(`/api/referrals/me/members${q}`);
};
