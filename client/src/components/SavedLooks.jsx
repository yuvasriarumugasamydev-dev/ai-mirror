import React from 'react';
import { useMirror } from '../context/MirrorContext';
import { playTapSound } from '../utils/audio';

export const SavedLooks = () => {
  const { savedSnaps, setActiveQRSnap, drapeAndGoToMirror, setCurrentTab, t } = useMirror();

  return (
    <section className="tab-panel active" aria-label="Saved Looks">
      <div className="gallery-page-container">
        <div className="gallery-header-row">
          <div>
            <h2 className="gallery-title">{t('saved_looks_title')}</h2>
            <p className="gallery-desc">{t('saved_looks_desc')}</p>
          </div>
          <button className="btn-secondary-blue" onClick={() => setCurrentTab('mirror')}>
            <i className="fa-solid fa-camera"></i> {t('capture_more')}
          </button>
        </div>

        <div className="snaps-grid">
          {savedSnaps.length === 0 ? (
            <div className="empty-gallery-state">
              <div className="empty-icon">
                <i className="fa-solid fa-camera-retro"></i>
              </div>
              <h3 className="empty-title">{t('empty_snaps_title')}</h3>
              <p className="empty-desc">{t('empty_snaps_desc')}</p>
              <button className="btn-primary-orange" onClick={() => setCurrentTab('mirror')}>
                <i className="fa-solid fa-wand-magic-sparkles"></i> {t('nav_mirror')}
              </button>
            </div>
          ) : (
            savedSnaps.map((snap) => (
              <div key={snap.snapshotId || snap.id} className="snap-card">
                <div className="snap-img-box">
                  <img src={snap.imageDataUrl || snap.dataUrl} alt={snap.sareeName} />
                </div>
                <div className="snap-card-body">
                  <span className="snap-meta-time">
                    <i className="fa-solid fa-clock"></i> {snap.timestamp}
                  </span>
                  <h4 className="snap-saree-name">{snap.sareeName}</h4>
                  <div className="snap-actions">
                    <button
                      className="btn-snap-action btn-secondary-blue"
                      onClick={() => {
                        playTapSound();
                        setActiveQRSnap(snap);
                      }}
                    >
                      <i className="fa-solid fa-qrcode"></i> QR
                    </button>
                    <button
                      className="btn-snap-action btn-primary-orange"
                      onClick={() => drapeAndGoToMirror(snap.sareeId)}
                    >
                      <i className="fa-solid fa-arrow-rotate-right"></i> Try Again
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
