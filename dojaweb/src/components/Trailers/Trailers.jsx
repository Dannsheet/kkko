import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getCuentaInfo, getReviewsStatus, submitReview } from '../../lib/api.js';
import './Trailers.css';

const countWords = (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
};

const formatCountdown = (diffMs) => {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const normalizeSurveyMessage = (rawMessage) => {
  const text = String(rawMessage || '').trim();
  if (!text) return '';

  return text
    .replace(/video(s)?/gi, 'encuesta$1')
    .replace(/ver\s+video/gi, 'realizar encuesta')
    .replace(/vista(s)?/gi, 'encuesta$1');
};

const Trailers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [vipChecking, setVipChecking] = useState(true);
  const [vipActive, setVipActive] = useState(false);
  const [dailyStatus, setDailyStatus] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [nowTs, setNowTs] = useState(() => Date.now());

  const checkVip = useCallback(async () => {
    if (!user?.id) {
      setVipActive(false);
      setDailyStatus(null);
      setVipChecking(false);
      return;
    }

    setVipChecking(true);
    setError(null);
    try {
      const status = await getReviewsStatus();

      const plans = Array.isArray(status?.planes) ? status.planes : [];
      const hasActivePlan = plans.length > 0;
      if (!hasActivePlan) {
        setVipActive(false);
        setDailyStatus(status || null);
        setSelectedPlanId(null);
        return;
      }

      setVipActive(true);
      setDailyStatus(status || null);
      const firstPlanId = plans.length ? Number(plans[0]?.plan_id) : null;
      setSelectedPlanId((prev) => {
        if (prev != null && plans.some((p) => Number(p?.plan_id) === Number(prev))) return prev;
        return firstPlanId;
      });
    } catch (e) {
      console.error('[Trailers] vip check error', e);
      setVipActive(false);
      setDailyStatus(null);
      setSelectedPlanId(null);
      setError(e?.message || 'No se pudo validar la suscripción');
    } finally {
      setVipChecking(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkVip();
  }, [checkVip]);

  const currentPlanInfo = useMemo(() => {
    const plans = Array.isArray(dailyStatus?.planes) ? dailyStatus.planes : [];
    return plans.find((p) => Number(p?.plan_id) === Number(selectedPlanId)) || plans[0] || null;
  }, [dailyStatus, selectedPlanId]);

  const canReview = Boolean(currentPlanInfo?.puede_resenar ?? currentPlanInfo?.puede_ver ?? false);
  const nextAvailableAtIso = currentPlanInfo?.next_available_at ?? dailyStatus?.next_available_at ?? null;
  const wordCount = useMemo(() => countWords(comment), [comment]);
  const isCommentTooLong = wordCount > 150;

  const countdown = useMemo(() => {
    if (!nextAvailableAtIso) return null;
    const nextMs = new Date(String(nextAvailableAtIso)).getTime();
    if (!Number.isFinite(nextMs)) return null;
    const diffMs = Math.max(0, nextMs - Number(nowTs || 0));
    return { diffMs, text: formatCountdown(diffMs) };
  }, [nextAvailableAtIso, nowTs]);

  useEffect(() => {
    if (!nextAvailableAtIso) return;
    setNowTs(Date.now());
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [nextAvailableAtIso]);

  const onSubmitReview = async () => {
    if (!user?.id) {
      setError('Debes iniciar sesión');
      return;
    }

    if (!vipActive || !currentPlanInfo) {
      setError('Necesitas una suscripción VIP activa');
      return;
    }

    if (!canReview) {
      setError('Debes esperar 24 horas para enviar otra encuesta');
      return;
    }

    const modelId = Number(currentPlanInfo?.modelo?.id);
    if (!Number.isFinite(modelId)) {
      setError('Este plan no tiene un modelo configurado');
      return;
    }

    if (!Number.isFinite(Number(stars)) || Number(stars) < 1 || Number(stars) > 5) {
      setError('Debes seleccionar una calificación de 1 a 5 estrellas');
      return;
    }

    if (!String(comment || '').trim()) {
      setError('Debes escribir tu encuesta');
      return;
    }

    if (isCommentTooLong) {
      setError('La encuesta no puede superar 150 palabras');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage('');
    try {
      const resp = await submitReview({
        modelo_id: modelId,
        estrellas: Number(stars),
        comentario: String(comment).trim(),
        plan_id: Number(currentPlanInfo.plan_id),
      });
      setSuccessMessage(
        String(resp?.message || 'Su comisión ha sido generada correctamente, vuelve el día de mañana y danos buenas reseñas!')
      );
      setComment('');
      setStars(0);
      setShowForm(false);
      const [status] = await Promise.all([getReviewsStatus(), getCuentaInfo()]);
      setDailyStatus(status || null);
    } catch (e) {
      setError(normalizeSurveyMessage(e?.message) || 'No se pudo enviar la encuesta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="surveys">
      <div className="trailers__header">
        <h2 className="trailers__title">Sección de encuestas</h2>
        <button
          type="button"
          className="trailers__refresh"
          onClick={() => {
            checkVip();
          }}
          disabled={vipChecking || submitting}
        >
          {vipChecking ? 'Validando…' : 'Actualizar'}
        </button>
      </div>

      {error ? <div className="trailers__error">{error}</div> : null}
      {successMessage ? <div className="trailers__success">{successMessage}</div> : null}

      {!vipChecking && !vipActive ? (
        <div className="trailers__locked">
          <div className="trailers__lockedTitle">Contenido exclusivo VIP</div>
          <div className="trailers__lockedText">Para enviar encuestas debes tener una suscripción VIP activa.</div>
          <button type="button" className="trailers__lockedCta" onClick={() => navigate('/vip')}>
            Ver planes VIP
          </button>
        </div>
      ) : null}

      {vipActive && Array.isArray(dailyStatus?.planes) && dailyStatus.planes.length > 1 ? (
        <div className="trailers__planPicker">
          <div className="trailers__planPickerTitle">Selecciona tu plan para encuestar</div>
          <div className="trailers__planPickerList">
            {dailyStatus.planes.map((p) => {
              const pid = Number(p?.plan_id);
              const activeBtn = Number(pid) === Number(selectedPlanId);
              const label = p?.modelo?.nombre || `Plan ${pid}`;
              return (
                <button
                  key={pid}
                  type="button"
                  className={activeBtn ? 'trailers__planBtn trailers__planBtn--active' : 'trailers__planBtn'}
                  onClick={() => {
                    setSelectedPlanId(pid);
                    setShowForm(false);
                    setStars(0);
                    setComment('');
                    setError(null);
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {vipActive && currentPlanInfo?.modelo ? (
        <div className="trailers__modelCard">
          <div className="trailers__modelMedia">
            {currentPlanInfo.modelo.imagen_url ? (
              <img src={currentPlanInfo.modelo.imagen_url} alt={currentPlanInfo.modelo.nombre} className="trailers__modelImage" />
            ) : (
              <div className="trailers__imagePlaceholder">Imagen pendiente</div>
            )}
          </div>

          <div className="trailers__modelBody">
            <div className="trailers__modelName">{currentPlanInfo.modelo.nombre}</div>
            <div className="trailers__modelDesc">{currentPlanInfo.modelo.descripcion}</div>
            <div className="trailers__reward">Comisión por encuesta: {Number(currentPlanInfo?.recompensa || 0).toFixed(2)} USDT</div>

            {!canReview ? (
              <div className="trailers__locked">
                <div className="trailers__lockedText">Ya realizaste tu encuesta hoy, vuelve mañana.</div>
                {countdown && countdown.diffMs > 0 ? (
                  <div className="trailers__countdown" role="status" aria-live="polite">
                    <span className="trailers__countdownLabel">Próxima encuesta en</span>
                    <span className="trailers__countdownValue">{countdown.text}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                {!showForm ? (
                  <button type="button" className="trailers__lockedCta" onClick={() => setShowForm(true)}>
                    Ubicar encuesta
                  </button>
                ) : (
                  <div className="trailers__form">
                    <div className="trailers__rating">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={value <= stars ? 'trailers__star trailers__star--on' : 'trailers__star'}
                          onClick={() => setStars(value)}
                          aria-label={`Calificar ${value} estrellas`}
                        >
                          <Star className="trailers__starIcon" />
                        </button>
                      ))}
                    </div>

                    <textarea
                      className="trailers__textarea"
                      placeholder="Escribe tu encuesta (máximo 150 palabras)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={5}
                    />

                    <div className={isCommentTooLong ? 'trailers__words trailers__words--error' : 'trailers__words'}>
                      {wordCount}/150 palabras
                    </div>

                    <div className="trailers__formActions">
                      <button
                        type="button"
                        className="trailers__pageBtn"
                        onClick={() => {
                          setShowForm(false);
                          setStars(0);
                          setComment('');
                        }}
                        disabled={submitting}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="trailers__lockedCta"
                        onClick={onSubmitReview}
                        disabled={submitting || isCommentTooLong}
                      >
                        {submitting ? 'Enviando…' : 'Enviar encuesta'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}

      {!vipChecking && vipActive && !currentPlanInfo?.modelo ? <div className="trailers__empty">No hay modelo disponible para este plan.</div> : null}
    </section>
  );
};

export default Trailers;
