import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import styles from './ResetPassword.module.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // AuthProvider already updates session; this ensures the page rerenders when recovery session is set.
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const canReset = useMemo(() => Boolean(session?.user), [session?.user]);

  const showToast = (type, message) => setToast({ type, message });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canReset) {
      showToast('error', 'El link no es válido o expiró. Solicita otro.');
      return;
    }

    if (!password || password.length < 6) {
      showToast('error', 'La contraseña debe tener mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      showToast('error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        showToast('error', error.message || 'No se pudo restablecer la contraseña');
        return;
      }

      showToast('success', 'Contraseña actualizada. Inicia sesión nuevamente.');

      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }

      navigate('/', { replace: true });
    } catch (err) {
      showToast('error', err?.message || 'No se pudo restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.logoWrap}>
          <img
            src="/logo.png"
            alt="Logo"
            className={styles.logo}
          />
        </div>

        <div className={styles.card}>
          <div className={styles.stack}>
            {toast && (
              <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`}>{toast.message}</div>
            )}

            <h1 className={styles.title}>Restablecer contraseña</h1>

            {!canReset ? (
              <div className={styles.hint}>
                Abre este link desde tu correo. Si expiró, vuelve a solicitar la recuperación desde el inicio de sesión.
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div>
                <label htmlFor="newPassword" className={styles.label}>
                  Nueva contraseña
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Nueva contraseña"
                  autoComplete="new-password"
                  disabled={!canReset || loading}
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmNewPassword" className={styles.label}>
                  Confirmar contraseña
                </label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Repetir contraseña"
                  autoComplete="new-password"
                  disabled={!canReset || loading}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!canReset || loading}
                className={`${styles.primaryButton} ${!canReset || loading ? styles.primaryButtonDisabled : ''}`}
              >
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>

            <div className={styles.footer}>
              <button type="button" onClick={() => navigate('/', { replace: true })} className={styles.linkButton}>
                Volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
