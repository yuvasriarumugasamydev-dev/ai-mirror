import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS } from '../utils/translations';
import { playTapSound, playChimeAlert } from '../utils/audio';
import { fetchSarees, saveSnapshotAPI, requestStylistAPI } from '../services/api';

import localSarees from '../data/sarees.json';

const MirrorContext = createContext();

export const MirrorProvider = ({ children }) => {
  const [sarees, setSarees] = useState(localSarees);
  const [activeSareeId, setActiveSareeId] = useState('saree-1');
  const [isWelcomeActive, setIsWelcomeActive] = useState(false);
  const [currentTab, setCurrentTab] = useState(() => {
    try {
      return localStorage.getItem('vastra_active_tab') || 'mirror';
    } catch (e) {
      return 'mirror';
    }
  });
  const [lang, setLang] = useState('en');

  useEffect(() => {
    try {
      localStorage.setItem('vastra_active_tab', currentTab);
    } catch (e) {}
  }, [currentTab]);

  // Mirror Styling Settings
  const [drapeStyle, setDrapeStyle] = useState('nivi');
  const [blouseColor, setBlouseColor] = useState('#800000');
  const [blouseName, setBlouseName] = useState('Crimson Brocade');
  const [activeJewelry, setActiveJewelry] = useState({ necklace: true, belt: false });
  const [lightingPreset, setLightingPreset] = useState('showroom');
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Compare & Gallery State
  const [compareIdA, setCompareIdA] = useState('saree-1');
  const [compareIdB, setCompareIdB] = useState('saree-2');
  const [savedSnaps, setSavedSnaps] = useState([]);
  const [activeModalSaree, setActiveModalSaree] = useState(null);
  const [activeQRSnap, setActiveQRSnap] = useState(null);
  const [showStylistToast, setShowStylistToast] = useState(false);

  // Helper to format admin product into user saree card format
  const formatAdminProduct = (p, idx) => ({
    sareeId: p.sareeId || p.id || `saree-admin-${idx}`,
    name: p.name || 'Boutique Designer Saree',
    nameTa: p.nameTa || p.name || 'புதிய பட்டு புடவை',
    category: (p.category || 'kanjivaram').toLowerCase(),
    isBridal: p.isBridal || false,
    price: typeof p.price === 'string' ? parseInt(p.price.replace(/[^\d]/g, ''), 10) || 15000 : Number(p.price) || 15000,
    priceFormatted: p.price ? (p.price.toString().startsWith('₹') ? p.price : `₹${p.price}`) : '₹15,000',
    origin: p.origin || 'Kanchipuram, Tamil Nadu',
    originTa: 'காஞ்சிபுரம், தமிழ்நாடு',
    fabric: p.fabric || 'Pure Silk',
    fabricTa: p.fabric || 'தூய பட்டு',
    zari: 'Gold Zari',
    zariTa: 'தங்க ஜரிகை',
    blouse: 'Matching Silk Blouse',
    blouseTa: 'பொருத்தமான ரவிக்கை',
    rating: 5.0,
    reviewsCount: 1,
    image: p.image || '/assets/saree_kanjivaram_red.jpg',
    accentColor: p.colorCode || '#800000',
    zariColor: '#FFD700',
    story: `${p.name || 'Designer saree'} carefully woven in premium quality silk.`,
    storyTa: 'பாரம்பரிய கைத்தறி நெசவில் உருவான அழகிய புடவை.',
    tryOnImage: p.image || '/assets/saree_kanjivaram_red.jpg'
  });

  // Load from Express backend + localStorage on mount and sync with Admin additions
  const refreshSarees = async () => {
    try {
      let adminItems = [];
      try {
        const localSaved = localStorage.getItem('vastra_admin_products');
        if (localSaved) {
          adminItems = JSON.parse(localSaved);
        }
      } catch (e) {}

      const backendData = await fetchSarees('all');
      
      // Combine backend and admin products
      let combined = [];
      if (backendData && Array.isArray(backendData) && backendData.length > 0) {
        combined = backendData;
      }

      if (adminItems && adminItems.length > 0) {
        adminItems.forEach((adm, idx) => {
          const formatted = formatAdminProduct(adm, idx);
          if (!combined.some(c => (c.sareeId === formatted.sareeId || c.id === formatted.sareeId))) {
            combined.unshift(formatted);
          }
        });
      }

      setSarees(combined);
      if (combined.length > 0 && !activeSareeId) {
        setActiveSareeId(combined[0].sareeId);
      }
    } catch (e) {
      console.warn('Failed to refresh sarees:', e);
    }
  };

  useEffect(() => {
    refreshSarees();

    // Listen for admin additions across windows/tabs
    const handleStorageChange = (e) => {
      if (e.key === 'vastra_admin_products' || e.key === 'vastra_saree_sync') {
        refreshSarees();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [isSizeScanOpen, setIsSizeScanOpen] = useState(false);

  const t = (key) => TRANSLATIONS[lang]?.[key] || key;

  const selectedSaree = sarees.find(s => (s.sareeId === activeSareeId || s.id === activeSareeId)) || sarees[0];
  const activeSaree = selectedSaree; // Alias for backward compatibility

  const setSelectedSaree = (sareeOrId) => {
    if (typeof sareeOrId === 'object' && sareeOrId !== null) {
      setActiveSareeId(sareeOrId.sareeId || sareeOrId.id);
    } else {
      setActiveSareeId(sareeOrId);
    }
  };

  const drapeSaree = (id) => {
    playTapSound();
    setActiveSareeId(id);
  };

  const selectSaree = (saree) => {
    playTapSound();
    setSelectedSaree(saree);
  };

  const drapeAndGoToMirror = (id) => {
    drapeSaree(id);
    setCurrentTab('mirror');
    setActiveModalSaree(null);
  };

  const callStylist = () => {
    playChimeAlert();
    setShowStylistToast(true);
    requestStylistAPI({ station: 'Mirror Station #1', sareeId: activeSareeId });
    setTimeout(() => {
      setShowStylistToast(false);
    }, 5000);
  };

  const addSnapshot = async (snap, showQR = false) => {
    setSavedSnaps(prev => [snap, ...prev]);
    if (showQR) {
      setActiveQRSnap(snap);
    }

    // Persist real-time live try-on counts
    try {
      const today = new Date().toISOString().slice(0, 10);
      const prevToday = parseInt(localStorage.getItem(`vastra_tryons_${today}`) || '0', 10);
      const prevTotal = parseInt(localStorage.getItem('vastra_total_tryons') || '0', 10);
      
      const newToday = prevToday + 1;
      const newTotal = prevTotal + 1;

      localStorage.setItem(`vastra_tryons_${today}`, newToday.toString());
      localStorage.setItem('vastra_total_tryons', newTotal.toString());
      localStorage.setItem('vastra_live_tryon_event', Date.now().toString());

      // Also trigger a custom window event for same-tab live updates
      window.dispatchEvent(new Event('vastra_tryon_updated'));
    } catch (e) {
      console.warn('Could not record live tryon metric:', e);
    }

    await saveSnapshotAPI(snap);
  };

  return (
    <MirrorContext.Provider
      value={{
        sarees,
        selectedSaree,
        setSelectedSaree,
        selectSaree,
        activeSaree,
        activeSareeId,
        setActiveSareeId,
        drapeSaree,
        drapeAndGoToMirror,
        isSizeScanOpen,
        setIsSizeScanOpen,
        isWelcomeActive,
        setIsWelcomeActive,
        currentTab,
        setCurrentTab,
        lang,
        setLang,
        t,
        drapeStyle,
        setDrapeStyle,
        blouseColor,
        setBlouseColor,
        blouseName,
        setBlouseName,
        activeJewelry,
        setActiveJewelry,
        lightingPreset,
        setLightingPreset,
        isCameraActive,
        setIsCameraActive,
        compareIdA,
        setCompareIdA,
        compareIdB,
        setCompareIdB,
        savedSnaps,
        addSnapshot,
        activeModalSaree,
        setActiveModalSaree,
        activeQRSnap,
        setActiveQRSnap,
        showStylistToast,
        setShowStylistToast,
        callStylist
      }}
    >
      {children}
    </MirrorContext.Provider>
  );
};

export const useMirror = () => useContext(MirrorContext);
