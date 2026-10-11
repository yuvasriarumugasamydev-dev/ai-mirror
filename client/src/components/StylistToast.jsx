import React from 'react';
import { useMirror } from '../context/MirrorContext';

export const StylistToast = () => {
  const { showStylistToast, setShowStylistToast, t } = useMirror();

  if (!showStylistToast) return null;

  return (
    <div className="stylist-alert-toast active">
      <div className="toast-icon">
        <i className="fa-solid fa-bell-concierge"></i>
      </div>
      <div className="toast-body">
        <strong>{t('stylist_alert_title')}</strong>
        <p>{t('stylist_alert_msg')}</p>
      </div>
      <button className="toast-close" onClick={() => setShowStylistToast(false)}>
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
};
