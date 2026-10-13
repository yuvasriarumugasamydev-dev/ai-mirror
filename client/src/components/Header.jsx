import React, { useState, useEffect } from 'react';
import { useMirror } from '../context/MirrorContext';
import { playTapSound } from '../utils/audio';

export const Header = () => {
  const {
    currentTab,
    setCurrentTab,
    t,
    savedSnaps,
    sarees
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


  return (
    <header className="main-header" id="main-header">
      <div className="header-left">
        <div
          className="header-brand"
          onClick={() => handleTab('admin')}
          style={{ cursor: 'pointer' }}
          title="Click to open Admin Login"
        >
          <div className="logo-mark" style={{ cursor: 'pointer' }}>
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
        <button
          className={`nav-tab-btn ${currentTab === 'admin' ? 'active' : ''}`}
          onClick={() => handleTab('admin')}
          style={{
            borderColor: currentTab === 'admin' ? '#A61C52' : undefined,
          }}
        >
          <i className="fa-solid fa-user-shield" style={{ color: currentTab === 'admin' ? '#A61C52' : '#C58B37' }}></i>
          <span>Admin</span>
        </button>
      </nav>


    </header>
  );
};
