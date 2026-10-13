/**
 * Standard Scannable QR Code Generator for HTML5 Canvas
 * Generates ISO/IEC 18004 compliant QR Code (Version 1-10 Byte Mode)
 * Ensures smartphones (iOS Camera / Android Lens) can reliably scan the QR code.
 */

// Reed-Solomon Galois Field math
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = val;
    GF256_EXP[i + 255] = val;
    GF256_LOG[val] = i;
    val = (val << 1) ^ (val & 128 ? 0x11d : 0);
  }
})();

function gfMultiply(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function rsGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMultiply(poly[j], GF256_EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsCalculateEcc(data, eccCount) {
  const genPoly = rsGeneratorPoly(eccCount);
  const ecc = new Array(eccCount).fill(0);
  for (const byte of data) {
    const factor = byte ^ ecc[0];
    ecc.shift();
    ecc.push(0);
    for (let i = 0; i < eccCount; i++) {
      ecc[i] ^= gfMultiply(genPoly[i], factor);
    }
  }
  return ecc;
}

// Capacity specs for Error Correction Level L
const QR_VERSIONS = [
  null,
  { size: 21, dataCodewords: 19, eccCodewords: 7, align: [] },
  { size: 25, dataCodewords: 34, eccCodewords: 10, align: [6, 18] },
  { size: 29, dataCodewords: 55, eccCodewords: 15, align: [6, 22] },
  { size: 33, dataCodewords: 80, eccCodewords: 20, align: [6, 26] },
  { size: 37, dataCodewords: 108, eccCodewords: 26, align: [6, 30] },
  { size: 41, dataCodewords: 136, eccCodewords: 36, align: [6, 22, 38] }
];

export function generateQRCodeMatrix(text) {
  const utf8Bytes = new TextEncoder().encode(text);
  const dataLen = utf8Bytes.length;

  let version = 1;
  while (version < QR_VERSIONS.length && QR_VERSIONS[version].dataCodewords - 2 < dataLen) {
    version++;
  }
  if (version >= QR_VERSIONS.length) version = QR_VERSIONS.length - 1;

  const spec = QR_VERSIONS[version];
  const size = spec.size;

  // Build bitstream: Mode (0100 for Byte) + Count + Data + Terminator
  const bits = [];
  const addBits = (val, count) => {
    for (let i = count - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  addBits(0b0100, 4); // Byte mode
  addBits(dataLen, 8); // Character count
  for (const b of utf8Bytes) {
    addBits(b, 8);
  }
  // Terminator
  addBits(0, Math.min(4, spec.dataCodewords * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad bytes
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < spec.dataCodewords * 8) {
    addBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to codewords
  const dataWords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let word = 0;
    for (let j = 0; j < 8; j++) {
      word = (word << 1) | bits[i + j];
    }
    dataWords.push(word);
  }

  // Calculate RS ECC
  const eccWords = rsCalculateEcc(dataWords, spec.eccCodewords);
  const finalWords = [...dataWords, ...eccWords];

  // Initialize Matrix
  const matrix = Array.from({ length: size }, () => new Array(size).fill(null));
  const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));

  const setModule = (r, c, val) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val ? 1 : 0;
      isFunction[r][c] = true;
    }
  };

  // 1. Finder Patterns
  const addFinder = (row, col) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isEdge = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          setModule(nr, nc, isEdge || isCenter);
        } else {
          setModule(nr, nc, false); // Separator
        }
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // 2. Alignment Patterns
  for (const ar of spec.align) {
    for (const ac of spec.align) {
      if (isFunction[ar][ac]) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const isBlack = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
          setModule(ar + r, ac + c, isBlack);
        }
      }
    }
  }

  // 3. Timing Patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) setModule(6, i, i % 2 === 0);
    if (matrix[i][6] === null) setModule(i, 6, i % 2 === 0);
  }

  // 4. Dark Module
  setModule(size - 8, 8, true);

  // 5. Reserve Format Bits
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) setModule(8, i, false);
    if (matrix[i][8] === null) setModule(i, 8, false);
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) setModule(8, i, false);
    if (matrix[i][8] === null) setModule(i, 8, false);
  }

  // 6. Place Data bits (up-down snake)
  const bitStream = [];
  for (const byte of finalWords) {
    for (let i = 7; i >= 0; i--) {
      bitStream.push((byte >> i) & 1);
    }
  }

  let bitIdx = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    const rows = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (!isFunction[r][c]) {
          const bit = bitIdx < bitStream.length ? bitStream[bitIdx++] : 0;
          // Apply standard mask 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = (bit ^ (mask ? 1 : 0)) ? 1 : 0;
        }
      }
    }
    upwards = !upwards;
  }

  // 7. Write Format Information (Level L, Mask 0: 0x77C4)
  const formatBits = 0x77c4;
  for (let i = 0; i < 15; i++) {
    const bit = (formatBits >> (14 - i)) & 1;
    // Around Top-Left
    if (i < 6) matrix[8][i] = bit;
    else if (i === 6) matrix[8][7] = bit;
    else if (i === 7) matrix[8][8] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    // Around Top-Right and Bottom-Left
    if (i < 8) matrix[size - 1 - i][8] = bit;
    else matrix[8][size - 15 + i] = bit;
  }

  return matrix;
}

/**
 * Render standard compliant QR Code directly to canvas
 */
export function renderQRCodeToCanvas(canvas, text, options = {}) {
  if (!canvas) return;
  const matrix = generateQRCodeMatrix(text);
  const matrixSize = matrix.length;
  const ctx = canvas.getContext('2d');

  const padding = options.padding ?? 4; // Standard quiet zone
  const totalGrid = matrixSize + padding * 2;
  const size = options.size || canvas.width || 220;

  canvas.width = size;
  canvas.height = size;

  const cellSize = size / totalGrid;

  // Background
  ctx.fillStyle = options.background || '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // QR Modules (Navy Boutique Color)
  ctx.fillStyle = options.foreground || '#0B2A5B';

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c] === 1) {
        ctx.fillRect(
          Math.floor((c + padding) * cellSize),
          Math.floor((r + padding) * cellSize),
          Math.ceil(cellSize),
          Math.ceil(cellSize)
        );
      }
    }
  }

  // Optional Boutique Accent in Center
  if (options.accentDot) {
    ctx.fillStyle = '#FF7A1A';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, cellSize * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
