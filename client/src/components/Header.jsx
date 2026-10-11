import React, { useState, useEffect } from 'react';
import { useMirror } from '../context/MirrorContext';
import { playTapSound } from '../utils/audio';

export const Header = () => {
  const {
    currentTab,
    setCurrentTab,
    t,
    callStylist,
    setIsWelcomeActive,
    savedSnaps,
    sarees,
    setIsSizeScanOpen
  } = useMirror();

  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTab = (tab) => {
    playTapSound();
    setCurrentTab(tab);
  };

  const handleExit = () => {
    playTapSound();
    setIsWelcomeActive(true);
  };

  return (
    <header className="main-header" id="main-header">
      <div className="header-left">
        <div className="header-brand" onClick={() => handleTab('mirror')}>
          <div className="logo-mark">
            <i className="fa-solid fa-gem"></i>
          </div>
          <div className="brand-titles">
            <span className="brand-header-title">VASTRA</span>
            <span className="brand-header-sub">{t('boutique_mirror')}</span>
          </div>
        </div>
      </div>

      <nav className="header-nav" aria-label="Main Navigation">
        <button
          className={`nav-tab-btn ${currentTab === 'mirror' ? 'active' : ''}`}
          onClick={() => handleTab('mirror')}
        >
          <i className="fa-solid fa-camera-viewfinder"></i>
          <span>{t('nav_mirror')}</span>
        </button>
        <button
          className={`nav-tab-btn ${currentTab === 'catalog' ? 'active' : ''}`}
          onClick={() => handleTab('catalog')}
        >
          <i className="fa-solid fa-vest-patches"></i>
          <span>{t('nav_collection')}</span>
          <span className="badge-count">{sarees.length}</span>
        </button>
        <button
          className={`nav-tab-btn ${currentTab === 'compare' ? 'active' : ''}`}
          onClick={() => handleTab('compare')}
        >
          <i className="fa-solid fa-columns"></i>
          <span>{t('nav_compare')}</span>
        </button>
        <button
          className={`nav-tab-btn ${currentTab === 'gallery' ? 'active' : ''}`}
          onClick={() => handleTab('gallery')}
        >
          <i className="fa-solid fa-images"></i>
          <span>{t('nav_saved')}</span>
          <span className="badge-count">{savedSnaps.length}</span>
        </button>
      </nav>

      <div className="header-right">
        <button className="btn-utility" onClick={() => setIsSizeScanOpen(true)} title="AI Size Recommendation">
          <i className="fa-solid fa-ruler-combined text-orange"></i>
          <span className="utility-label">Size Scan</span>
        </button>

        <button className="btn-utility" onClick={callStylist} title="Call Boutique Stylist">
          <i className="fa-solid fa-bell-concierge"></i>
          <span className="utility-label">{t('call_stylist')}</span>
        </button>

        <button className="btn-utility btn-ghost" onClick={handleExit} title="Return to Welcome Screen">
          <i className="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      </div>
    </header>
  );
};
