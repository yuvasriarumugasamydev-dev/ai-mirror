import React, { useState, useRef, useEffect, useCallback } from 'react';
import { playTapSound } from '../utils/audio';

export const AITryOnModal = ({
  isOpen,
  status = 'idle', // 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
  elapsedSeconds = 0,
  error = null,
  beforeImageUrl = null,
  beforePhotoUrl = null,
  afterImageUrl = null,
  saree = null,
  currentModel = 'AI Image Edit (Qwen)',
  currentDrapeStyle = 'Nivi',
  onClose,
  onCancelJob,
  onRetake,
  onTryAnotherSaree,
  onRetry,
  onRetryWithModel,
  onRetryWithStyle,
  onRegenerateNewSeed,
  onScanQR
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Format elapsed time mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Dragging logic for Before / After slider
  const handlePointerDown = () => {
    setIsDragging(true);
  };

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const pos = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100));
    setSliderPos(pos);
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove);
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  if (!isOpen) return null;

  const isLoading = status === 'queued' || status === 'processing';
  const isCompleted = status === 'completed' && !!afterImageUrl;
  const isFailed = status === 'failed' || (error && !isLoading);
  const beforeSrc = beforeImageUrl || beforePhotoUrl || afterImageUrl;

  const handleDownload = () => {
    playTapSound();
    if (!afterImageUrl) return;
    const a = document.createElement('a');
    a.href = afterImageUrl;
    a.download = `Vastra_AI_TryOn_${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div className="modal-backdrop active" onClick={isLoading ? onCancelJob : onClose}>
      <div className="modal-card ai-tryon-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={isLoading ? onCancelJob : onClose} title="Close">
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* 1. LOADING & POLLING STATE */}
        {isLoading && (
          <div className="ai-loading-container">
            <div className="ai-spinner-ring">
              <div className="inner-pulse-dot"></div>
              <i className="fa-solid fa-wand-magic-sparkles ai-sparkle-icon"></i>
            </div>

            <div className="ai-timer-badge">
              <i className="fa-regular fa-clock"></i>
              <span>Elapsed: {formatTime(elapsedSeconds)}</span>
            </div>

            <h3 className="ai-loading-title">
              {status === 'queued' ? 'Queueing Virtual Try-On Job...' : 'Synthesizing Your AI Draped Look...'}
            </h3>

            <p className="ai-loading-sub">
              Draping <strong>{saree?.name || 'Selected Saree'}</strong> in <strong>{currentDrapeStyle}</strong> style...
            </p>

            <div className="ai-loading-bar-wrapper">
              <div className="ai-loading-bar-fill animated"></div>
            </div>

            <div className="ai-server-notice-box">
              <i className="fa-solid fa-circle-info"></i>
              <span>Prompt-guided synthesis active. Replacing top & bottom with complete authentic saree & blouse.</span>
            </div>

            <div className="ai-cancel-action-row">
              <button className="btn-secondary-blue" onClick={onCancelJob}>
                <i className="fa-solid fa-ban"></i> Cancel Try-On
              </button>
            </div>
          </div>
        )}

        {/* 2. ERROR STATE (EXPLICIT ERROR - NEVER FAKE FALLBACK) */}
        {isFailed && (
          <div className="ai-error-container">
            <div className="ai-error-icon-box">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 className="ai-error-title">AI Try-On Generation Notice</h3>
            <p className="ai-error-desc">{error || 'Virtual try-on model was unable to process the look.'}</p>
            <div className="ai-error-advice">
              <span>Tip: Ensure your full body (head to feet) is visible in the camera frame without obstruction.</span>
            </div>

            {/* RETRY OPTIONS */}
            <div className="ai-model-retry-section" style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0B2A5B', display: 'block', marginBottom: '0.75rem' }}>
                Try again with another style or regenerate with a new seed:
              </span>
              <div className="ai-style-chips-row" style={{ marginBottom: '0.75rem' }}>
                {['Nivi', 'Pinned Pleats', 'Seedha Pallu', 'Bengali'].map((style) => (
                  <button
                    key={style}
                    className={`btn-style-chip ${currentDrapeStyle === style ? 'active' : ''}`}
                    onClick={() => onRetryWithStyle ? onRetryWithStyle(style) : onRetry()}
                  >
                    <i className="fa-solid fa-vest"></i> {style}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn-regenerate-seed"
                  onClick={() => onRegenerateNewSeed ? onRegenerateNewSeed() : onRetry()}
                >
                  <i className="fa-solid fa-dice"></i> Regenerate with a new seed
                </button>
                {onRetryWithModel && (
                  <>
                    <button
                      className="btn-model-chip"
                      onClick={() => onRetryWithModel('local')}
                      style={{ border: '1.5px solid #10B981', color: '#10B981', fontWeight: 700 }}
                    >
                      <i className="fa-solid fa-laptop-code"></i> Instant Local Drape (Offline / 100% Free)
                    </button>
                    <button
                      className="btn-model-chip"
                      onClick={() => onRetryWithModel('fal_ai')}
                      style={{ border: '1.5px solid #FF7A1A', color: '#FF7A1A' }}
                    >
                      <i className="fa-solid fa-bolt"></i> Retry: Fal.ai Turbo (2s)
                    </button>
                    <button
                      className="btn-model-chip"
                      onClick={() => onRetryWithModel('catvton')}
                    >
                      <i className="fa-solid fa-vest"></i> Fallback: CatVTON
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="ai-error-actions">
              <button className="btn-secondary-blue" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* 3. SUCCESS STATE - FULL AI DRAPED RESULT (NO BEFORE/AFTER SLIDER) */}
        {isCompleted && (
          <div className="ai-result-content">
            <div className="ai-result-header">
              <div className="ai-badge-row">
                <span className="badge-orange">
                  <i className="fa-solid fa-sparkles"></i> Generative AI Try-On
                </span>
                <span className="badge-blue" style={{ background: '#E0F2FE', color: '#0284C7', border: '1px solid #BAE6FD' }}>
                  <i className="fa-solid fa-vest"></i> {currentDrapeStyle} Drape
                </span>
                <span className="badge-blue" style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}>
                  <i className="fa-solid fa-cube"></i> {currentModel}
                </span>
              </div>
              <h2 className="ai-result-title">{saree?.name || 'Traditional Silk Saree'}</h2>
            </div>

            {/* FULL AI DRAPED PHOTO */}
            <div className="ai-single-photo-container">
              <img
                src={afterImageUrl}
                alt="AI Draped Look"
                className="ai-single-photo"
              />
              <span className="slider-tag after-tag" style={{ position: 'absolute', top: '1.25rem', left: '1.25rem' }}>
                <i className="fa-solid fa-sparkles"></i> AI Draped Look
              </span>
              <span className="ai-photo-watermark-tag">
                <i className="fa-solid fa-gem"></i> VASTRA AI MIRROR
              </span>
            </div>

            {/* MANDATORY DISCLAIMER NOTE */}
            <div className="ai-disclaimer-banner">
              <i className="fa-solid fa-circle-info"></i>
              <span>AI preview. The actual saree may look slightly different.</span>
            </div>

            {/* IF RESULT STILL SHOWS PANTS OR CROPPED TOP: OFFER TRY AGAIN WITH ANOTHER STYLE & REGENERATE WITH NEW SEED */}
            <div className="ai-adjustment-section">
              <div className="ai-adjustment-header">
                <i className="fa-solid fa-arrows-rotate text-orange"></i>
                <div className="ai-adjustment-text">
                  <strong>If the result still shows original pants or a cropped top:</strong>
                  <p>Try again with another style or regenerate with a new seed for improved drape replacement.</p>
                </div>
              </div>

              {/* Try again with another style */}
              <div className="ai-style-retry-block">
                <span className="ai-style-retry-label">Try again with another style:</span>
                <div className="ai-style-chips-row">
                  {[
                    { id: 'Nivi', label: 'Nivi Drape' },
                    { id: 'Pinned Pleats', label: 'Pinned Pleats' },
                    { id: 'Seedha Pallu', label: 'Seedha Pallu' },
                    { id: 'Bengali', label: 'Bengali Style' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      className={`btn-style-chip ${currentDrapeStyle === st.id ? 'active' : ''}`}
                      onClick={() => onRetryWithStyle && onRetryWithStyle(st.id)}
                      title={`Regenerate in ${st.label}`}
                    >
                      <i className="fa-solid fa-vest"></i> {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Regenerate with a new seed */}
              <div className="ai-seed-regenerate-block">
                <button
                  className="btn-regenerate-seed"
                  onClick={() => onRegenerateNewSeed && onRegenerateNewSeed()}
                  title="Generate a fresh variation with a new random seed"
                >
                  <i className="fa-solid fa-dice"></i> Regenerate with a new seed
                </button>
              </div>
            </div>

            {/* BOTTOM ACTIONS */}
            <div className="ai-result-actions-bar">
              <button className="btn-secondary-blue" onClick={onRetake}>
                <i className="fa-solid fa-camera-rotate"></i> Retake Photo
              </button>
              <button className="btn-secondary-blue" onClick={onTryAnotherSaree}>
                <i className="fa-solid fa-vest-patches"></i> Try Another Saree
              </button>
              {onScanQR && (
                <button className="btn-primary-orange" onClick={onScanQR} title="Scan QR Code to view look on mobile phone">
                  <i className="fa-solid fa-qrcode"></i> Scan to Take Look Home
                </button>
              )}
              <button className="btn-primary-orange btn-lg" onClick={handleDownload}>
                <i className="fa-solid fa-download"></i> Download Look
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
