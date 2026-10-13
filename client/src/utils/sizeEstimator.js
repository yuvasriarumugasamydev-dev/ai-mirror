import sizeChartData from '../config/sizeChart.json';
import sizeRatios from '../config/sizeRatios.json';

/**
 * Compute the median value of a numerical array
 */
function median(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Aggregate multiple pose landmark frames over time using the MEDIAN to eliminate noise/jitter.
 * frames: Array of landmark arrays (each frame has 33 landmarks with x, y, z, visibility)
 */
export function aggregateMedianPose(frames) {
  if (!frames || frames.length === 0) return null;
  const landmarkCount = frames[0].length;
  const aggregated = [];

  for (let idx = 0; idx < landmarkCount; idx++) {
    const xs = frames.map(f => f[idx]?.x || 0);
    const ys = frames.map(f => f[idx]?.y || 0);
    const zs = frames.map(f => f[idx]?.z || 0);
    const visibilities = frames.map(f => f[idx]?.visibility || 1.0);

    aggregated.push({
      x: median(xs),
      y: median(ys),
      z: median(zs),
      visibility: median(visibilities)
    });
  }

  return aggregated;
}

/**
 * Check if the full body is properly visible and standing upright
 */
export function validateFullBodyPose(landmarks) {
  if (!landmarks || landmarks.length < 33) {
    return { valid: false, message: 'Detecting person... please step into frame.', level: 'none' };
  }

  const nose = landmarks[0];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  const minVis = sizeRatios.confidenceThresholds.mediumVisibility || 0.65;

  // Check head
  if (nose.visibility < minVis || nose.y < 0.05) {
    return { valid: false, message: 'Step back: head is too close to top edge.', level: 'step_back' };
  }

  // Check shoulders and hips
  if (leftShoulder.visibility < minVis || rightShoulder.visibility < minVis) {
    return { valid: false, message: 'Keep both shoulders clearly visible to camera.', level: 'shoulders' };
  }

  if (leftHip.visibility < minVis || rightHip.visibility < minVis) {
    return { valid: false, message: 'Step back: hips not fully visible.', level: 'step_back' };
  }

  // Check knees and ankles
  if (leftAnkle.visibility < minVis && rightAnkle.visibility < minVis) {
    return { valid: false, message: 'Step back 2-3 meters so feet & ankles are visible.', level: 'step_back' };
  }

  // Check tilt / straightness
  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
  if (shoulderTilt > 0.08) {
    return { valid: false, message: 'Please stand straight with shoulders level.', level: 'stand_straight' };
  }

  return { valid: true, message: 'Perfect posture! Hold still for scan...', level: 'ready' };
}

/**
 * Calculate measurements in centimeters using calibrated pixels-per-cm scale
 */
export function computeMeasurements(landmarks, userHeightCm, canvasWidth, canvasHeight, sideDepthRatio = null) {
  if (!landmarks || landmarks.length < 33 || !userHeightCm) return null;

  const nose = landmarks[0];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  // Convert normalized coords to pixel space
  const pt = (lm) => ({ x: lm.x * canvasWidth, y: lm.y * canvasHeight });

  const pNose = pt(nose);
  const pLShoulder = pt(leftShoulder);
  const pRShoulder = pt(rightShoulder);
  const pLHip = pt(leftHip);
  const pRHip = pt(rightHip);
  const pLAnkle = pt(leftAnkle);
  const pRAnkle = pt(rightAnkle);

  // Euclidean distance helper
  const dist = (p1, p2) => Math.hypot(p2.x - p1.x, p2.y - p1.y);

  // Shoulder midpoint & Hip midpoint
  const shoulderMid = { x: (pLShoulder.x + pRShoulder.x) / 2, y: (pLShoulder.y + pRShoulder.y) / 2 };
  const hipMid = { x: (pLHip.x + pRHip.x) / 2, y: (pLHip.y + pRHip.y) / 2 };
  const ankleMid = { x: (pLAnkle.x + pRAnkle.x) / 2, y: (pLAnkle.y + pRAnkle.y) / 2 };

  // Head top estimate: distance from nose to shoulder gives cranium height approximation
  const craniumHeight = Math.max(25, (shoulderMid.y - pNose.y) * 0.95);
  const headTopY = pNose.y - craniumHeight;

  // Person total vertical pixel distance from crown to ankles + feet margin
  const totalPixelHeight = (ankleMid.y - headTopY) * 1.05;

  if (totalPixelHeight <= 50) return null;

  // Scale calibration factor: pixels per centimeter
  const pixelsPerCm = totalPixelHeight / userHeightCm;

  // 1. Shoulder Width (in cm)
  const shoulderPixelWidth = dist(pLShoulder, pRShoulder);
  const shoulderWidthCm = Math.round((shoulderPixelWidth / pixelsPerCm) * sizeRatios.circumferenceRatios.shoulderDirect);

  // 2. Hip Width (in cm)
  const hipPixelWidth = dist(pLHip, pRHip);
  const hipWidthCm = (hipPixelWidth / pixelsPerCm);

  // 3. Torso Length (in cm)
  const torsoLengthPx = dist(shoulderMid, hipMid);
  const torsoLengthCm = Math.round(torsoLengthPx / pixelsPerCm);

  // 4. Estimated Waist Width (in cm)
  // Anatomically between ribs and hips, approximately narrower than hips
  const waistWidthCm = hipWidthCm * 0.84;

  // 5. Estimated Bust / Chest Width (in cm)
  const bustWidthCm = shoulderWidthCm * 0.86;

  // Circumferences using configurable ratios (or refined with side profile depth if available)
  const ratios = sizeRatios.circumferenceRatios;
  const depthFactor = sideDepthRatio || sizeRatios.depthEstimates.defaultDepthRatio;

  // Oval circumference approximation: C ≈ π * sqrt(2 * (w^2 + (w * depth)^2) / 2)
  const ellipseCirc = (w) => {
    const d = w * depthFactor;
    return Math.round(Math.PI * Math.sqrt(0.5 * (w * w + d * d)));
  };

  const bustCircCm = sideDepthRatio ? ellipseCirc(bustWidthCm) : Math.round(bustWidthCm * ratios.bust);
  const waistCircCm = sideDepthRatio ? ellipseCirc(waistWidthCm) : Math.round(waistWidthCm * ratios.waist);
  const hipCircCm = sideDepthRatio ? ellipseCirc(hipWidthCm) : Math.round(hipWidthCm * ratios.hip);

  // Compute confidence level
  const avgVis = (leftShoulder.visibility + rightShoulder.visibility + leftHip.visibility + rightHip.visibility + leftAnkle.visibility + rightAnkle.visibility) / 6;
  let confidence = 'High';
  if (avgVis < 0.75) confidence = 'Medium';
  if (avgVis < 0.6) confidence = 'Low';

  return {
    shoulder: Math.max(30, Math.min(52, shoulderWidthCm)),
    bust: Math.max(70, Math.min(130, bustCircCm)),
    waist: Math.max(55, Math.min(115, waistCircCm)),
    hip: Math.max(75, Math.min(135, hipCircCm)),
    torsoLength: torsoLengthCm,
    pixelsPerCm: parseFloat(pixelsPerCm.toFixed(2)),
    confidence
  };
}

/**
 * Match measurements to closest standard size in sizeChart.json
 */
export function matchSize(measurements, category = 'blouse') {
  if (!measurements) return null;

  const catData = sizeChartData.categories[category] || sizeChartData.categories.blouse;
  const sizes = catData.sizes;
  const sizeKeys = Object.keys(sizes); // ['XS', 'S', 'M', 'L', 'XL', 'XXL']

  let bestSize = 'M';
  let minDiff = Infinity;
  let secondBest = null;

  sizeKeys.forEach((sKey) => {
    const entry = sizes[sKey];
    let diff = 0;

    // Compare bust
    if (entry.bust && measurements.bust) {
      const midBust = (entry.bust[0] + entry.bust[1]) / 2;
      diff += Math.abs(measurements.bust - midBust) * 1.5;
    }

    // Compare waist
    if (entry.waist && measurements.waist) {
      const midWaist = (entry.waist[0] + entry.waist[1]) / 2;
      diff += Math.abs(measurements.waist - midWaist) * 1.2;
    }

    // Compare shoulder if relevant
    if (entry.shoulder && measurements.shoulder) {
      const midShoulder = (entry.shoulder[0] + entry.shoulder[1]) / 2;
      diff += Math.abs(measurements.shoulder - midShoulder) * 1.0;
    }

    if (diff < minDiff) {
      secondBest = bestSize;
      minDiff = diff;
      bestSize = sKey;
    }
  });

  // Check if user is between sizes
  const bestIdx = sizeKeys.indexOf(bestSize);
  let recommendedLabel = bestSize;
  const bestRange = sizes[bestSize];

  if (bestRange.bust && measurements.bust >= bestRange.bust[1] - 1 && bestIdx < sizeKeys.length - 1) {
    const nextSize = sizeKeys[bestIdx + 1];
    recommendedLabel = `${bestSize}, or ${nextSize} for a looser fit`;
  } else if (bestRange.bust && measurements.bust <= bestRange.bust[0] + 1 && bestIdx > 0) {
    const prevSize = sizeKeys[bestIdx - 1];
    recommendedLabel = `${bestSize}, or ${prevSize} for a snug tailored fit`;
  }

  // Tailored fit note
  let fitNote = "Tailored comfort fit based on your shoulder and bust proportions.";
  if (category === 'blouse') {
    fitNote = "Recommended blouse size. Sarees are free-size drapes; blouse tailored with 2-inch inner margin for easy alterations.";
  } else if (category === 'kurta') {
    fitNote = "Standard ease of 6-8 cm included in kurta bust line for effortless movement.";
  }

  return {
    category,
    categoryName: catData.displayName,
    recommendedSize: recommendedLabel,
    primarySize: bestSize,
    measurements,
    confidence: measurements.confidence || 'Medium',
    fitNote,
    disclaimer: "These are approximate estimates, not tailor measurements. Please confirm with our boutique staff."
  };
}
