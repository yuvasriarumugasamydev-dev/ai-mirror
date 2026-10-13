import React, { useState } from 'react';
import { useMirror } from '../context/MirrorContext';
import { playTapSound } from '../utils/audio';

export const SareeCatalog = () => {
  const { sarees, lang, t, drapeAndGoToMirror, setActiveModalSaree, setCompareIdB, setCurrentTab } = useMirror();
  const [filter, setFilter] = useState('all');

  // Dynamically extract unique fabrics from added sarees
  const availableFabrics = React.useMemo(() => {
    const set = new Set();
    sarees.forEach(s => {
      if (s.fabric && s.fabric.trim()) {
        set.add(s.fabric.trim());
      }
    });
    return Array.from(set);
  }, [sarees]);

  const filteredSarees = filter === 'all'
    ? sarees
    : sarees.filter(s => (s.fabric || '').toLowerCase() === filter.toLowerCase());

  const handleFilter = (fabric) => {
    playTapSound();
    setFilter(fabric);
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
            <button
              className={`category-chip ${filter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilter('all')}
            >
              {t('all_sarees')}
            </button>
            {availableFabrics.map(fabric => (
              <button
                key={fabric}
                className={`category-chip ${filter.toLowerCase() === fabric.toLowerCase() ? 'active' : ''}`}
                onClick={() => handleFilter(fabric)}
              >
                {fabric}
              </button>
            ))}
          </div>
        </div>

        {/* SAREES ARE THE HERO - Grid */}
        <div className="saree-hero-grid">
          {filteredSarees.map(saree => (
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
          ))}
        </div>
      </div>
    </section>
  );
};
