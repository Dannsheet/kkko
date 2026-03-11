import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../hooks/useAuth';
import { getMyReferralProfile } from '../lib/api.js';
import './Invitar.css';

const Invitar = () => {
  const { user } = useAuth();

  const [toast, setToast] = useState(null);
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

        <div className="mt-5 flex items-center justify-center">
          <div className="rounded-2xl bg-white p-4">
            <QRCodeCanvas value={inviteLink || ''} size={190} includeMargin />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
        <div className="text-sm font-semibold">
          �️ Por invitar a tus amigos a ser parte de nuestro equipo de trabajo recibiras buenos reembolsos de recarga:
        </div>
        <div className="mt-3 space-y-2 text-sm text-[#131e29]/80">
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
