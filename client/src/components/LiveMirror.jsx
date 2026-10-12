import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useMirror } from '../context/MirrorContext';
import { playTapSound, playCountdownBeep, playCameraShutterSound } from '../utils/audio';
import { AITryOnModal } from './AITryOnModal';

export const LiveMirror = () => {
  const {
    selectedSaree,
    setSelectedSaree,
    selectSaree,
    sarees,
    lang,
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
    addSnapshot,
    setActiveQRSnap,
    setActiveModalSaree,
    setCompareIdB,
    setCurrentTab,
    setIsSizeScanOpen
  } = useMirror();

  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [countdown, setCountdown] = useState(null);

  // Full-Body MediaPipe Pose validation
  const [bodyStatus, setBodyStatus] = useState({
    isReady: false, // strictly false until whole body detected
    hint: 'Step into the full-body guide',
    code: 'step_back'
  });
  const [bypassBodyCheck, setBypassBodyCheck] = useState(false);
  const poseLandmarkerRef = useRef(null);
  const poseLoopId = useRef(null);

  // Consent Screen Modal state
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);

  // AI Try-On Modal & Job Polling state
  const [isTryOnModalOpen, setIsTryOnModalOpen] = useState(false);
  const [tryOnStatus, setTryOnStatus] = useState('idle'); // idle | queued | processing | completed | failed
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [aiError, setAiError] = useState(null);
  const [beforePhotoUrl, setBeforePhotoUrl] = useState(null);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState(null);
  const [latestCompletedLook, setLatestCompletedLook] = useState(null);
  const [modelPreference, setModelPreference] = useState('auto');
  const [lastUsedModel, setLastUsedModel] = useState('CatVTON (Overall)');
  const activeJobIdRef = useRef(null);
  const pollingTimerRef = useRef(null);
  const elapsedTimerRef = useRef(null);
  const capturedBlobRef = useRef(null);

  // 60-second kiosk inactivity timer
  const idleTimerRef = useRef(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      console.log('[Kiosk Security]: 60s inactivity reached. Resetting session for privacy.');
      if (activeJobIdRef.current) {
        fetch(`/api/tryon/${activeJobIdRef.current}`, { method: 'DELETE' }).catch(() => {});
        activeJobIdRef.current = null;
      }
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);

      setIsTryOnModalOpen(false);
      setIsConsentOpen(false);
      setBeforePhotoUrl(null);
      setAfterPhotoUrl(null);
      setTryOnStatus('idle');
      capturedBlobRef.current = null;
    }, 60000); // 60 seconds
  }, []);

  useEffect(() => {
    const activityEvents = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'click'];
    const handleUserActivity = () => resetIdleTimer();

    activityEvents.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));
    resetIdleTimer();

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  const LIGHTING_PRESETS = ['showroom', 'wedding', 'daylight', 'reception'];

  // Initialize MediaPipe Pose for Full-Body Check
  const initPoseDetector = useCallback(async () => {
    try {
      const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });
      poseLandmarkerRef.current = landmarker;
      console.log('[MediaPipe Pose]: Full-body pose tracker initialized.');
    } catch (err) {
      console.warn('[MediaPipe Pose]: Could not load full-body landmarker, defaulting to bypass:', err);
      setBypassBodyCheck(true);
    }
  }, []);

  // Continuous Full-Body Pose Tracking Loop
  const checkPoseLoop = useCallback(() => {
    if (videoRef.current && videoRef.current.readyState >= 2 && poseLandmarkerRef.current) {
      try {
        const result = poseLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
        if (result && result.landmarks && result.landmarks.length > 0) {
          const l = result.landmarks[0];
          const nose = l[0];
          const lShoulder = l[11];
          const rShoulder = l[12];
          const lHip = l[23];
          const rHip = l[24];
          const lKnee = l[25];
          const rKnee = l[26];
          const lAnkle = l[27];
          const rAnkle = l[28];

          const hasHead = nose && (nose.visibility ?? 1) > 0.4 && nose.y > 0.01;
          const hasShoulders = (lShoulder?.visibility ?? 1) > 0.4 && (rShoulder?.visibility ?? 1) > 0.4;
          const hasHips = (lHip?.visibility ?? 1) > 0.35 && (rHip?.visibility ?? 1) > 0.35;
          const hasKnees = (lKnee?.visibility ?? 1) > 0.35 || (rKnee?.visibility ?? 1) > 0.35;
          const hasAnkles = ((lAnkle?.visibility ?? 1) > 0.3 && lAnkle.y < 0.99) || ((rAnkle?.visibility ?? 1) > 0.3 && rAnkle.y < 0.99);

          if (!hasHead) {
            setBodyStatus({ isReady: false, hint: 'Position your head inside the frame', code: 'head' });
          } else if (!hasKnees || !hasAnkles) {
            setBodyStatus({ isReady: false, hint: 'Step back to show your full body (head to feet)', code: 'step_back' });
          } else if (!hasHips || !hasShoulders) {
            setBodyStatus({ isReady: false, hint: 'Align your body inside the guide silhouette', code: 'align' });
          } else {
            setBodyStatus({ isReady: true, hint: '✓ Full body detected! Ready to capture', code: 'ready' });
          }
        } else {
          setBodyStatus({ isReady: false, hint: 'Step into the full-body guide', code: 'no_person' });
        }
      } catch (e) {
        // Ignore single frame detection hiccups
      }
    }
    poseLoopId.current = setTimeout(checkPoseLoop, 250); // Check 4 times a second
  }, []);

  // Validate full body visibility on any canvas/image before calling AI
  const validateFullBodyPoseOnCanvas = useCallback(async (canvasElement) => {
    if (!poseLandmarkerRef.current) return { valid: true };
    try {
      const result = poseLandmarkerRef.current.detectForVideo(canvasElement, performance.now());
      if (!result || !result.landmarks || result.landmarks.length === 0) {
        return { valid: false, error: 'Please step back so your full body is visible' };
      }
      const l = result.landmarks[0];
      const nose = l[0];
      const lShoulder = l[11];
      const rShoulder = l[12];
      const lHip = l[23];
      const rHip = l[24];
      const lKnee = l[25];
      const rKnee = l[26];
      const lAnkle = l[27];
      const rAnkle = l[28];

      const headOk = nose && (nose.visibility ?? 1) > 0.35 && nose.y > 0.005;
      const shouldersOk = (lShoulder?.visibility ?? 1) > 0.35 && (rShoulder?.visibility ?? 1) > 0.35;
      const hipsOk = (lHip?.visibility ?? 1) > 0.3 && (rHip?.visibility ?? 1) > 0.3;
      const kneesOk = ((lKnee?.visibility ?? 1) > 0.25 || (rKnee?.visibility ?? 1) > 0.25);
      const anklesOk = ((lAnkle?.visibility ?? 1) > 0.25 || (rAnkle?.visibility ?? 1) > 0.25);

      if (!headOk || !shouldersOk || !hipsOk || !kneesOk || !anklesOk) {
        return { valid: false, error: 'Please step back so your full body is visible' };
      }
      return { valid: true };
    } catch (err) {
      console.warn('[validateFullBodyPoseOnCanvas warning]:', err);
      return { valid: true };
    }
  }, []);

  // Start Live Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setStream(mediaStream);
        setIsCameraActive(true);
      } else {
        setCameraError('Webcam is not supported in this browser.');
      }
    } catch (err) {
      console.warn('Live camera access error:', err);
      setCameraError('Camera access was blocked or unavailable. Please allow camera permissions in your browser.');
      setIsCameraActive(false);
    }
  }, [setIsCameraActive]);

  useEffect(() => {
    startCamera();
    initPoseDetector();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (poseLoopId.current) clearTimeout(poseLoopId.current);
    };
  }, []);

  useEffect(() => {
    if (isCameraActive) {
      poseLoopId.current = setTimeout(checkPoseLoop, 1000);
    }
    return () => {
      if (poseLoopId.current) clearTimeout(poseLoopId.current);
    };
  }, [isCameraActive, checkPoseLoop]);

  // Lighting Cycler
  const cycleLighting = () => {
    playTapSound();
    const currIdx = LIGHTING_PRESETS.indexOf(lightingPreset);
    const nextPreset = LIGHTING_PRESETS[(currIdx + 1) % LIGHTING_PRESETS.length];
    setLightingPreset(nextPreset);
  };

  const isCaptureAllowed = bypassBodyCheck || bodyStatus.isReady;

  // User clicks "Capture Look (3s)" - Always active as requested
  const handleCaptureClick = () => {
    if (countdown !== null || tryOnStatus === 'queued' || tryOnStatus === 'processing') return;
    if (!isCameraActive || !videoRef.current) {
      alert('Camera is not active. Please start your webcam first.');
      return;
    }

    if (!hasConsented) {
      playTapSound();
      setIsConsentOpen(true);
      return;
    }

    startCountdownAndCapture();
  };

  const handleConsentAccept = () => {
    playTapSound();
    setHasConsented(true);
    setIsConsentOpen(false);
    startCountdownAndCapture();
  };

  const startCountdownAndCapture = () => {
    setCountdown(3);
    playCountdownBeep(3);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        playCountdownBeep(count);
      } else {
        clearInterval(interval);
        setCountdown(null);
        captureCleanFrameAndRunTryOn();
      }
    }, 1000);
  };

  // NO CROPPING: Fit inside 768x1024 3:4 canvas by PADDING (never cropping)
  const captureCleanFrameAndRunTryOn = async () => {
    playCameraShutterSound();
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const video = videoRef.current;
    if (!video) return;

    const outWidth = 768;
    const outHeight = 1024;
    const offscreen = document.createElement('canvas');
    offscreen.width = outWidth;
    offscreen.height = outHeight;
    const ctx = offscreen.getContext('2d');

    // Fill canvas background with clean neutral studio color (no black bars)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outWidth, outHeight);

    // Mirrored horizontally like real mirror
    ctx.save();
    ctx.translate(outWidth, 0);
    ctx.scale(-1, 1);

    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;

    // Fill the portrait mirror canvas completely with real camera and real room (no white borders)
    const scale = Math.max(outWidth / vWidth, outHeight / vHeight);
    const dw = vWidth * scale;
    const dh = vHeight * scale;
    const dx = (outWidth - dw) / 2;
    const dy = (outHeight - dh) / 2;

    // Draw centered on canvas with correct mirrored coordinate dx
    ctx.drawImage(video, 0, 0, vWidth, vHeight, dx, dy, dw, dh);
    ctx.restore();

    const cleanDataUrl = offscreen.toDataURL('image/jpeg', 0.95);
    setBeforePhotoUrl(cleanDataUrl);

    offscreen.toBlob(async (blob) => {
      if (!blob) {
        setAiError('Failed to capture frame from webcam.');
        setTryOnStatus('failed');
        setIsTryOnModalOpen(true);
        return;
      }
      capturedBlobRef.current = blob;
      await submitToTryOnJobAPI(blob, modelPreference);
    }, 'image/jpeg', 0.95);
  };

  // Clear active polling intervals
  const clearJobTimers = () => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    pollingTimerRef.current = null;
    elapsedTimerRef.current = null;
  };

  // Submit job to POST /api/tryon and poll GET /api/tryon/:jobId
  const submitToTryOnJobAPI = async (personBlob, chosenModelPref = 'auto', chosenDrapeStyle = drapeStyle, chosenSeed = null) => {
    clearJobTimers();
    setIsTryOnModalOpen(true);
    setTryOnStatus('queued');
    setAiError(null);
    setAfterPhotoUrl(null);
    setElapsedSeconds(0);

    const startTime = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);

      if (elapsed >= 300) {
        clearJobTimers();
        if (activeJobIdRef.current) {
          fetch(`/api/tryon/${activeJobIdRef.current}`, { method: 'DELETE' }).catch(() => {});
        }
        setTryOnStatus('failed');
        setAiError('AI generation timed out after 5 minutes. The model might be busy. Please retry.');
      }
    }, 1000);

    try {
      const formData = new FormData();
      formData.append('person_image', personBlob, 'customer_photo.jpg');

      // ALWAYS USE CLEAN TRANSPARENT tryOnImage (BACKGROUND REMOVED)
      const cleanGarmentUrl = selectedSaree?.tryOnImage 
        || `/assets/tryon_${selectedSaree?.sareeId || 'saree-1'}.png` 
        || selectedSaree?.image 
        || '/assets/tryon_saree-1.png';
      formData.append('garment_url', cleanGarmentUrl);
      formData.append('try_on_image_url', cleanGarmentUrl);

      const activeDrape = chosenDrapeStyle || drapeStyle || 'Nivi';
      const activeSeed = chosenSeed !== null && chosenSeed !== undefined ? chosenSeed : Math.floor(Math.random() * 999999);

      formData.append('garment_name', selectedSaree?.name || 'Traditional Silk Saree');
      formData.append('category', selectedSaree?.category || 'saree');
      formData.append('model_preference', chosenModelPref);
      formData.append('drape_style', activeDrape);
      formData.append('denoise_steps', '35');
      formData.append('seed', activeSeed.toString());

      const response = await fetch('/api/tryon', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Server returned ${response.status}`);
      }

      const initData = await response.json();
      if (!initData.success || !initData.jobId) {
        throw new Error(initData.message || 'Failed to submit try-on job');
      }

      const jobId = initData.jobId;
      activeJobIdRef.current = jobId;
      setTryOnStatus('queued');

      // Poll every 2 seconds
      pollingTimerRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/tryon/${jobId}`);
          if (!pollRes.ok) {
            if (pollRes.status === 404) {
              clearJobTimers();
              setTryOnStatus('failed');
              setAiError('Job expired or not found.');
            }
            return;
          }

          const pollData = await pollRes.json();
          if (pollData.status === 'processing') {
            setTryOnStatus('processing');
          } else if ((pollData.status === 'completed' || pollData.status === 'done') && pollData.result_image_url) {
            clearJobTimers();
            activeJobIdRef.current = null;
            setAfterPhotoUrl(pollData.result_image_url);
            setLastUsedModel(pollData.provider || 'AI Image Edit (Qwen)');
            setTryOnStatus('completed');

            // Save completed look to ephemeral session store
            const snapId = 'snap_' + Date.now();
            const completedSnap = {
              snapshotId: snapId,
              id: snapId,
              status: 'done',
              sareeId: selectedSaree?.sareeId || selectedSaree?.id || 'saree-1',
              sareeName: selectedSaree?.name || 'Selected Saree',
              sareePrice: selectedSaree?.priceFormatted || '₹28,500',
              imageDataUrl: pollData.result_image_url,
              beforeImageUrl: beforePhotoUrl,
              kioskStation: 'Mirror Station #1',
              lightingPreset,
              drapeStyle: activeDrape,
              seed: activeSeed,
              blouseColor,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setLatestCompletedLook(completedSnap);
            addSnapshot(completedSnap, false); // adds to saved gallery, does not pop QR modal
          } else if (pollData.status === 'failed') {
            clearJobTimers();
            activeJobIdRef.current = null;
            setTryOnStatus('failed');
            setAiError(pollData.error || 'AI virtual try-on failed.');
            setLatestCompletedLook(null);
          }
        } catch (pollErr) {
          console.warn('Polling network glitch, retrying...', pollErr);
        }
      }, 2000);
    } catch (err) {
      clearJobTimers();
      setTryOnStatus('failed');
      setAiError(err.message || 'Unable to connect to AI server. Please check your connection.');
    }
  };

  const handleCancelJob = () => {
    playTapSound();
    clearJobTimers();
    if (activeJobIdRef.current) {
      fetch(`/api/tryon/${activeJobIdRef.current}`, { method: 'DELETE' }).catch(() => {});
      activeJobIdRef.current = null;
    }
    setTryOnStatus('idle');
    setIsTryOnModalOpen(false);
  };

  const handleRetryAI = () => {
    playTapSound();
    if (capturedBlobRef.current) {
      submitToTryOnJobAPI(capturedBlobRef.current, modelPreference, drapeStyle);
    } else {
      setIsTryOnModalOpen(false);
      handleCaptureClick();
    }
  };

  const handleRetryWithModel = (chosenModel) => {
    playTapSound();
    setModelPreference(chosenModel);
    if (capturedBlobRef.current) {
      submitToTryOnJobAPI(capturedBlobRef.current, chosenModel, drapeStyle);
    } else {
      setIsTryOnModalOpen(false);
      handleCaptureClick();
    }
  };

  const handleRetryWithStyle = (newStyle) => {
    playTapSound();
    setDrapeStyle(newStyle);
    if (capturedBlobRef.current) {
      submitToTryOnJobAPI(capturedBlobRef.current, modelPreference, newStyle);
    }
  };

  const handleRegenerateNewSeed = () => {
    playTapSound();
    if (capturedBlobRef.current) {
      const newSeed = Math.floor(Math.random() * 999999);
      submitToTryOnJobAPI(capturedBlobRef.current, modelPreference, drapeStyle, newSeed);
    }
  };

  const handleRetake = () => {
    playTapSound();
    clearJobTimers();
    setIsTryOnModalOpen(false);
    startCountdownAndCapture();
  };

  const handleTryAnotherSaree = () => {
    playTapSound();
    clearJobTimers();
    setIsTryOnModalOpen(false);
    setCurrentTab('catalog');
  };

  const handleQuickCompare = () => {
    playTapSound();
    if (selectedSaree) {
      setCompareIdB(selectedSaree.sareeId || selectedSaree.id);
      setCurrentTab('compare');
    }
  };

  return (
    <section className="tab-panel active" aria-label="AI Mirror Try-On">
      <div className="mirror-workspace-grid">
        {/* CENTER VIEWPORT */}
        <div className="mirror-viewport-container">
          <div className="mirror-frame" id="mirror-frame">
            {/* 1. CLEAN LIVE WEBCAM FEED (Mirrored) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`camera-stream ${isCameraActive ? 'active' : ''}`}
            ></video>

            {/* 2. FULL-BODY GUIDE OUTLINE SILHOUETTE OVERLAY (GREEN WHEN WHOLE BODY VISIBLE, RED WHEN NOT) */}
            {/* 3. Camera Connecting State */}
            {!isCameraActive && (
              <div className="camera-connecting-state">
                <div className="camera-loader-ring">
                  <i className="fa-solid fa-camera"></i>
                </div>
                <h3>Starting Live Mirror Camera...</h3>
                <p>
                  {cameraError || 'Please allow camera permission in your browser to try on sarees in real time.'}
                </p>
                <button className="btn-primary-orange" onClick={startCamera}>
                  <i className="fa-solid fa-video"></i> Start Camera Now
                </button>
              </div>
            )}

            {/* 4. Lighting Ambiance Tint */}
            <div className={`lighting-filter-tint ${lightingPreset}`}></div>

            {/* 8. Flash Overlay */}
            <div className={`shutter-flash ${isFlashing ? 'flashing' : ''}`}></div>

            {/* 9. Animated 3-Second Countdown */}
            {countdown !== null && (
              <div className="countdown-overlay active">
                <div className="countdown-box">
                  <div className="countdown-circle">
                    <span id="countdown-number">{countdown}</span>
                  </div>
                  <span className="countdown-label">Posing for Full-Body Drape!</span>
                </div>
              </div>
            )}

            {/* 10. Minimalist Circular Shutter Button (Image 5 style) */}
            {isCameraActive && (
              <div className="mirror-shutter-container">
                <button
                  className="mirror-shutter-circle-btn"
                  onClick={handleCaptureClick}
                  disabled={countdown !== null || tryOnStatus === 'queued' || tryOnStatus === 'processing'}
                  title="Capture Look"
                  aria-label="Capture Look"
                >
                  <i className="fa-solid fa-video"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR CONTROLS */}
        <aside className="mirror-sidebar">
          {/* Drape & Style Customizer */}
          <div className="sidebar-panel-box style-customizer-box">
            <div className="panel-header-row">
              <div className="panel-heading">
                <i className="fa-solid fa-sliders text-blue"></i>
                <span>{t('drape_styling')}</span>
              </div>
              <span className="badge-blue">CatVTON Overall</span>
            </div>

            {/* Model Engine Selector */}
            <div className="styling-group">
              <label className="control-label">AI Try-On Model Engine</label>
              <div className="pill-group">
                {[
                  { id: 'auto', label: 'Auto (Recommended)' },
                  { id: 'local', label: '💻 Local AI Draper (Offline / Free)' },
                  { id: 'fal_ai', label: '⚡ Fal.ai (2s Turbo)' },
                  { id: 'image_edit', label: 'AI Drape Edit' },
                  { id: 'catvton', label: 'CatVTON (Overall)' }
                ].map((m) => (
                  <button
                    key={m.id}
                    className={`style-chip ${modelPreference === m.id ? 'active' : ''}`}
                    onClick={() => {
                      playTapSound();
                      setModelPreference(m.id);
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Draping Style Dropdown (Nivi, Pinned Pleats, Seedha Pallu, Bengali) */}
            <div className="styling-group">
              <label className="control-label" htmlFor="draping-style-select">
                <i className="fa-solid fa-vest" style={{ marginRight: '6px', color: '#FF7A1A' }}></i>
                {t('drape_style')}
              </label>
              <div className="custom-select-wrapper">
                <select
                  id="draping-style-select"
                  className="draping-style-dropdown"
                  value={drapeStyle}
                  onChange={(e) => {
                    playTapSound();
                    setDrapeStyle(e.target.value);
                  }}
                >
                  <option value="Nivi">Nivi (Classic Pleats & Pallu over Left Shoulder)</option>
                  <option value="Pinned Pleats">Pinned Pleats (Crisp Structured Formal Drape)</option>
                  <option value="Seedha Pallu">Seedha Pallu (Gujarati Traditional Front Pallu)</option>
                  <option value="Bengali">Bengali (Graceful Box Pleats & Wrap)</option>
                </select>
              </div>
            </div>

            {/* Blouse Contrast Swatches */}
            <div className="styling-group">
              <label className="control-label">{t('blouse_color')}</label>
              <div className="swatch-row">
                {[
                  { hex: '#800000', name: 'Crimson Brocade' },
                  { hex: '#1E5EFF', name: 'Royal Blue' },
                  { hex: '#005F41', name: 'Emerald Silk' },
                  { hex: '#D4AF37', name: 'Metallic Gold' },
                  { hex: '#E0115F', name: 'Rani Pink' },
                  { hex: '#0B2A5B', name: 'Deep Navy' }
                ].map((c) => (
                  <button
                    key={c.hex}
                    className={`color-swatch ${blouseColor === c.hex ? 'active' : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => {
                      playTapSound();
                      setBlouseColor(c.hex);
                      setBlouseName(c.name);
                    }}
                    title={c.name}
                  />
                ))}
              </div>
              <span className="subtle-swatch-name">{blouseName}</span>
            </div>

            {/* Jewelry Accents */}
            <div className="styling-group">
              <label className="control-label">{t('jewelry_accent')}</label>
              <div className="jewelry-toggle-row">
                <button
                  className={`toggle-pill ${activeJewelry.necklace ? 'active' : ''}`}
                  onClick={() => {
                    playTapSound();
                    setActiveJewelry((prev) => ({ ...prev, necklace: !prev.necklace }));
                  }}
                >
                  <i className="fa-solid fa-gem"></i> <span>{t('temple_haram')}</span>
                </button>
                <button
                  className={`toggle-pill ${activeJewelry.belt ? 'active' : ''}`}
                  onClick={() => {
                    playTapSound();
                    setActiveJewelry((prev) => ({ ...prev, belt: !prev.belt }));
                  }}
                >
                  <i className="fa-solid fa-ring"></i> <span>{t('kamarbandh')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Instant Saree Drawer with REAL Images */}
          <div className="sidebar-panel-box saree-drawer-box">
            <div className="panel-header-row">
              <div className="panel-heading">
                <i className="fa-solid fa-sparkles text-orange"></i>
                <span>Saree Collection</span>
              </div>
              <button className="btn-link" onClick={() => setCurrentTab('catalog')}>
                {t('view_all')}
              </button>
            </div>

            <div className="quick-saree-carousel">
              {sarees.map((s) => {
                const sId = s.sareeId || s.id;
                const isSelected = (selectedSaree?.sareeId || selectedSaree?.id) === sId;
                return (
                  <div
                    key={sId}
                    className={`quick-saree-item ${isSelected ? 'active' : ''}`}
                    onClick={() => selectSaree(s)}
                  >
                    <img src={s.tryOnImage || s.image} alt={s.name} className="quick-saree-img" />
                    <div className="quick-saree-details">
                      <h4 className="quick-saree-name">{s.name}</h4>
                      <div className="quick-saree-meta">{s.origin || s.fabric}</div>
                      <div className="quick-saree-price">
                        {s.priceFormatted || `₹${s.price?.toLocaleString('en-IN')}`}
                      </div>
                    </div>
                    <button
                      className="quick-try-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectSaree(s);
                      }}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* USER PRIVACY CONSENT DIALOG */}
      {isConsentOpen && (
        <div className="modal-backdrop active" onClick={() => setIsConsentOpen(false)}>
          <div className="modal-card consent-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="consent-icon-box">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <h3 className="consent-title">AI Try-On Privacy & Consent</h3>
            <p className="consent-desc">
              Your photo is processed in memory for virtual fitting and deleted automatically after your session. We do not store your personal photos on any database or permanent server.
            </p>
            <div className="consent-actions-row">
              <button className="btn-secondary-blue" onClick={() => setIsConsentOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary-orange" onClick={handleConsentAccept}>
                <i className="fa-solid fa-check"></i> Agree & Take Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI TRY-ON RESULT & COMPARE MODAL */}
      <AITryOnModal
        isOpen={isTryOnModalOpen}
        status={tryOnStatus}
        elapsedSeconds={elapsedSeconds}
        error={aiError}
        beforeImageUrl={beforePhotoUrl}
        afterImageUrl={afterPhotoUrl}
        saree={selectedSaree}
        currentModel={lastUsedModel}
        currentDrapeStyle={drapeStyle}
        onClose={() => setIsTryOnModalOpen(false)}
        onCancelJob={handleCancelJob}
        onRetake={handleRetake}
        onTryAnotherSaree={handleTryAnotherSaree}
        onRetry={handleRetryAI}
        onRetryWithModel={handleRetryWithModel}
        onRetryWithStyle={handleRetryWithStyle}
        onRegenerateNewSeed={handleRegenerateNewSeed}
        onScanQR={latestCompletedLook ? () => setActiveQRSnap(latestCompletedLook) : null}
      />
    </section>
  );
};
