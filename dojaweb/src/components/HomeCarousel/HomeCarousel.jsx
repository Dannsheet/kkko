import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const HomeCarousel = ({
  images = ['/kia1.jpg', '/kia2.jpg', '/kia3.jpg'],
  intervalMs = 4000,
  maxWidthPx = 900,
}) => {
  const slides = useMemo(
    () => (Array.isArray(images) && images.length ? images.map((src) => String(src)) : []),
    [images],
  );

  const [index, setIndex] = useState(() => 0);
  const timerRef = useRef(null);
  const touchRef = useRef({ startX: 0, lastX: 0, active: false });

  const clampIndex = useCallback(
    (i) => {
      if (!slides.length) return 0;
      const n = slides.length;
      const v = ((i % n) + n) % n;
      return v;
    },
    [slides.length],
  );

  const stopAutoplay = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    stopAutoplay();
    if (slides.length <= 1) return;
    timerRef.current = window.setInterval(() => {
      setIndex((prev) => clampIndex(prev + 1));
    }, intervalMs);
  }, [clampIndex, intervalMs, slides.length, stopAutoplay]);

  const restartAutoplay = useCallback(() => {
    startAutoplay();
  }, [startAutoplay]);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay]);

  const goTo = useCallback(
    (i) => {
      setIndex(clampIndex(i));
      restartAutoplay();
    },
    [clampIndex, restartAutoplay],
  );

  const onTouchStart = useCallback(
    (e) => {
      if (!slides.length) return;
      const touch = e.touches?.[0];
      if (!touch) return;
      touchRef.current = { startX: touch.clientX, lastX: touch.clientX, active: true };
      stopAutoplay();
    },
    [slides.length, stopAutoplay],
  );

  const onTouchMove = useCallback((e) => {
    if (!touchRef.current.active) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    touchRef.current.lastX = touch.clientX;
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchRef.current.active) return;
    const { startX, lastX } = touchRef.current;
    touchRef.current.active = false;

    const delta = lastX - startX;
    const threshold = 40;

    if (Math.abs(delta) >= threshold) {
      if (delta < 0) {
        setIndex((prev) => clampIndex(prev + 1));
      } else {
        setIndex((prev) => clampIndex(prev - 1));
      }
    }

    restartAutoplay();
  }, [clampIndex, restartAutoplay]);

  const containerStyle = useMemo(
    () => ({
      maxWidth: `${maxWidthPx}px`,
      margin: '0 auto',
      borderRadius: '16px',
      overflow: 'hidden',
      background: '#ffffff',
    }),
    [maxWidthPx],
  );

  if (!slides.length) return null;

  return (
    <div style={containerStyle}>
      <div
        style={{
          display: 'flex',
          width: `${slides.length * 100}%`,
          transform: `translateX(-${index * (100 / slides.length)}%)`,
          transition: 'transform 0.5s ease',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {slides.map((src, i) => (
          <div
            key={`${src}-${i}`}
            style={{
              width: `${100 / slides.length}%`,
              flex: `0 0 ${100 / slides.length}%`,
              background: '#ffffff',
            }}
          >
            <img
              src={src}
              alt={`Slide ${i + 1}`}
              style={{
                width: '100%',
                height: '160px',
                objectFit: 'cover',
                display: 'block',
              }}
              draggable={false}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          padding: '10px 12px',
          background: '#ffffff',
        }}
      >
        {slides.map((_, i) => {
          const active = i === index;
          return (
            <button
              key={`dot-${i}`}
              type="button"
              aria-label={`Ir a slide ${i + 1}`}
              onClick={() => goTo(i)}
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: active ? '#131e29' : 'rgba(19, 30, 41, 0.25)',
                transition: 'background 150ms ease',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default HomeCarousel;
