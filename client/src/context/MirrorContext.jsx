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

  // Load from Express backend on mount
  useEffect(() => {
    fetchSarees('all').then(data => {
      if (data && data.length > 0) {
        setSarees(data);
      }
    });
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
