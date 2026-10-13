import React, { useRef, useEffect, useState } from 'react';
import { useMirror } from '../context/MirrorContext';
import { playTapSound } from '../utils/audio';
import { renderQRCodeToCanvas } from '../utils/qrGenerator';

export const QRCodeModal = () => {
  const { activeQRSnap, setActiveQRSnap, t } = useMirror();
  const canvasRef = useRef(null);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [imgError, setImgError] = useState(false);

  // Fetch server auto-detected LAN IP so phone on Wi-Fi can open it
  useEffect(() => {
    fetch('/api/system/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNetworkInfo(data);
        }
      })
      .catch(() => {
        // Fallback to current browser hostname if offline
        setNetworkInfo({
          lanIp: window.location.hostname,
          port: '5050',
          baseUrl: `http://${window.location.hostname}:5050`
        });
      });
  }, []);

  // Reset image error whenever active snapshot changes
  useEffect(() => {
    setImgError(false);
  }, [activeQRSnap]);

  // Generate ISO-compliant scannable QR Code on canvas
  useEffect(() => {
    if (!activeQRSnap || !canvasRef.current) return;

    const snapId = activeQRSnap.snapshotId || activeQRSnap.id || 'snap_latest';
    const hostIp = networkInfo?.lanIp && networkInfo.lanIp !== '127.0.0.1' && networkInfo.lanIp !== 'localhost'
      ? networkInfo.lanIp
      : window.location.hostname;
    const port = networkInfo?.port || '5050';

    // Must use the PC's local network IP (e.g. http://192.168.x.x:PORT/results/<id>), not localhost
    const payload = `http://${hostIp}:${port}/results/${snapId}`;

    renderQRCodeToCanvas(canvasRef.current, payload, {
      size: 190,
      padding: 3,
      foreground: '#0B2A5B',
      background: '#FFFFFF',
      accentDot: true
    });
  }, [activeQRSnap, networkInfo]);

  if (!activeQRSnap) return null;

  const handleClose = () => {
    playTapSound();
    setActiveQRSnap(null);
  };

  const rawImage = activeQRSnap.imageDataUrl || activeQRSnap.dataUrl || activeQRSnap.result_image_url;
  const isFailedOrMissing = !rawImage || typeof rawImage !== 'string' || rawImage.trim().length < 20 || activeQRSnap.status === 'failed';

  const handleDownload = () => {
    playTapSound();
    if (!rawImage) return;
    const link = document.createElement('a');
    link.download = `Vastra_Mirror_Look_${Date.now()}.jpg`;
    link.href = rawImage;
    link.click();
  };

  const handleImageError = () => {
    // Log image URL to browser console (NEVER the token)
    const logUrl = rawImage?.startsWith('data:') ? '[Base64 Encoded Image Data]' : rawImage;
    console.error('[QRCodeModal]: Image failed to load from URL:', logUrl);
    setImgError(true);
  };

  const snapId = activeQRSnap.snapshotId || activeQRSnap.id || 'snap_latest';
  const displayHost = networkInfo?.lanIp || window.location.hostname;
  const displayPort = networkInfo?.port || '5050';
  const qrTargetUrl = `http://${displayHost}:${displayPort}/results/${snapId}`;

  return (
    <div className="modal-backdrop active" onClick={handleClose}>
      <div className="modal-card qr-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={handleClose} title="Close">
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* ERROR STATE: MISSING, EMPTY, FAILED RESULT OR IMG LOAD ERROR */}
        {(isFailedOrMissing || imgError) ? (
          <div className="qr-error-container" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <div className="ai-error-icon-box" style={{ margin: '0 auto 1.25rem' }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 style={{ fontSize: '1.4rem', color: '#0B2A5B', marginBottom: '0.5rem' }}>
              {imgError ? 'Image Failed to Load' : 'Virtual Try-On Look Unavailable'}
            </h3>
            <p style={{ color: '#64748B', maxWidth: '420px', margin: '0 auto 1.5rem', fontSize: '0.92rem', lineHeight: '1.5' }}>
              {imgError
                ? 'The AI try-on look image could not be loaded from the server.'
                : 'The AI virtual try-on was unable to generate a valid result image.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                className="btn-primary-orange"
                onClick={() => {
                  playTapSound();
                  setImgError(false);
                  setActiveQRSnap(null);
                }}
              >
                <i className="fa-solid fa-rotate-right"></i> Retry Try-On
              </button>
              <button className="btn-secondary-blue" onClick={handleClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          /* SUCCESS STATE: VALID RESULT IMAGE */
          <div className="qr-content-wrapper">
            <div className="qr-snapshot-preview">
              <img
                src={rawImage}
                alt="Captured Mirror Look"
                onError={handleImageError}
              />
            </div>

            <div className="qr-info-section">
              <span className="badge-orange">{t('look_saved_badge') || 'Look Captured!'}</span>
              <h3 className="qr-title">{t('take_look_home') || 'Scan to Take This Look Home'}</h3>
              <p className="qr-subtitle">
                {t('scan_mobile_desc') || 'Scan this QR code with your mobile camera to instantly view high-res photo, saree details & share on WhatsApp.'}
              </p>

              <div className="qr-canvas-holder">
                <canvas ref={canvasRef} width="190" height="190"></canvas>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#536B8E', wordBreak: 'break-all' }}>
                  <i className="fa-solid fa-wifi" style={{ color: '#FF7A1A', marginRight: '4px' }}></i>
                  Wi-Fi Direct: <strong>{qrTargetUrl}</strong>
                </span>
              </div>

              <div className="qr-footer-actions">
                <button className="btn-primary-orange" onClick={handleDownload}>
                  <i className="fa-solid fa-download"></i> <span>{t('download_image') || 'Save Image'}</span>
                </button>
                <button className="btn-secondary-blue" onClick={handleClose}>
                  <i className="fa-solid fa-check"></i> <span>{t('done') || 'Done'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
