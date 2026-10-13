import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useMirror } from '../context/MirrorContext';
import { playTapSound, playChimeAlert } from '../utils/audio';
import {
  aggregateMedianPose,
  validateFullBodyPose,
  computeMeasurements,
  matchSize
} from '../utils/sizeEstimator';

export const SizeScanModal = ({ isOpen, onClose }) => {
  const { isCameraActive } = useMirror();

  // Modal Step: 'setup' -> 'scanning' -> 'side_prompt' -> 'result'
  const [step, setStep] = useState('setup');
  const [heightCm, setHeightCm] = useState(165);
  const [category, setCategory] = useState('blouse'); // 'blouse', 'kurta', 'gown'
  
  // Camera & Video
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const localStreamRef = useRef(null);

  // Scan state
  const [feedback, setFeedback] = useState('Initializing camera...');
  const [feedbackLevel, setFeedbackLevel] = useState('none');
  const [isScanningFrames, setIsScanningFrames] = useState(false);
  const [scanProgress, setScanProgress] = useState(0); // 0 to 100
  const poseFramesRef = useRef([]);

  // Result & Override state
  const [scanResult, setScanResult] = useState(null);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [manualBust, setManualBust] = useState('');
  const [manualWaist, setManualWaist] = useState('');
  const [manualHip, setManualHip] = useState('');
  const [manualShoulder, setManualShoulder] = useState('');

  // MediaPipe Landmarker instance ref
  const landmarkerRef = useRef(null);
  const animFrameId = useRef(null);

  // Initialize MediaPipe Pose Landmarker
  const initMediaPipe = useCallback(async () => {
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
      landmarkerRef.current = landmarker;
    } catch (err) {
      console.warn('MediaPipe Pose Vision load warning, using smart geometric fallback:', err);
    }
  }, []);

  // Start internal camera stream if needed
  const startCameraStream = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        localStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (e) {
      console.warn('Modal camera error:', e);
    }
  }, []);

  const stopCameraStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep('setup');
      setScanResult(null);
      setIsManualOverride(false);
      initMediaPipe();
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => stopCameraStream();
  }, [isOpen, initMediaPipe, startCameraStream, stopCameraStream]);

  // Pose detection loop
  useEffect(() => {
    if (!isOpen || step !== 'scanning') return;

    let active = true;

    const detectLoop = () => {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState >= 2 && canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Run MediaPipe if available
        if (landmarkerRef.current) {
          try {
            const results = landmarkerRef.current.detectForVideo(video, performance.now());
            if (results && results.landmarks && results.landmarks.length > 0) {
              const landmarks = results.landmarks[0];
              const validation = validateFullBodyPose(landmarks);
              setFeedback(validation.message);
              setFeedbackLevel(validation.level);

              // Draw guide landmarks on canvas
              drawPoseGuide(ctx, landmarks, canvas.width, canvas.height, validation.valid);

              if (validation.valid && isScanningFrames) {
                poseFramesRef.current.push(landmarks);
                const progressPct = Math.min(100, Math.round((poseFramesRef.current.length / 18) * 100));
                setScanProgress(progressPct);

                if (poseFramesRef.current.length >= 18) {
                  // Captured 18 frames over ~2 seconds: compute median and finish scan!
                  finishScan();
                  return;
                }
              }
            } else {
              setFeedback('Please step into full camera frame (2-3 meters back).');
              setFeedbackLevel('step_back');
            }
          } catch (e) {
            // Video timestamp catch
          }
        } else {
          // Simulation fallback if MediaPipe CDN was blocked
          setFeedback('Simulated Scan: Stand straight, arms slightly apart.');
          setFeedbackLevel('ready');
          if (isScanningFrames) {
            poseFramesRef.current.push(generateFallbackLandmarks());
            const progressPct = Math.min(100, Math.round((poseFramesRef.current.length / 18) * 100));
            setScanProgress(progressPct);
            if (poseFramesRef.current.length >= 18) {
              finishScan();
              return;
            }
          }
        }
      }

      animFrameId.current = requestAnimationFrame(detectLoop);
    };

    animFrameId.current = requestAnimationFrame(detectLoop);
    return () => {
      active = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isOpen, step, isScanningFrames]);

  // Finish scan and compute measurements
  const finishScan = () => {
    setIsScanningFrames(false);
    playChimeAlert();

    const medianPose = aggregateMedianPose(poseFramesRef.current);
    const canvas = canvasRef.current || { width: 640, height: 480 };
    const measurements = computeMeasurements(medianPose, heightCm, canvas.width, canvas.height);

    if (measurements) {
      const match = matchSize(measurements, category);
      setScanResult(match);
      setManualBust(measurements.bust);
      setManualWaist(measurements.waist);
      setManualHip(measurements.hip);
      setManualShoulder(measurements.shoulder);
      setStep('result');
    } else {
      setFeedback('Scan could not determine full body scale. Please try again.');
      setStep('setup');
    }
  };

  // Start Frame Collection
  const handleStartScan = () => {
    playTapSound();
    poseFramesRef.current = [];
    setScanProgress(0);
    setIsScanningFrames(true);
    setStep('scanning');
  };

  // Recalculate with manual override
  const handleManualApply = () => {
    playTapSound();
    const customMeasurements = {
      bust: Number(manualBust) || 88,
      waist: Number(manualWaist) || 72,
      hip: Number(manualHip) || 96,
      shoulder: Number(manualShoulder) || 38,
      confidence: 'High (Staff Verified)'
    };
    const match = matchSize(customMeasurements, category);
    setScanResult(match);
    setIsManualOverride(false);
  };

  // Draw Pose Guide Lines
  const drawPoseGuide = (ctx, landmarks, w, h, isValid) => {
    ctx.save();
    ctx.strokeStyle = isValid ? '#34D399' : '#FF7A1A';
    ctx.lineWidth = 3;

    // Connect shoulders
    const lSh = landmarks[11];
    const rSh = landmarks[12];
    ctx.beginPath();
    ctx.moveTo(lSh.x * w, lSh.y * h);
    ctx.lineTo(rSh.x * w, rSh.y * h);
    ctx.stroke();

    // Connect hips
    const lHp = landmarks[23];
    const rHp = landmarks[24];
    ctx.beginPath();
    ctx.moveTo(lHp.x * w, lHp.y * h);
    ctx.lineTo(rHp.x * w, rHp.y * h);
    ctx.stroke();

    // Torso spine line
    ctx.beginPath();
    ctx.moveTo(((lSh.x + rSh.x) / 2) * w, ((lSh.y + rSh.y) / 2) * h);
    ctx.lineTo(((lHp.x + rHp.x) / 2) * w, ((lHp.y + rHp.y) / 2) * h);
    ctx.strokeStyle = '#FFFFFF88';
    ctx.setLineDash([4, 4]);
    ctx.stroke();

    ctx.restore();
  };

  // Generate fallback landmarks for resilient offline testing
  const generateFallbackLandmarks = () => {
    const list = [];
    for (let i = 0; i < 33; i++) {
      list.push({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 });
    }
    list[0] = { x: 0.5, y: 0.18, z: 0, visibility: 0.95 }; // nose
    list[11] = { x: 0.42, y: 0.28, z: 0, visibility: 0.92 }; // left shoulder
    list[12] = { x: 0.58, y: 0.28, z: 0, visibility: 0.92 }; // right shoulder
    list[23] = { x: 0.44, y: 0.52, z: 0, visibility: 0.90 }; // left hip
    list[24] = { x: 0.56, y: 0.52, z: 0, visibility: 0.90 }; // right hip
    list[27] = { x: 0.45, y: 0.92, z: 0, visibility: 0.88 }; // left ankle
    list[28] = { x: 0.55, y: 0.92, z: 0, visibility: 0.88 }; // right ankle
    return list;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop active" onClick={onClose}>
      <div className="modal-card size-scan-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* MODAL HEADER */}
        <div className="size-modal-header">
          <div className="size-badge-icon">
            <i className="fa-solid fa-ruler-combined"></i>
          </div>
          <div>
            <h2 className="size-modal-title">AI Boutique Size Recommendation</h2>
            <p className="size-modal-sub">
              Contactless body estimation powered by MediaPipe AI Vision
            </p>
          </div>
        </div>

        {/* STEP 1: SETUP SCREEN */}
        {step === 'setup' && (
          <div className="size-setup-body">
            <div className="setup-guidance-banner">
              <i className="fa-solid fa-person text-orange"></i>
              <div>
                <strong>Scan Instructions:</strong>
                <p>
                  Stand straight <strong>2 to 3 meters</strong> from camera, full body visible from head to feet, arms slightly away from sides, wearing fitted clothes.
                </p>
              </div>
            </div>

            <div className="size-inputs-grid">
              <div className="input-group">
                <label className="input-label">
                  <i className="fa-solid fa-arrows-up-down"></i> Enter Your Height (in cm):
                </label>
                <div className="height-input-stepper">
                  <button
                    className="step-btn"
                    onClick={() => setHeightCm(prev => Math.max(130, prev - 1))}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={e => setHeightCm(Number(e.target.value) || 165)}
                    className="height-number-input"
                    min="130"
                    max="220"
                  />
                  <span className="unit-tag">cm</span>
                  <button
                    className="step-btn"
                    onClick={() => setHeightCm(prev => Math.min(210, prev + 1))}
                  >
                    +
                  </button>
                </div>
                <span className="input-hint">Scale calibration depends on exact height</span>
              </div>

              <div className="input-group">
                <label className="input-label">
                  <i className="fa-solid fa-vest"></i> Sizing Category:
                </label>
                <div className="category-pill-group">
                  <button
                    className={`cat-pill ${category === 'blouse' ? 'active' : ''}`}
                    onClick={() => setCategory('blouse')}
                  >
                    <i className="fa-solid fa-gem"></i> Saree Blouse
                  </button>
                  <button
                    className={`cat-pill ${category === 'kurta' ? 'active' : ''}`}
                    onClick={() => setCategory('kurta')}
                  >
                    <i className="fa-solid fa-shirt"></i> Kurta
                  </button>
                  <button
                    className={`cat-pill ${category === 'gown' ? 'active' : ''}`}
                    onClick={() => setCategory('gown')}
                  >
                    <i className="fa-solid fa-person-dress"></i> Gown
                  </button>
                </div>
                <span className="input-hint">
                  {category === 'blouse'
                    ? 'Sarees are free-size; we recommend your matching tailored blouse size.'
                    : 'Standard ready-to-wear sizing chart.'}
                </span>
              </div>
            </div>

            <div className="setup-actions-row">
              <button className="btn-secondary-blue" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary-orange btn-lg" onClick={handleStartScan}>
                <i className="fa-solid fa-camera"></i> Step Into Frame & Start Scan
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SCANNING LIVE CAMERA VIEW */}
        {step === 'scanning' && (
          <div className="size-scanning-body">
            <div className="scanner-viewport-box">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="scanner-video-feed"
              ></video>
              <canvas ref={canvasRef} className="scanner-canvas-overlay"></canvas>

              {/* Full-Body Silhouette Guide Overlay */}
              <div className="body-silhouette-guide">
                <svg viewBox="0 0 200 400" className="silhouette-svg">
                  {/* Head */}
                  <circle cx="100" cy="55" r="22" className="guide-stroke" />
                  {/* Neck */}
                  <path d="M 94 77 L 94 90 M 106 77 L 106 90" className="guide-stroke" />
                  {/* Torso & Shoulders */}
                  <path d="M 60 100 L 140 100 L 126 185 L 74 185 Z" className="guide-stroke" />
                  {/* Arms */}
                  <path d="M 60 100 L 40 180 M 140 100 L 160 180" className="guide-stroke" />
                  {/* Hips & Legs */}
                  <path d="M 74 185 L 126 185 L 118 360 L 98 360 L 98 220 L 102 220 L 102 360 L 82 360 Z" className="guide-stroke" />
                </svg>
              </div>

              {/* Live Guidance Badge */}
              <div className={`scan-guidance-pill ${feedbackLevel}`}>
                <span className="pulse-indicator"></span>
                <span>{feedback}</span>
              </div>

              {/* 2-Second Progress Bar */}
              {isScanningFrames && (
                <div className="scan-progress-strip">
                  <div className="progress-fill" style={{ width: `${scanProgress}%` }}></div>
                  <span className="progress-text">Analyzing Body Landmarks... {scanProgress}%</span>
                </div>
              )}
            </div>

            <div className="scanner-footer-actions">
              <button
                className="btn-secondary-blue"
                onClick={() => setStep('setup')}
              >
                <i className="fa-solid fa-arrow-left"></i> Change Height
              </button>
              <button
                className="btn-utility"
                onClick={() => {
                  setIsManualOverride(true);
                  setStep('result');
                }}
              >
                Staff Manual Entry
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: RESULT SCREEN */}
        {step === 'result' && scanResult && (
          <div className="size-result-body">
            {!isManualOverride ? (
              <>
                <div className="result-hero-card">
                  <div className="size-badge-pill">
                    <span className="sub-tag">RECOMMENDED SIZE</span>
                    <h1 className="size-hero-title">{scanResult.recommendedSize}</h1>
                  </div>

                  <div className="fit-details-col">
                    <div className="category-tag-row">
                      <span className="badge-blue">{scanResult.categoryName}</span>
                      <span className={`confidence-badge ${scanResult.confidence.toLowerCase()}`}>
                        Confidence: {scanResult.confidence}
                      </span>
                    </div>
                    <p className="fit-note-text">{scanResult.fitNote}</p>
                  </div>
                </div>

                <div className="measurements-breakdown-card">
                  <h4 className="section-title">
                    <i className="fa-solid fa-chart-simple text-blue"></i> Approximate Body Measurements
                  </h4>
                  <div className="measurements-grid">
                    <div className="meas-item">
                      <span className="meas-label">Bust / Chest</span>
                      <strong className="meas-val">{scanResult.measurements.bust} cm</strong>
                      <span className="meas-sub">~{Math.round(scanResult.measurements.bust / 2.54)}"</span>
                    </div>
                    <div className="meas-item">
                      <span className="meas-label">Waist</span>
                      <strong className="meas-val">{scanResult.measurements.waist} cm</strong>
                      <span className="meas-sub">~{Math.round(scanResult.measurements.waist / 2.54)}"</span>
                    </div>
                    <div className="meas-item">
                      <span className="meas-label">Hip</span>
                      <strong className="meas-val">{scanResult.measurements.hip} cm</strong>
                      <span className="meas-sub">~{Math.round(scanResult.measurements.hip / 2.54)}"</span>
                    </div>
                    <div className="meas-item">
                      <span className="meas-label">Shoulder</span>
                      <strong className="meas-val">{scanResult.measurements.shoulder} cm</strong>
                      <span className="meas-sub">~{Math.round(scanResult.measurements.shoulder / 2.54)}"</span>
                    </div>
                  </div>
                </div>

                {/* Honesty & Safety Disclaimer */}
                <div className="disclaimer-alert-box">
                  <i className="fa-solid fa-circle-info"></i>
                  <span>{scanResult.disclaimer}</span>
                </div>

                <div className="result-actions-row">
                  <button className="btn-secondary-blue" onClick={handleStartScan}>
                    <i className="fa-solid fa-arrow-rotate-right"></i> Retake Scan
                  </button>
                  <button
                    className="btn-utility"
                    onClick={() => setIsManualOverride(true)}
                  >
                    <i className="fa-solid fa-pen-to-square"></i> Staff Manual Override
                  </button>
                  <button className="btn-primary-orange btn-lg" onClick={onClose}>
                    <i className="fa-solid fa-check"></i> Apply & Return to Mirror
                  </button>
                </div>
              </>
            ) : (
              /* STAFF MANUAL OVERRIDE SCREEN */
              <div className="manual-override-card">
                <h3 className="override-title">
                  <i className="fa-solid fa-sliders text-orange"></i> Staff Measurement Override
                </h3>
                <p className="override-sub">
                  Enter tailor tape measurements (in cm) to calculate the exact size.
                </p>

                <div className="override-grid">
                  <div className="override-item">
                    <label>Bust (cm):</label>
                    <input
                      type="number"
                      value={manualBust}
                      onChange={e => setManualBust(e.target.value)}
                      className="override-input"
                    />
                  </div>
                  <div className="override-item">
                    <label>Waist (cm):</label>
                    <input
                      type="number"
                      value={manualWaist}
                      onChange={e => setManualWaist(e.target.value)}
                      className="override-input"
                    />
                  </div>
                  <div className="override-item">
                    <label>Hip (cm):</label>
                    <input
                      type="number"
                      value={manualHip}
                      onChange={e => setManualHip(e.target.value)}
                      className="override-input"
                    />
                  </div>
                  <div className="override-item">
                    <label>Shoulder (cm):</label>
                    <input
                      type="number"
                      value={manualShoulder}
                      onChange={e => setManualShoulder(e.target.value)}
                      className="override-input"
                    />
                  </div>
                </div>

                <div className="override-actions-row">
                  <button
                    className="btn-secondary-blue"
                    onClick={() => setIsManualOverride(false)}
                  >
                    Back
                  </button>
                  <button className="btn-primary-orange" onClick={handleManualApply}>
                    <i className="fa-solid fa-check-double"></i> Recalculate Size
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
