import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { linkReferral } from '../../lib/api.js';
import styles from './Auth.module.css';

const Auth = () => {
  const VISIT_KEY = 'doja_auth_has_visited';
  const PENDING_INVITE_KEY = 'doja_pending_invite_code';

  const formatSupabaseError = (err) => {
    if (!err) return 'Error desconocido';
    if (typeof err === 'string') return err;
    const message = err.message || err.error_description || err.msg;
    const status = err.status || err.statusCode;
    const parts = [];
    if (message && message !== '{}') parts.push(message);
    if (err.code) parts.push(`code: ${err.code}`);
    if (err.details) parts.push(`details: ${err.details}`);
    if (err.hint) parts.push(`hint: ${err.hint}`);
    if (status) parts.push(`status: ${status}`);
    if (parts.length > 0) return parts.join(' | ');
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  };

  const handleForgotPassword = async () => {
    const targetEmail = String(email || '').trim();
    if (!targetEmail) {
      showToast('error', 'Ingresa tu correo para recuperar la contraseña');
      return;
    }

    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, { redirectTo });
      if (error) {
        console.error('resetPasswordForEmail error:', error);
        showToast('error', formatSupabaseError(error));
        return;
      }
      showToast('success', 'Revisa tu correo para restablecer tu contraseña');
    } catch (err) {
      console.error('resetPasswordForEmail exception:', err);
      showToast('error', formatSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const [isLogin, setIsLogin] = useState(() => {
    try {
      return localStorage.getItem(VISIT_KEY) === '1';
    } catch {
      return true;
    }
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(VISIT_KEY) !== '1') {
        localStorage.setItem(VISIT_KEY, '1');
      }
    } catch (e) {
      void e;
    }
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const ref = String(params.get('ref') || '').trim();
      if (ref && !invitationCode) {
        setInvitationCode(ref);
      }
    } catch {
      // ignore
    }
  }, [invitationCode]);

  const consumePendingInviteCode = async () => {
    let code = '';
    try {
      code = String(localStorage.getItem(PENDING_INVITE_KEY) || '').trim();
    } catch {
      code = '';
    }

    if (!code) return;

    try {
      await linkReferral(code);
      try {
        localStorage.removeItem(PENDING_INVITE_KEY);
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { email, password };
      const { error } = await supabase.auth.signInWithPassword(payload);
      if (error) {
        console.error('signInWithPassword error:', error);
        const msg = String(error?.message || error?.error_description || '').toLowerCase();
        const code = String(error?.code || '').toLowerCase();
        if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
          showToast('error', 'Credenciales incorrectas');
          return;
        }
        if (msg.includes('email not confirmed') || msg.includes('correo') && msg.includes('confirm')) {
          showToast('error', 'Debes confirmar tu correo electrónico antes de iniciar sesión');
          return;
        }
        showToast('error', 'No se pudo iniciar sesión');
        return;
      }

      await consumePendingInviteCode();
    } catch (err) {
      console.error('signInWithPassword exception:', err);
      const msg = String(err?.message || err?.error_description || '').toLowerCase();
      const code = String(err?.code || '').toLowerCase();
      if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
        showToast('error', 'Credenciales incorrectas');
      } else if (msg.includes('email not confirmed') || (msg.includes('correo') && msg.includes('confirm'))) {
        showToast('error', 'Debes confirmar tu correo electrónico antes de iniciar sesión');
      } else {
        showToast('error', 'No se pudo iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (password !== confirmPassword) {
        showToast('error', 'Las contraseñas no coinciden');
        return;
      }

      const invite = invitationCode.trim();
      if (!invite) {
        showToast('error', 'El código de invitación es obligatorio');
        return;
      }

      const userData = {
        invitation_code: invite
      };

      const payload = { email, password, options: { emailRedirectTo: window.location.origin, data: userData } };

      const { data, error } = await supabase.auth.signUp(payload);
      if (error) {
        console.error('signUp error:', error);
        showToast('error', formatSupabaseError(error));
        return;
      }

      const pending = invite;
      if (pending) {
        try {
          localStorage.setItem(PENDING_INVITE_KEY, pending);
        } catch {
          // ignore
        }
      }

      if (data?.session) {
        try {
          if (pending) {
            await linkReferral(pending);
            try {
              localStorage.removeItem(PENDING_INVITE_KEY);
            } catch {
              // ignore
            }
          }
        } catch {
          // ignore
        }

        showToast('success', 'Registro exitoso');
        return;
      }

      showToast('success', 'Revisa tu correo para verificar tu cuenta');
    } catch (err) {
      console.error('signUp exception:', err);
      showToast('error', formatSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden="true">
        <video
          className={styles.bgVideo}
          src="https://dcdewcwelmovpacghegr.supabase.co/storage/v1/object/sign/videos/YTDown.com_YouTube_The-all-new-Kia-Seltos-l-Unveiling-Film_Media_QT8scRSBRmY_001_1080p.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZTljMTc5Ni01YjQ3LTQ1YTYtOTM5MC1hYjY5YzZiNjc3MzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2aWRlb3MvWVREb3duLmNvbV9Zb3VUdWJlX1RoZS1hbGwtbmV3LUtpYS1TZWx0b3MtbC1VbnZlaWxpbmctRmlsbV9NZWRpYV9RVDhzY1JTQlJtWV8wMDFfMTA4MHAubXA0IiwiaWF0IjoxNzcxOTY5OTI4LCJleHAiOjE3NzI1NzQ3Mjh9.feKkYZfZpvwyJgV_jeUZSmdp1Ec1-NAzRkFou_N_GkM"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <div className={styles.bgOverlay} />
      </div>

      <div className={styles.wrapper}>
        <div className={styles.logoWrap}>
          <img src="/logo.png" alt="Logo" className={styles.logo} />
        </div>

        <div className={styles.stack}>
          {toast ? (
            <div className={toast.type === 'error' ? `${styles.toast} ${styles.toastError}` : `${styles.toast} ${styles.toastSuccess}`}>
              {toast.message}
            </div>
          ) : null}

          <h1 className={styles.title}>{isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</h1>

          <form onSubmit={isLogin ? handleLogin : handleSignUp} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                Correo electrónico
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="Correo electrónico"
                autoComplete="email"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                Contraseña
              </label>
              <div className={styles.passwordWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Contraseña"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className={styles.eyeBtn}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 12C4.5 7.5 8 5 12 5C16 5 19.5 7.5 22 12C19.5 16.5 16 19 12 19C8 19 4.5 16.5 2 12Z" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z" stroke="currentColor" strokeWidth="1.6" />
                    {showPassword ? <path d="M4 4L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /> : null}
                  </svg>
                </button>
              </div>

              {isLogin ? (
                <div className={styles.forgotWrap}>
                  <button type="button" onClick={handleForgotPassword} disabled={loading} className={styles.linkBtnSmall}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              ) : null}
            </div>

            {!isLogin ? (
              <div className={styles.field}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Repetir contraseña
                </label>
                <div className={styles.passwordWrap}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.input}
                    placeholder="Repetir contraseña"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className={styles.eyeBtn}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 12C4.5 7.5 8 5 12 5C16 5 19.5 7.5 22 12C19.5 16.5 16 19 12 19C8 19 4.5 16.5 2 12Z" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z" stroke="currentColor" strokeWidth="1.6" />
                      {showConfirmPassword ? <path d="M4 4L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /> : null}
                    </svg>
                  </button>
                </div>
              </div>
            ) : null}

            {!isLogin ? (
              <div className={styles.field}>
                <label htmlFor="invitationCode" className={styles.label}>
                  Código de invitación
                </label>
                <input
                  type="text"
                  id="invitationCode"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  className={styles.input}
                  placeholder="Código de invitación"
                />
              </div>
            ) : null}

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Cargando...' : isLogin ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          </form>

          <div className={styles.footer}>
            <span className={styles.muted}>{isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}</span>
            <button type="button" onClick={() => setIsLogin(!isLogin)} className={styles.linkBtn}>
              {isLogin ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
