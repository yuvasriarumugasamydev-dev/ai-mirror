/**
 * sareeImageFallback.js
 * Generates a beautiful SVG fabric-texture placeholder when a saree image fails to load.
 * Each saree gets a unique look based on its accentColor and zariColor.
 */

export function generateSareePlaceholder(saree = {}) {
  const accent = saree.accentColor || '#800000';
  const zari   = saree.zariColor   || '#FFD700';
  const label  = (saree.name || 'Saree').split(' ').slice(0, 3).join(' ');
  const sid    = (saree.sareeId || saree.id || 'x').replace(/[^a-z0-9]/gi, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="380" viewBox="0 0 300 380">
  <defs>
    <linearGradient id="sbg${sid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.93"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.68"/>
    </linearGradient>
    <pattern id="swv${sid}" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="12" fill="${zari}" fill-opacity="0.16"/>
    </pattern>
    <linearGradient id="sbd${sid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${zari}"/>
      <stop offset="100%" stop-color="#B8860B"/>
    </linearGradient>
  </defs>
  <!-- Fabric body -->
  <rect width="300" height="380" fill="url(#sbg${sid})"/>
  <!-- Weave texture -->
  <rect width="300" height="380" fill="url(#swv${sid})"/>
  <!-- Zari borders -->
  <rect x="0" y="0" width="300" height="22" fill="url(#sbd${sid})" opacity="0.9"/>
  <rect x="0" y="358" width="300" height="22" fill="url(#sbd${sid})" opacity="0.9"/>
  <rect x="0" y="22" width="16" height="336" fill="url(#sbd${sid})" opacity="0.65"/>
  <rect x="284" y="22" width="16" height="336" fill="url(#sbd${sid})" opacity="0.65"/>
  <!-- Center diamond motif -->
  <polygon points="150,110 195,155 150,200 105,155" fill="${zari}" fill-opacity="0.45" stroke="${zari}" stroke-width="1.5"/>
  <polygon points="150,128 180,155 150,182 120,155" fill="${accent}" fill-opacity="0.65"/>
  <circle cx="150" cy="155" r="12" fill="${zari}" fill-opacity="0.7"/>
  <!-- Label box -->
  <rect x="38" y="218" width="224" height="64" rx="9" fill="rgba(0,0,0,0.4)"/>
  <text x="150" y="243" text-anchor="middle" fill="${zari}" font-family="Georgia,serif" font-size="11" font-weight="bold" letter-spacing="1.2">VASTRA BOUTIQUE</text>
  <text x="150" y="265" text-anchor="middle" fill="white" font-family="Georgia,serif" font-size="10">${label}</text>
  <text x="150" y="314" text-anchor="middle" fill="white" fill-opacity="0.5" font-family="sans-serif" font-size="9">Tap to try on</text>
</svg>`;

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * React onError handler factory.
 * Usage: <img src={saree.image} onError={onSareeImgError(saree)} />
 */
export function onSareeImgError(saree) {
  return (e) => {
    e.currentTarget.onerror = null; // prevent infinite loop
    e.currentTarget.src = generateSareePlaceholder(saree);
  };
}

