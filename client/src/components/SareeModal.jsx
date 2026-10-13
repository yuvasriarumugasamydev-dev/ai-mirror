import React, { useState } from 'react';
import { useMirror } from '../context/MirrorContext';
import { playTapSound } from '../utils/audio';

export const SareeModal = () => {
  const { activeModalSaree, setActiveModalSaree, drapeAndGoToMirror, lang, t, callStylist } = useMirror();
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [customTryOnUrl, setCustomTryOnUrl] = useState('');

  if (!activeModalSaree) return null;

  const handleClose = () => {
    playTapSound();
    setActiveModalSaree(null);
  };

  const handleTryOn = () => {
    drapeAndGoToMirror(activeModalSaree.sareeId);
  };

  const handleTrialRoom = () => {
    playTapSound();
    setActiveModalSaree(null);
    callStylist();
  };

  const handleGenerateCleanAsset = async () => {
    playTapSound();
    setIsRemovingBg(true);
    try {
      const res = await fetch(`/api/sarees/${activeModalSaree.sareeId}/generate-tryon-image`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success && data.tryOnImage) {
        activeModalSaree.tryOnImage = data.tryOnImage;
        alert('Clean tryOnImage generated successfully (background removed)!');
      } else {
        alert(data.message || 'Background removal completed with standard crop.');
      }
    } catch (err) {
      alert('Background removal error: ' + err.message);
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleSaveCustomUrl = async () => {
    if (!customTryOnUrl) return;
    try {
      const res = await fetch(`/api/sarees/${activeModalSaree.sareeId}/tryon-image`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tryOnImage: customTryOnUrl })
      });
      const data = await res.json();
      if (data.success) {
        activeModalSaree.tryOnImage = customTryOnUrl;
        setCustomTryOnUrl('');
        alert('Try-on image updated!');
      }
    } catch (err) {
      alert('Error updating URL: ' + err.message);
    }
  };

  return (
    <div className="modal-backdrop active" onClick={handleClose}>
      <div className="modal-card saree-hero-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={handleClose}>
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="modal-hero-split">
          <div className="modal-photo-column">
            {/* Display Image vs Clean Try-On Image Previews */}
            <div className="garment-dual-preview-row">
              <div className="modal-hero-img-box">
                <img src={activeModalSaree.image} alt={activeModalSaree.name} />
                <span className="modal-silk-tag">Display Image</span>
              </div>
              {activeModalSaree.tryOnImage && (
                <div className="modal-hero-img-box clean-asset-box">
                  <img src={activeModalSaree.tryOnImage} alt="Clean Garment" />
                  <span className="modal-silk-tag" style={{ background: '#10B981' }}>Clean Try-On Asset</span>
                </div>
              )}
            </div>

            {/* Admin Tool: Background Removal & Replace */}
            <div className="garment-admin-clean-tool" style={{ marginTop: '1rem', background: '#F8FAFC', padding: '0.85rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0B2A5B', display: 'block', marginBottom: '0.4rem' }}>
                <i className="fa-solid fa-wand-magic-sparkles text-orange"></i> Garment Try-On Image (No Background)
              </span>
              <button
                className="btn-secondary-blue"
                style={{ width: '100%', fontSize: '0.8rem', padding: '0.45rem' }}
                onClick={handleGenerateCleanAsset}
                disabled={isRemovingBg}
              >
                {isRemovingBg ? 'Removing Background...' : 'Generate Clean Try-On Image (AI BG Removal)'}
              </button>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Or paste clean image URL..."
                  value={customTryOnUrl}
                  onChange={(e) => setCustomTryOnUrl(e.target.value)}
                  style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
                <button
                  className="btn-primary-orange"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  onClick={handleSaveCustomUrl}
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          <div className="modal-info-column">
            <div className="modal-info-header">
              <span className="modal-category-chip">
                {activeModalSaree.category.toUpperCase()} WEAVE
              </span>
              <h2 className="modal-saree-title">
                {lang === 'ta' ? activeModalSaree.nameTa : activeModalSaree.name}
              </h2>
              <div className="modal-price-row">
                <span className="modal-saree-price">{activeModalSaree.priceFormatted}</span>
                <span className="modal-tax-tag">{t('inclusive_taxes')}</span>
              </div>
            </div>

            <p className="modal-saree-story">
              {lang === 'ta' ? activeModalSaree.storyTa : activeModalSaree.story}
            </p>

            <div className="modal-specs-table">
              <div className="spec-row">
                <span className="spec-key">{t('fabric_type')}</span>
                <span className="spec-val">
                  {lang === 'ta' ? activeModalSaree.fabricTa : activeModalSaree.fabric}
                </span>
              </div>
              <div className="spec-row">
                <span className="spec-key">{t('zari_work')}</span>
                <span className="spec-val">
                  {lang === 'ta' ? activeModalSaree.zariTa : activeModalSaree.zari}
                </span>
              </div>
              <div className="spec-row">
                <span className="spec-key">{t('weave_origin')}</span>
                <span className="spec-val">
                  {lang === 'ta' ? activeModalSaree.originTa : activeModalSaree.origin}
                </span>
              </div>
              <div className="spec-row">
                <span className="spec-key">{t('blouse_piece')}</span>
                <span className="spec-val">
                  {lang === 'ta' ? activeModalSaree.blouseTa : activeModalSaree.blouse}
                </span>
              </div>
            </div>

            <div className="modal-action-buttons">
              <button className="btn-primary-orange btn-large" onClick={handleTryOn}>
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                <span>{t('try_this_now')}</span>
              </button>
              <button className="btn-secondary-blue btn-large" onClick={handleTrialRoom}>
                <i className="fa-solid fa-bell-concierge"></i>
                <span>{t('request_physical_trial')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
