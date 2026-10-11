import React from 'react';
import { useMirror } from '../context/MirrorContext';
import { playTapSound } from '../utils/audio';

export const WelcomeScreen = () => {
  const { isWelcomeActive, setIsWelcomeActive, t } = useMirror();

  if (!isWelcomeActive) return null;

  const handleStart = () => {
    playTapSound();
    setIsWelcomeActive(false);
  };

  return (
    <section className="welcome-screen active" aria-label="Welcome Attract Screen">
      <div className="welcome-bg-glow"></div>
      <div className="welcome-ambient-mesh">
        <div className="floating-pattern pattern-1"></div>
        <div className="floating-pattern pattern-2"></div>
        <div className="floating-pattern pattern-3"></div>
      </div>

      <header className="welcome-topbar">
        <div className="brand-badge">
          <span className="brand-sparkle"><i className="fa-solid fa-gem"></i></span>
          <span className="brand-subtitle">HAUTE COUTURE SMART BOUTIQUE</span>
        </div>
      </header>

      <div className="welcome-center-content">
        <div className="brand-logo-emblem">
          <div className="emblem-ring">
            <i className="fa-solid fa-wand-magic-sparkles emblem-icon"></i>
          </div>
        </div>

        <h1 className="welcome-title">
          <span className="brand-name">VASTRA</span>
          <span className="brand-mirror-tag">AI SMART MIRROR</span>
        </h1>
        <p className="welcome-subtitle">
          {t('welcome_subtitle')}
        </p>

        {/* Large Orange "Touch to Start" button */}
        <button
          id="btn-touch-to-start"
          className="btn-touch-to-start"
          onClick={handleStart}
        >
          <span className="btn-ripple"></span>
          <span className="btn-icon"><i className="fa-solid fa-fingerprint"></i></span>
          <span className="btn-text">{t('touch_to_start')}</span>
          <span className="btn-arrow"><i className="fa-solid fa-arrow-right"></i></span>
        </button>

        <div className="welcome-features-strip">
          <div className="feature-item">
            <i className="fa-solid fa-camera-rotate"></i>
            <span>{t('feature_ar')}</span>
          </div>
          <div className="feature-divider">•</div>
          <div className="feature-item">
            <i className="fa-solid fa-layer-group"></i>
            <span>{t('feature_fabrics')}</span>
          </div>
          <div className="feature-divider">•</div>
          <div className="feature-item">
            <i className="fa-solid fa-qrcode"></i>
            <span>{t('feature_qr')}</span>
          </div>
        </div>
      </div>

      <footer className="welcome-footer">
        <div className="kiosk-status">
          <span className="status-dot"></span>
          <span>{t('mirror_ready')}</span>
        </div>
      </footer>
    </section>
  );
};
