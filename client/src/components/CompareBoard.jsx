import React from 'react';
import { useMirror } from '../context/MirrorContext';
import { playTapSound } from '../utils/audio';

export const CompareBoard = () => {
  const {
    sarees,
    compareIdA,
    setCompareIdA,
    compareIdB,
    setCompareIdB,
    drapeAndGoToMirror,
    lang,
    t
  } = useMirror();

  const sareeA = sarees.find(s => s.sareeId === compareIdA) || sarees[0];
  const sareeB = sarees.find(s => s.sareeId === compareIdB) || sarees[1] || sarees[0];

  return (
    <section className="tab-panel active" aria-label="Compare Looks">
      <div className="compare-page-container">
        <div className="compare-header">
          <h2 className="compare-title">{t('compare_title')}</h2>
          <p className="compare-desc">{t('compare_desc')}</p>
        </div>

        <div className="compare-split-board">
          {/* SLOT A */}
          <div className="compare-slot">
            <div className="slot-header">
              <span className="slot-badge badge-blue">LOOK A</span>
              <div className="slot-selector-dropdown">
                <select
                  value={compareIdA}
                  onChange={(e) => {
                    playTapSound();
                    setCompareIdA(e.target.value);
                  }}
                >
                  {sarees.map(s => (
                    <option key={s.sareeId} value={s.sareeId}>
                      {lang === 'ta' ? s.nameTa : s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="slot-preview-card">
              <div className="slot-image-wrapper">
                <img src={sareeA.image} alt={sareeA.name} />
              </div>
              <div className="slot-specs">
                <div className="compare-spec-item">
                  <span className="spec-label">{lang === 'ta' ? 'பெயர்' : 'Title'}</span>
                  <span className="spec-value">{lang === 'ta' ? sareeA.nameTa : sareeA.name}</span>
                </div>
                <div className="compare-spec-item">
                  <span className="spec-label">{lang === 'ta' ? 'விலை' : 'Price'}</span>
                  <span className="spec-value text-blue">{sareeA.priceFormatted}</span>
                </div>
                <div className="compare-spec-item">
                  <span className="spec-label">{lang === 'ta' ? 'ஜரிகை' : 'Zari'}</span>
                  <span className="spec-value">{lang === 'ta' ? sareeA.zariTa : sareeA.zari}</span>
                </div>
                <div className="compare-spec-item">
                  <span className="spec-label">{lang === 'ta' ? 'பிறப்பிடம்' : 'Origin'}</span>
                  <span className="spec-value">{lang === 'ta' ? sareeA.originTa : sareeA.origin}</span>
                </div>
              </div>

              <button
                className="btn-primary-orange full-width"
                onClick={() => drapeAndGoToMirror(sareeA.sareeId)}
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                <span>{t('try_look_a')}</span>
              </button>
            </div>
          </div>

          {/* VS BADGE */}
          <div className="compare-vs-badge">
            <span>VS</span>
          </div>

          {/* SLOT B */}
          <div className="compare-slot">
            <div className="slot-header">
              <span className="slot-badge badge-orange">LOOK B</span>
              <div className="slot-selector-dropdown">
                <select
                  value={compareIdB}
                  onChange={(e) => {
                    playTapSound();
                    setCompareIdB(e.target.value);
                  }}
                >
                  {sarees.map(s => (
                    <option key={s.sareeId} value={s.sareeId}>
                      {lang === 'ta' ? s.nameTa : s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="slot-preview-card">
              <div className="slot-image-wrapper">
                <img src={sareeB.image} alt={sareeB.name} />
              </div>
              <div className="slot-specs">
                <div className="compare-spec-item">
                  <span className="spec-label">{lang === 'ta' ? 'பெயர்' : 'Title'}</span>
                  <span className="spec-value">{lang === 'ta' ? sareeB.nameTa : sareeB.name}</span>
                </div>
                <div className="compare-spec-item">
                  <span className="spec-label">{lang === 'ta' ? 'விலை' : 'Price'}</span>
                  <span className="spec-value text-blue">{sareeB.priceFormatted}</span>
                </div>
                <div className="compare-spec-item">
                  <span className="spec-label">{lang === 'ta' ? 'ஜரிகை' : 'Zari'}</span>
                  <span className="spec-value">{lang === 'ta' ? sareeB.zariTa : sareeB.zari}</span>
                </div>
                <div className="compare-spec-item">
                  <span className="spec-label">{lang === 'ta' ? 'பிறப்பிடம்' : 'Origin'}</span>
                  <span className="spec-value">{lang === 'ta' ? sareeB.originTa : sareeB.origin}</span>
                </div>
              </div>

              <button
                className="btn-primary-orange full-width"
                onClick={() => drapeAndGoToMirror(sareeB.sareeId)}
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                <span>{t('try_look_b')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
