import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, Users } from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  adminConfirmUserWithdrawal,
  adminGetSummary,
  adminGetBankDeposits,
  adminApproveBankDeposit,
  adminRejectBankDeposit,
  adminGetBankDepositReceiptUrl,
  adminGetBankWithdrawals,
  adminGetBankWithdrawalReceiptUrl,
  adminMarkBankWithdrawalPaid,
  adminRejectBankWithdrawal,
  adminGetUserDetail,
  adminGetUserReferrals,
  adminGetUsers,
} from '../lib/api.js';

const Admin = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState(null);

  const [usersLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmingWithdrawalId, setConfirmingWithdrawalId] = useState(null);
  const [selectedReferralsOpen, setSelectedReferralsOpen] = useState(false);
  const [selectedReferralsLoading, setSelectedReferralsLoading] = useState(false);
  const [selectedReferrals, setSelectedReferrals] = useState(null);

  const [bankDepositsLoading, setBankDepositsLoading] = useState(false);
  const [bankDeposits, setBankDeposits] = useState([]);
  const [bankActionId, setBankActionId] = useState(null);

  const [bankReceiptOpen, setBankReceiptOpen] = useState(false);
  const [bankReceiptLoading, setBankReceiptLoading] = useState(false);
  const [bankReceiptUrl, setBankReceiptUrl] = useState(null);
  const [bankReceiptRow, setBankReceiptRow] = useState(null);

  const [bankWithdrawalsLoading, setBankWithdrawalsLoading] = useState(false);
  const [bankWithdrawals, setBankWithdrawals] = useState([]);
  const [bankWithdrawalActionId, setBankWithdrawalActionId] = useState(null);

  const [bankWithdrawalReceiptOpen, setBankWithdrawalReceiptOpen] = useState(false);
  const [bankWithdrawalReceiptLoading, setBankWithdrawalReceiptLoading] = useState(false);
  const [bankWithdrawalReceiptUrl, setBankWithdrawalReceiptUrl] = useState(null);
  const [bankWithdrawalReceiptRow, setBankWithdrawalReceiptRow] = useState(null);

  const [bankWithdrawalUploadId, setBankWithdrawalUploadId] = useState(null);
  const [bankWithdrawalUploadFile, setBankWithdrawalUploadFile] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showToast = (type, message) => setToast({ type, message });

  const loadSummary = useCallback(async () => {
    setError(null);
    const data = await adminGetSummary();
    setSummary(data || null);
  }, []);

  const loadBankDeposits = useCallback(async () => {
    setBankDepositsLoading(true);
    try {
      const resp = await adminGetBankDeposits({ limit: 100 });
      setBankDeposits(Array.isArray(resp?.items) ? resp.items : []);
    } catch {
      setBankDeposits([]);
    } finally {
      setBankDepositsLoading(false);
    }
  }, []);

  const loadBankWithdrawals = useCallback(async () => {
    setBankWithdrawalsLoading(true);
    try {
      const resp = await adminGetBankWithdrawals({ limit: 100 });
      setBankWithdrawals(Array.isArray(resp?.items) ? resp.items : []);
    } catch {
      setBankWithdrawals([]);
    } finally {
      setBankWithdrawalsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const resp = await adminGetUsers({ search: userSearch || undefined, limit: 200, offset: 0 });
      setUsers(Array.isArray(resp?.users) ? resp.users : []);
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch]);

  const loadSelectedUser = useCallback(async (id) => {
    if (!id) return;
    setSelectedLoading(true);
    setSelectedReferralsOpen(false);
    setSelectedReferrals(null);
    try {
      const resp = await adminGetUserDetail(id);
      setSelectedUser(resp || null);
    } finally {
      setSelectedLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadSummary(), loadUsers(), loadBankDeposits(), loadBankWithdrawals()]);
    } catch (e) {
      console.error('[Admin] load error', e);
      setError(e?.message || 'No se pudo cargar el panel admin');
    } finally {
      setLoading(false);
    }
  }, [loadSummary, loadUsers, loadBankDeposits, loadBankWithdrawals]);

  const handleApproveBankDeposit = async (id) => {
    if (!id) return;
    setBankActionId(id);
    try {
      await adminApproveBankDeposit(id);
      showToast('success', 'Depósito banco aprobado');
      await Promise.all([loadBankDeposits(), loadSummary()]);
    } catch (e) {
      showToast('error', e?.message || 'No se pudo aprobar');
    } finally {
      setBankActionId(null);
    }
  };

  const handleRejectBankDeposit = async (id) => {
    if (!id) return;
    setBankActionId(id);
    try {
      await adminRejectBankDeposit(id);
      showToast('success', 'Depósito banco rechazado');
      await loadBankDeposits();
    } catch (e) {
      showToast('error', e?.message || 'No se pudo rechazar');
    } finally {
      setBankActionId(null);
    }
  };

  const closeBankReceipt = () => {
    setBankReceiptOpen(false);
    setBankReceiptLoading(false);
    setBankReceiptUrl(null);
    setBankReceiptRow(null);
  };

  const openBankReceipt = async (row) => {
    const id = row?.id;
    if (!id) return;
    setBankReceiptOpen(true);
    setBankReceiptRow(row || null);
    setBankReceiptLoading(true);
    setBankReceiptUrl(null);
    try {
      const resp = await adminGetBankDepositReceiptUrl(id);
      setBankReceiptUrl(resp?.receipt_url ? String(resp.receipt_url) : null);
    } catch (e) {
      setBankReceiptUrl(null);
      showToast('error', e?.message || 'No se pudo cargar el comprobante');
    } finally {
      setBankReceiptLoading(false);
    }
  };

  const closeBankWithdrawalReceipt = () => {
    setBankWithdrawalReceiptOpen(false);
    setBankWithdrawalReceiptLoading(false);
    setBankWithdrawalReceiptUrl(null);
    setBankWithdrawalReceiptRow(null);
  };

  const openBankWithdrawalReceipt = async (row) => {
    const id = row?.id;
    if (!id) return;
    setBankWithdrawalReceiptOpen(true);
    setBankWithdrawalReceiptRow(row || null);
    setBankWithdrawalReceiptLoading(true);
    setBankWithdrawalReceiptUrl(null);
    try {
      const resp = await adminGetBankWithdrawalReceiptUrl(id);
      setBankWithdrawalReceiptUrl(resp?.receipt_url ? String(resp.receipt_url) : null);
    } catch (e) {
      setBankWithdrawalReceiptUrl(null);
      showToast('error', e?.message || 'No se pudo cargar el comprobante');
    } finally {
      setBankWithdrawalReceiptLoading(false);
    }
  };

  const handleRejectBankWithdrawal = async (id) => {
    if (!id) return;
    setBankWithdrawalActionId(id);
    try {
      await adminRejectBankWithdrawal(id);
      showToast('success', 'Retiro banco rechazado');
      await Promise.all([loadBankWithdrawals(), loadSummary()]);
    } catch (e) {
      showToast('error', e?.message || 'No se pudo rechazar');
    } finally {
      setBankWithdrawalActionId(null);
    }
  };

  const handleUploadBankWithdrawalReceipt = async (row) => {
    const id = row?.id;
    const userId = row?.user_id;
    if (!id || !userId) return;
    if (!bankWithdrawalUploadFile) {
      showToast('error', 'Debes seleccionar un comprobante');
      return;
    }

    setBankWithdrawalUploadId(id);
    try {
      const bucket = 'bank-withdrawals-receipts';
      const ext = String(bankWithdrawalUploadFile.name || '').split('.').pop() || 'jpg';
      const safeExt = ext.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'jpg';
      const path = `${String(userId)}/${String(id)}/${Date.now()}.${safeExt}`;

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(path, bankWithdrawalUploadFile, { upsert: false, contentType: bankWithdrawalUploadFile.type || undefined });
      if (uploadErr) throw uploadErr;

      await adminMarkBankWithdrawalPaid({ id, admin_receipt_path: path });
      showToast('success', 'Retiro banco marcado como pagado');
      setBankWithdrawalUploadFile(null);
      await Promise.all([loadBankWithdrawals(), loadSummary()]);
    } catch (e) {
      showToast('error', e?.message || 'No se pudo subir el comprobante');
    } finally {
      setBankWithdrawalUploadId(null);
    }
  };

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const selectedTotals = selectedUser?.totals ?? null;
  const selectedTeam = selectedUser?.team ?? null;
  const selectedPlans = Array.isArray(selectedUser?.plans) ? selectedUser.plans : [];
  const pendingWithdrawals = Array.isArray(selectedUser?.pending_withdrawals) ? selectedUser.pending_withdrawals : [];

  const teamSize = useMemo(() => {
    const niveles = Array.isArray(selectedTeam?.niveles) ? selectedTeam.niveles : [];
    return niveles.reduce((acc, n) => acc + (Number(n?.plantillaTotal ?? 0) || 0), 0);
  }, [selectedTeam]);

  const openReferrals = async () => {
    if (!selectedUserId) return;
    setSelectedReferralsOpen(true);
    if (selectedReferrals) return;
    setSelectedReferralsLoading(true);
    try {
      const resp = await adminGetUserReferrals(selectedUserId);
      setSelectedReferrals(resp || null);
    } catch (e) {
      showToast('error', e?.message || 'No se pudieron cargar los referidos');
      setSelectedReferrals(null);
    } finally {
      setSelectedReferralsLoading(false);
    }
  };

  const handleConfirmWithdrawal = async (withdrawalId) => {
    if (!selectedUserId || !withdrawalId) return;
    setConfirmingWithdrawalId(withdrawalId);
    try {
      await adminConfirmUserWithdrawal({ userId: selectedUserId, withdrawalId });
      showToast('success', 'Retiro confirmado');
      await loadSelectedUser(selectedUserId);
    } catch (e) {
      showToast('error', e?.message || 'No se pudo confirmar el retiro');
    } finally {
      setConfirmingWithdrawalId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#131e29] p-4">
      {bankReceiptOpen ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center pt-8 px-4 overflow-y-auto">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={closeBankReceipt}
            aria-label="Cerrar"
          />
          <div className="relative w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-5 text-[#131e29] my-8">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Comprobante de depósito</div>
                {bankReceiptRow?.id ? (
                  <div className="mt-1 text-[11px] text-[#131e29]/60 font-mono break-all">{String(bankReceiptRow.id)}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeBankReceipt}
                className="rounded-xl px-3 py-2 text-xs font-semibold transition border bg-[#e9eef3] hover:bg-[#dde6ee] border-black/10 text-[#131e29]"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4">
              {bankReceiptLoading ? (
                <div className="text-sm text-[#131e29]/60">Cargando...</div>
              ) : bankReceiptUrl ? (
                <a href={bankReceiptUrl} target="_blank" rel="noreferrer">
                  <img
                    src={bankReceiptUrl}
                    alt="Comprobante"
                    className="w-full max-h-[75vh] object-contain rounded-xl border border-black/10"
                  />
                </a>
              ) : (
                <div className="text-sm text-[#131e29]/60">Comprobante no disponible.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {bankWithdrawalReceiptOpen ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center pt-8 px-4 overflow-y-auto">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={closeBankWithdrawalReceipt}
            aria-label="Cerrar"
          />
          <div className="relative w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-5 text-[#131e29] my-8">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Comprobante de retiro por banco</div>
                {bankWithdrawalReceiptRow?.id ? (
                  <div className="mt-1 text-[11px] text-[#131e29]/60 font-mono break-all">{String(bankWithdrawalReceiptRow.id)}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeBankWithdrawalReceipt}
                className="rounded-xl px-3 py-2 text-xs font-semibold transition border bg-[#e9eef3] hover:bg-[#dde6ee] border-black/10 text-[#131e29]"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4">
              {bankWithdrawalReceiptLoading ? (
                <div className="text-sm text-[#131e29]/60">Cargando...</div>
              ) : bankWithdrawalReceiptUrl ? (
                <a href={bankWithdrawalReceiptUrl} target="_blank" rel="noreferrer">
                  <img
                    src={bankWithdrawalReceiptUrl}
                    alt="Comprobante"
                    className="w-full max-h-[75vh] object-contain rounded-xl border border-black/10"
                  />
                </a>
              ) : (
                <div className="text-sm text-[#131e29]/60">Comprobante no disponible.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <button
          type="button"
          className="text-sm text-[#131e29]/60 hover:text-[#131e29] transition"
          onClick={() => navigate('/dashboard')}
        >
          Volver
        </button>
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

      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="text-sm font-semibold text-red-400">Error</div>
          <div className="mt-2 text-xs text-[#131e29]/70 font-mono break-words">{error}</div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="text-sm text-[#131e29]/70">Panel general del sistema</div>
        <button
          type="button"
          className="rounded-xl px-3 py-2 text-sm font-semibold transition border bg-[#e9eef3] hover:bg-[#dde6ee] border-black/10 text-[#131e29] flex items-center gap-2"
          onClick={loadAll}
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs text-[#131e29]/60">Usuarios</div>
          <div className="mt-2 text-2xl font-bold text-[#131e29]">{Number(summary?.users_count ?? 0)}</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs text-[#131e29]/60">Monto recargado (cripto)</div>
          <div className="mt-2 text-2xl font-bold text-[#131e29]">{Number(summary?.deposits_total ?? 0).toFixed(2)} USDT</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs text-[#131e29]/60">Monto recargado total banco</div>
          <div className="mt-2 text-2xl font-bold text-[#131e29]">{Number(summary?.bank_deposits_total ?? 0).toFixed(2)} USDT</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs text-[#131e29]/60">Monto recargado total general</div>
          <div className="mt-2 text-2xl font-bold text-[#131e29]">{Number(summary?.total_recharged_general ?? 0).toFixed(2)} USDT</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs text-[#131e29]/60">Retiros (confirmados)</div>
          <div className="mt-2 text-2xl font-bold text-[#131e29]">{Number(summary?.withdrawals_count ?? 0)}</div>
          <div className="mt-1 text-xs text-[#131e29]/60">Monto: {Number(summary?.withdrawals_total ?? 0).toFixed(2)} USDT</div>
          <div className="mt-1 text-[11px] text-[#131e29]/50">
            intentos: {Number(summary?.withdrawals_attempts_count ?? 0)} · monto intentos:{' '}
            {Number(summary?.withdrawals_attempts_total ?? 0).toFixed(2)} USDT
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Depósitos por Banco (manual)</div>
          <div className="text-xs text-[#131e29]/60">
            {bankDepositsLoading ? 'Cargando...' : `${bankDeposits.length}`}
          </div>
        </div>

        {bankDepositsLoading ? (
          <div className="mt-3 text-sm text-[#131e29]/60">Cargando...</div>
        ) : bankDeposits.length ? (
          <div className="mt-3 space-y-3">
            {bankDeposits.slice(0, 50).map((r) => (
              <div key={r.id} className="rounded-xl border border-black/10 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#131e29]">{Number(r.amount ?? 0).toFixed(2)} USDT</div>
                    <div className="mt-1 text-[11px] text-[#131e29]/60 font-mono break-all">{String(r.id)}</div>
                    <div className="mt-1 text-xs text-[#131e29]/70">user: <span className="font-mono break-all">{String(r.user_id || '—')}</span></div>
                    <div className="mt-1 text-xs text-[#131e29]/70">estado: {String(r.status || '—')}</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openBankReceipt(r)}
                      className="rounded-xl bg-[#e9eef3] hover:bg-[#dde6ee] border border-black/10 px-3 py-2 text-xs font-semibold text-[#131e29] transition"
                    >
                      Ver comprobante
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveBankDeposit(r.id)}
                      disabled={Boolean(bankActionId) || String(r.status || '').toLowerCase() !== 'pending'}
                      className="rounded-xl bg-doja-cyan/20 hover:bg-doja-cyan/30 border border-doja-cyan/40 px-3 py-2 text-xs font-semibold text-doja-cyan transition disabled:opacity-50"
                    >
                      {bankActionId === r.id ? 'Procesando...' : 'Aprobar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectBankDeposit(r.id)}
                      disabled={Boolean(bankActionId) || String(r.status || '').toLowerCase() !== 'pending'}
                      className="rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-500 transition disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-[#131e29]/60">Sin solicitudes.</div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Retiros por Banco</div>
          <div className="text-xs text-[#131e29]/60">
            {bankWithdrawalsLoading ? 'Cargando...' : `${bankWithdrawals.length}`}
          </div>
        </div>

        {bankWithdrawalsLoading ? (
          <div className="mt-3 text-sm text-[#131e29]/60">Cargando...</div>
        ) : bankWithdrawals.length ? (
          <div className="mt-3 space-y-3">
            {bankWithdrawals.slice(0, 50).map((r) => {
              const status = String(r.status || '').toLowerCase();
              const createdAt = String(r?.created_at || '').replace('T', ' ').slice(0, 16);
              return (
                <div key={r.id} className="rounded-xl border border-black/10 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#131e29]">{Number(r.total ?? 0).toFixed(2)} USDT</div>
                      <div className="mt-1 text-[11px] text-[#131e29]/60 font-mono break-all">{String(r.id)}</div>
                      <div className="mt-1 text-xs text-[#131e29]/70">usuario: <span className="font-mono break-all">{String(r.user_email || r.user_id || '—')}</span></div>
                      <div className="mt-1 text-xs text-[#131e29]/70">estado: {String(r.status || '—')}</div>
                      <div className="mt-1 text-[12px] text-[#131e29]/70">fecha: {createdAt || '—'}</div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="rounded-lg border border-black/10 p-2">
                          <div className="text-[11px] text-[#131e29]/60">Titular</div>
                          <div className="text-[12px] font-semibold break-words">{String(r.holder_name || '—')}</div>
                        </div>
                        <div className="rounded-lg border border-black/10 p-2">
                          <div className="text-[11px] text-[#131e29]/60">Banco</div>
                          <div className="text-[12px] font-semibold break-words">{String(r.bank_name || '—')}</div>
                        </div>
                        <div className="rounded-lg border border-black/10 p-2">
                          <div className="text-[11px] text-[#131e29]/60">Tipo de cuenta</div>
                          <div className="text-[12px] font-semibold">{String(r.account_type || '—')}</div>
                        </div>
                        <div className="rounded-lg border border-black/10 p-2">
                          <div className="text-[11px] text-[#131e29]/60">Nro. cuenta</div>
                          <div className="text-[12px] font-semibold font-mono break-all">{String(r.account_number || '—')}</div>
                        </div>
                        <div className="rounded-lg border border-black/10 p-2 sm:col-span-2">
                          <div className="text-[11px] text-[#131e29]/60">Cédula</div>
                          <div className="text-[12px] font-semibold font-mono break-all">{String(r.cedula || '—')}</div>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => openBankWithdrawalReceipt(r)}
                        disabled={!r.has_admin_receipt}
                        className="rounded-xl bg-[#e9eef3] hover:bg-[#dde6ee] border border-black/10 px-3 py-2 text-xs font-semibold text-[#131e29] transition disabled:opacity-50"
                      >
                        Ver comprobante
                      </button>

                      <label className="rounded-xl bg-white border border-black/10 px-3 py-2 text-xs font-semibold text-[#131e29] transition hover:bg-black/5 cursor-pointer w-full text-center">
                        Subir comprobante
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setBankWithdrawalUploadFile(f);
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => handleUploadBankWithdrawalReceipt(r)}
                        disabled={Boolean(bankWithdrawalUploadId) || status !== 'pending' || !bankWithdrawalUploadFile || String(r.user_id || '').trim() === ''}
                        className="rounded-xl bg-doja-cyan/20 hover:bg-doja-cyan/30 border border-doja-cyan/40 px-3 py-2 text-xs font-semibold text-doja-cyan transition disabled:opacity-50 w-full"
                      >
                        {bankWithdrawalUploadId === r.id ? 'Subiendo...' : 'Marcar pagado'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRejectBankWithdrawal(r.id)}
                        disabled={Boolean(bankWithdrawalActionId) || status !== 'pending'}
                        className="rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-500 transition disabled:opacity-50 w-full"
                      >
                        {bankWithdrawalActionId === r.id ? 'Procesando...' : 'Rechazar'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 text-sm text-[#131e29]/60">Sin solicitudes.</div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4 md:col-start-2 md:col-span-2">
          <div className="text-xs text-[#131e29]/60">Ganancias (reseñas + referidos)</div>
          <div className="mt-2 text-2xl font-bold text-[#131e29]">{Number(summary?.earnings_total ?? 0).toFixed(2)} USDT</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
        <div className="text-xs text-[#131e29]/60">GANANCIAS GENERALES (creadores)</div>
        <div className="mt-2 text-2xl font-bold text-[#131e29]">{Number(summary?.creators_earnings_total ?? 0).toFixed(2)} USDT</div>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-black/10 bg-white p-3">
            <div className="text-[11px] text-[#131e29]/60">Sobrantes no retirables (saldo interno)</div>
            <div className="mt-1 text-sm font-semibold text-[#131e29]">{Number(summary?.creators_breakdown?.saldo_interno_total ?? 0).toFixed(2)} USDT</div>
          </div>
          <div className="rounded-xl border border-black/10 bg-white p-3">
            <div className="text-[11px] text-[#131e29]/60">Comisiones de retiro (1 USDT c/u)</div>
            <div className="mt-1 text-sm font-semibold text-[#131e29]">{Number(summary?.creators_breakdown?.withdrawal_fees_total ?? 0).toFixed(2)} USDT</div>
          </div>
          <div className="rounded-xl border border-black/10 bg-white p-3">
            <div className="text-[11px] text-[#131e29]/60">Retiros confirmados (neto pagado)</div>
            <div className="mt-1 text-sm font-semibold text-[#131e29]/80">{Number(summary?.creators_breakdown?.withdrawals_confirmed_neto_total ?? 0).toFixed(2)} USDT</div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4 text-[#131e29]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold inline-flex items-center gap-2">
              <Users className="w-4 h-4" />
              Usuarios
            </div>
            <div className="text-xs text-[#131e29]/60">{usersLoading ? 'Cargando...' : `${users.length}`}</div>
          </div>

          <div className="mt-3">
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Buscar por correo"
              className="w-full rounded-xl bg-white border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
            />
            <button
              type="button"
              onClick={loadUsers}
              className="mt-3 w-full rounded-xl bg-[#e9eef3] hover:bg-[#dde6ee] border border-black/10 py-3 text-sm font-semibold transition text-[#131e29]"
              disabled={usersLoading}
            >
              {usersLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {usersLoading ? (
            <div className="mt-4 flex items-center justify-center text-[#131e29]/60">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Cargando...
            </div>
          ) : users.length ? (
            <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-xl border border-black/10">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(u.id);
                    loadSelectedUser(u.id);
                  }}
                  className={
                    selectedUserId === u.id
                      ? 'w-full text-left px-4 py-3 border-b border-black/10 bg-black/5'
                      : 'w-full text-left px-4 py-3 border-b border-black/10 hover:bg-black/5'
                  }
                >
                  <div className="text-sm text-[#131e29] break-words">{u.email || u.id}</div>
                  <div className="mt-1 text-xs text-[#131e29]/60 font-mono break-all">{u.id}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 text-sm text-[#131e29]/60">No hay usuarios</div>
          )}
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4 text-[#131e29]">
          <div className="text-sm font-semibold">Detalle del usuario</div>

          {!selectedUserId ? (
            <div className="mt-3 text-sm text-[#131e29]/60">Selecciona un usuario para ver detalles.</div>
          ) : selectedLoading ? (
            <div className="mt-4 flex items-center justify-center text-[#131e29]/60">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Cargando...
            </div>
          ) : selectedUser?.user ? (
            <div className="mt-3">
              <div className="rounded-xl border border-black/10 bg-white p-3">
                <div className="text-sm text-[#131e29] break-words">{selectedUser.user.email || selectedUser.user.id}</div>
                <div className="mt-1 text-xs text-[#131e29]/60 font-mono break-all">{selectedUser.user.id}</div>
              </div>

              {selectedUser?.wallet?.deposit_address ? (
                <div className="mt-3 rounded-xl border border-black/10 bg-white p-3">
                  <div className="text-xs text-[#131e29]/60">Red única (deposit_address)</div>
                  <div className="mt-1 text-xs text-[#131e29] font-mono break-all">{String(selectedUser.wallet.deposit_address)}</div>
                  {selectedUser?.wallet?.network ? (
                    <div className="mt-1 text-[11px] text-[#131e29]/50">network: {String(selectedUser.wallet.network)}</div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-black/10 bg-white p-3">
                  <div className="text-xs text-[#131e29]/60">Generado (reseñas + referidos)</div>
                  <div className="mt-1 text-sm font-semibold text-doja-cyan">{Number(selectedTotals?.earnings_total ?? 0).toFixed(2)} USDT</div>
                </div>
                <div className="rounded-xl border border-black/10 bg-white p-3">
                  <div className="text-xs text-[#131e29]/60">Recargado</div>
                  <div className="mt-1 text-sm font-semibold text-doja-cyan">{Number(selectedTotals?.deposits_total ?? 0).toFixed(2)} USDT</div>
                </div>
                <div className="rounded-xl border border-black/10 bg-white p-3">
                  <div className="text-xs text-[#131e29]/60">Equipo (niveles 1-3)</div>
                  <div className="mt-1 text-sm font-semibold text-doja-cyan">{teamSize}</div>
                </div>
                <div className="rounded-xl border border-black/10 bg-white p-3">
                  <div className="text-xs text-[#131e29]/60">Retiros (confirmados)</div>
                  <div className="mt-1 text-sm font-semibold text-doja-cyan">
                    {Number(selectedTotals?.withdrawals_confirmed_count ?? 0)}
                  </div>
                  <div className="mt-1 text-[11px] text-[#131e29]/50">
                    intentos: {Number(selectedTotals?.withdrawals_count ?? 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-black/10 bg-white p-3">
                  <div className="text-xs text-[#131e29]/60">Retirado (confirmado)</div>
                  <div className="mt-1 text-sm font-semibold text-doja-cyan">{Number(selectedTotals?.withdrawals_confirmed_neto_total ?? 0).toFixed(2)} USDT</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-[#131e29]/60">Ganado por planes (reseñas)</div>
                {Array.isArray(selectedUser?.earnings_by_plan) && selectedUser.earnings_by_plan.length ? (
                  <div className="mt-2 space-y-2">
                    {selectedUser.earnings_by_plan.slice(0, 12).map((row, idx) => (
                      <div key={`${row.plan_id}-${idx}`} className="rounded-xl border border-black/10 bg-white p-3">
                        <div className="text-sm text-[#131e29]">{row.plan_nombre || `Plan ${row.plan_id}`}</div>
                        <div className="mt-1 text-xs text-[#131e29]/60 font-mono">
                          reseñas: {Number(row.reviews_count ?? row.views_count ?? 0)} · ganancia: {Number(row.ganancia_diaria ?? 0).toFixed(2)} · total: {Number(row.earned_total ?? 0).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-[#131e29]/60">Sin datos.</div>
                )}
              </div>

              <div className="mt-4">
                <div className="text-xs text-[#131e29]/60">Planes comprados</div>
                {selectedPlans.length ? (
                  <div className="mt-2 space-y-2">
                    {selectedPlans.slice(0, 10).map((p, idx) => (
                      <div key={p.subscription_id || idx} className="rounded-xl border border-black/10 bg-white p-3">
                        <div className="text-sm text-[#131e29]">{p.plan?.nombre || `Plan ${p.plan_id}`}</div>
                        <div className="mt-1 text-xs text-[#131e29]/60 font-mono">precio: {Number(p.plan?.precio ?? 0).toFixed(2)} · activo: {String(Boolean(p.is_active))}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-[#131e29]/60">Sin planes.</div>
                )}
              </div>

              <div className="mt-4">
                <div className="text-xs text-[#131e29]/60">Retiros pendientes</div>
                {pendingWithdrawals.length ? (
                  <div className="mt-2 space-y-2">
                    {pendingWithdrawals.slice(0, 20).map((w) => (
                      <div key={w.id} className="rounded-xl border border-black/10 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm text-[#131e29] break-words">{String(w.red || '—')}</div>
                            <div className="mt-1 text-[11px] text-[#131e29]/60 font-mono break-all">{String(w.id)}</div>
                            <div className="mt-1 text-[11px] text-[#131e29]/60 font-mono break-all">
                              estado: {String(w.estado || '—')} · total: {Number(w.total ?? w.monto ?? 0).toFixed(2)}
                            </div>
                            {w.direccion ? (
                              <div className="mt-1 text-[11px] text-[#131e29]/50 font-mono break-all">destino: {String(w.direccion)}</div>
                            ) : null}
                            {w.tx_hash ? (
                              <div className="mt-1 text-[11px] text-[#131e29]/50 font-mono break-all">tx: {String(w.tx_hash)}</div>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleConfirmWithdrawal(w.id)}
                            className="shrink-0 rounded-xl bg-doja-cyan/20 hover:bg-doja-cyan/30 border border-doja-cyan/40 px-3 py-2 text-xs font-semibold text-doja-cyan transition disabled:opacity-50"
                            disabled={Boolean(confirmingWithdrawalId) || selectedLoading}
                          >
                            {confirmingWithdrawalId === w.id ? 'Confirmando...' : 'Marcar confirmado'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-[#131e29]/60">Sin retiros pendientes.</div>
                )}
              </div>

              <button
                type="button"
                onClick={openReferrals}
                className="mt-4 w-full rounded-xl bg-[#e9eef3] hover:bg-[#dde6ee] border border-black/10 py-3 text-sm font-semibold transition text-[#131e29]"
              >
                Ver referidos
              </button>

              {selectedReferralsOpen ? (
                <div className="mt-3 rounded-xl border border-black/10 bg-white p-3">
                  {selectedReferralsLoading ? (
                    <div className="text-sm text-[#131e29]/60">Cargando referidos...</div>
                  ) : selectedReferrals ? (
                    <div className="space-y-3">
                      {[{ title: 'Nivel 1', key: 'level1' }, { title: 'Nivel 2', key: 'level2' }, { title: 'Nivel 3', key: 'level3' }].map((sec) => {
                        const list = Array.isArray(selectedReferrals?.[sec.key]) ? selectedReferrals[sec.key] : [];
                        return (
                          <div key={sec.key}>
                            <div className="text-xs text-[#131e29]/60">{sec.title} ({list.length})</div>
                            {list.length ? (
                              <div className="mt-2 space-y-2">
                                {list.slice(0, 30).map((m) => (
                                  <div key={m.id} className="rounded-lg border border-black/10 bg-white px-3 py-2">
                                    <div className="text-sm text-[#131e29] break-words">{m.email || m.id}</div>
                                    <div className="text-[11px] text-[#131e29]/50 font-mono break-all">{m.id}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-1 text-sm text-[#131e29]/60">Sin referidos</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-[#131e29]/60">Sin datos.</div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 text-sm text-[#131e29]/60">No se pudo cargar el usuario.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
