import React, { useState } from 'react';
import { useMirror } from '../context/MirrorContext';
import { playTapSound } from '../utils/audio';

export const SareeCatalog = () => {
  const { sarees, lang, t, drapeAndGoToMirror, setActiveModalSaree, setCompareIdB, setCurrentTab } = useMirror();
  const [filter, setFilter] = useState('all');

  const filteredSarees = filter === 'all'
    ? sarees
    : sarees.filter(s => s.category === filter || (filter === 'bridal' && s.isBridal));

  const handleFilter = (cat) => {
    playTapSound();
    setFilter(cat);
  };

  const handleCompare = (e, sareeId) => {
    e.stopPropagation();
    playTapSound();
    setCompareIdB(sareeId);
    setCurrentTab('compare');
  };

  return (
    <section className="tab-panel active" aria-label="Saree Collection">
      <div className="catalog-page-container">
        {/* Banner */}
        <div className="catalog-header-bar">
          <div>
            <h2 className="catalog-main-title">{t('curated_masterpieces')}</h2>
            <p className="catalog-sub-title">{t('catalog_subtitle')}</p>
          </div>

          <div className="catalog-filter-chips">
            {[
              { id: 'all', label: t('all_sarees') },
              { id: 'kanjivaram', label: t('cat_kanjivaram') },
              { id: 'banarasi', label: t('cat_banarasi') },
              { id: 'organza', label: t('cat_organza') },
              { id: 'bridal', label: t('cat_bridal') }
            ].map(chip => (
              <button
                key={chip.id}
                className={`category-chip ${filter === chip.id ? 'active' : ''}`}
                onClick={() => handleFilter(chip.id)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* SAREES ARE THE HERO - Grid */}
        <div className="saree-hero-grid">
          {filteredSarees.length === 0 ? (
            <div className="empty-catalog-box" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px', background: 'rgba(255, 255, 255, 0.7)', borderRadius: '16px', margin: '20px 0' }}>
              <i className="fa-solid fa-vest-patches" style={{ fontSize: '3.5rem', color: '#c5a059', marginBottom: '16px', display: 'block' }}></i>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                {lang === 'ta' ? 'புடவை சேகரிப்பு காலியாக உள்ளது' : 'Saree Collection is Empty'}
              </h3>
              <p style={{ color: '#777', fontSize: '1rem', maxWidth: '420px', margin: '0 auto' }}>
                {lang === 'ta'
                  ? 'அனைத்து மாதிரி புடவைகளும் நீக்கப்பட்டுவிட்டன.'
                  : 'All sample saree collections have been removed.'}
              </p>
            </div>
          ) : (
            filteredSarees.map(saree => (
              <article key={saree.sareeId} className="saree-hero-card">
                <div
                  className="saree-card-photo-stage"
                  onClick={() => {
                    playTapSound();
                    setActiveModalSaree(saree);
                  }}
                >
                  <img src={saree.image} alt={saree.name} loading="lazy" />
                  <span className="saree-card-tag">
                    {lang === 'ta' ? saree.originTa : saree.origin}
                  </span>

                  <div className="saree-card-quick-actions">
                    <button
                      className="btn-card-circle"
                      onClick={(e) => handleCompare(e, saree.sareeId)}
                      title="Compare"
                    >
                      <i className="fa-solid fa-plus-minus"></i>
                    </button>
                    <button
                      className="btn-card-circle"
                      onClick={(e) => {
                        e.stopPropagation();
                        playTapSound();
                        setActiveModalSaree(saree);
                      }}
                      title="Details"
                    >
                      <i className="fa-solid fa-expand"></i>
                    </button>
                  </div>
                </div>

                <div className="saree-card-body">
                  <div>
                    <div className="saree-card-meta-row">
                      <span className="saree-card-region">{saree.category.toUpperCase()}</span>
                      <span className="saree-card-rating">
                        <i className="fa-solid fa-star"></i> {saree.rating}
                      </span>
                    </div>
                    <h3 className="saree-card-title">
                      {lang === 'ta' ? saree.nameTa : saree.name}
                    </h3>
                    <p className="saree-card-fabric">
                      {lang === 'ta' ? saree.fabricTa : saree.fabric}
                    </p>
                  </div>

                  <div className="saree-card-footer">
                    <div className="saree-card-price-box">
                      <span className="saree-card-price-label">
                        {lang === 'ta' ? 'விலை' : 'Price'}
                      </span>
                      <span className="saree-card-price">{saree.priceFormatted}</span>
                    </div>
                    <button
                      className="btn-card-tryon"
                      onClick={() => drapeAndGoToMirror(saree.sareeId)}
                    >
                      <i className="fa-solid fa-wand-magic-sparkles"></i>
                      <span>{t('try_this_now')}</span>
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
