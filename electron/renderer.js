// Simple Image Generator using Canvas API
// No Python, No AI - Pure JavaScript!

function generateSimpleImage(text, color, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, size, size);

  // Draw cute face
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Eyes
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(size / 2 - size / 8, size / 2 - size / 10, size / 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(size / 2 + size / 8, size / 2 - size / 10, size / 30, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 6, 0, Math.PI, false);
  ctx.stroke();

  // Text
  ctx.fillStyle = 'black';
  ctx.font = `${size / 20}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(text, size / 2, size - size / 6);

  return canvas.toDataURL('image/png');
}

// Save image to file
function saveImage(dataUrl, filename) {
  const { writeFileSync } = require('fs');
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  writeFileSync(filename, buffer);
  console.log('✅ Image saved:', filename);
}

// Example usage
const imageData = generateSimpleImage('Hello World!', 'pink', 600);
// Display in img tag or save to file

module.exports = { generateSimpleImage, saveImage };
