import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TRANSLATIONS } from '../utils/translations';
import { playTapSound, playChimeAlert } from '../utils/audio';
import { fetchSarees, saveSnapshotAPI, requestStylistAPI } from '../services/api';

import localSarees from '../data/sarees.json';

const MirrorContext = createContext();

export const MirrorProvider = ({ children }) => {
  const [sarees, setSarees] = useState(localSarees);
  const [activeSareeId, setActiveSareeId] = useState('saree-1');
  const [isWelcomeActive, setIsWelcomeActive] = useState(false);
  const [currentTab, setCurrentTab] = useState('mirror');
  const [lang, setLang] = useState('en');

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

  // Synchronize sarees from backend API and localStorage
  const reloadSarees = useCallback(async () => {
    let loadedFromApi = false;
    try {
      const data = await fetchSarees('all');
      if (Array.isArray(data) && data.length > 0) {
        setSarees(data);
        loadedFromApi = true;
      }
    } catch (e) {
      console.warn('[MirrorContext] Failed to fetch from backend, checking localStorage:', e);
    }

    // Direct synchronous sync from admin localStorage if backend not reachable or has fewer items
    try {
      const saved = localStorage.getItem('vastra_admin_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!loadedFromApi) {
            const formatted = parsed.map(p => ({
              sareeId: p.id || p.sareeId,
              id: p.id || p.sareeId,
              name: p.name,
              origin: p.fabric || 'Pure Silk',
              fabric: p.fabric || 'Pure Silk',
              category: p.category || 'kanjivaram',
              priceFormatted: p.price ? (String(p.price).startsWith('₹') ? p.price : `₹${p.price}`) : '₹0',
              price: parseInt(String(p.price || 0).replace(/[₹,]/g, '')) || 0,
              image: p.image || '/assets/image_20261013_123805.jpg',
              tryOnImage: p.image || '/assets/image_20261013_123805.jpg',
              accentColor: p.colorCode || '#A61C52',
              isBridal: false
            }));
            setSarees(formatted);
          }
        }
      }
    } catch (err) {}
  }, []);

  // Initial load and global event listeners for instant sync
  useEffect(() => {
    reloadSarees();

    const handleSync = () => reloadSarees();
    const handleStorage = (e) => {
      if (e.key === 'vastra_saree_sync' || e.key === 'vastra_admin_products') {
        reloadSarees();
      }
    };

    window.addEventListener('vastra_saree_sync', handleSync);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('vastra_saree_sync', handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [reloadSarees]);

  // Re-sync whenever user returns to mirror or catalog
  useEffect(() => {
    if (currentTab === 'mirror' || currentTab === 'catalog') {
      reloadSarees();
    }
  }, [currentTab, reloadSarees]);

  const [isSizeScanOpen, setIsSizeScanOpen] = useState(false);

  const t = (key) => TRANSLATIONS[lang]?.[key] || key;

  const selectedSaree = sarees.find(s => (s.sareeId === activeSareeId || s.id === activeSareeId)) || sarees[0] || null;
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
    await saveSnapshotAPI(snap);
  };

  return (
    <MirrorContext.Provider
      value={{
        sarees,
        reloadSarees,
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
