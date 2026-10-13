import React from 'react';
import { useMirror } from './context/MirrorContext';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Header } from './components/Header';
import { LiveMirror } from './components/LiveMirror';
import { SareeCatalog } from './components/SareeCatalog';
import { CompareBoard } from './components/CompareBoard';
import { SavedLooks } from './components/SavedLooks';
import { SareeModal } from './components/SareeModal';
import { QRCodeModal } from './components/QRCodeModal';
import { StylistToast } from './components/StylistToast';
import { SizeScanModal } from './components/SizeScanModal';
import { AdminLogin } from './admin/adminlogin';

export function App() {
  const { isWelcomeActive, currentTab, setCurrentTab, lang, t, isSizeScanOpen, setIsSizeScanOpen } = useMirror();
  const [isAdminRoute, setIsAdminRoute] = React.useState(() => {
    return window.location.pathname.toLowerCase().startsWith('/admin') || window.location.hash.toLowerCase().startsWith('#/admin') || window.location.hash.toLowerCase() === '#admin';
  });

  React.useEffect(() => {
    const checkPath = () => {
      const match = window.location.pathname.toLowerCase().startsWith('/admin') || window.location.hash.toLowerCase().startsWith('#/admin') || window.location.hash.toLowerCase() === '#admin';
      setIsAdminRoute(match);
    };

    window.addEventListener('popstate', checkPath);
    window.addEventListener('hashchange', checkPath);
    return () => {
      window.removeEventListener('popstate', checkPath);
      window.removeEventListener('hashchange', checkPath);
    };
  }, []);

  const handleBackToMirror = () => {
    if (window.history.pushState) {
      window.history.pushState({}, '', '/');
    } else {
      window.location.hash = '';
    }
    setIsAdminRoute(false);
    setCurrentTab('mirror');
  };

  return (
    <div className="ai-mirror-app" data-lang={lang}>
      {/* 1. WELCOME IDLE SCREEN */}
      <WelcomeScreen />

      {/* 2. MAIN APP SHELL */}
      {isAdminRoute ? (
        <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: '#FAF5EF', position: 'relative', zIndex: 10 }}>
          <AdminLogin onBackToMirror={handleBackToMirror} />
        </div>
      ) : (
        <div className={`app-shell ${isWelcomeActive ? 'blurred' : ''}`}>
          <Header />

          <main className="main-content" id="main-content">
            {currentTab === 'mirror' && <LiveMirror />}
            {currentTab === 'catalog' && <SareeCatalog />}
            {currentTab === 'compare' && <CompareBoard />}
            {currentTab === 'gallery' && <SavedLooks />}
          </main>

          <footer className="app-bottom-bar">
            <div className="bottom-bar-left">
              <span className="store-location">
                <i className="fa-solid fa-location-dot"></i> Vastra Flagship Boutique • Chennai
              </span>
            </div>
            <div className="bottom-bar-center">
              <span className="active-stylist-tag">
                <i className="fa-solid fa-sparkles text-orange"></i>{' '}
                <span>{t('ai_stylist_active')}</span>
              </span>
            </div>
            <div className="bottom-bar-right">
              <span className="kiosk-clock">VASTRA AI BOUTIQUE KIOSK</span>
            </div>
          </footer>
        </div>
      )}

      {/* MODALS & OVERLAYS */}
      <SareeModal />
      <QRCodeModal />
      <StylistToast />
      <SizeScanModal isOpen={isSizeScanOpen} onClose={() => setIsSizeScanOpen(false)} />
    </div>
  );
}

export default App;
