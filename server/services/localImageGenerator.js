import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Local Image Generator using Sharp (No Cloud APIs needed)
 * Creates simple composite images for try-on simulation
 */
export class LocalImageGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '../public/generated');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate a simple try-on composite image
   * @param {Buffer} personImage - User's photo buffer
   * @param {Buffer|string} garmentImage - Saree image buffer or URL
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated image path
   */
  async generateTryOn(personImage, garmentImage, options = {}) {
    try {
      const {
        width = 800,
        height = 1200,
        garmentName = 'Saree',
        outputFileName = `tryon_${Date.now()}.png`
      } = options;

      console.log(`[Local Generator] Creating composite image: ${outputFileName}`);

      // Load person image
      let personBuffer = personImage;
      if (typeof personImage === 'string' && personImage.startsWith('data:')) {
        // Convert base64 to buffer
        const base64Data = personImage.split(',')[1];
        personBuffer = Buffer.from(base64Data, 'base64');
      }

      // Load garment image
      let garmentBuffer = garmentImage;
      if (typeof garmentImage === 'string') {
        if (garmentImage.startsWith('data:')) {
          const base64Data = garmentImage.split(',')[1];
          garmentBuffer = Buffer.from(base64Data, 'base64');
        } else if (garmentImage.startsWith('http')) {
          // Fetch from URL (not implemented here, would need fetch)
          throw new Error('URL fetching not implemented in local generator');
        } else {
          // Local file path
          garmentBuffer = fs.readFileSync(garmentImage);
        }
      }

      // Resize person image to standard size
      const resizedPerson = await sharp(personBuffer)
        .resize(width, height, { fit: 'cover', position: 'center' })
        .toBuffer();

      // Resize garment to overlay size (smaller, positioned on body)
      const garmentWidth = Math.floor(width * 0.6);
      const garmentHeight = Math.floor(height * 0.5);
      
      const resizedGarment = await sharp(garmentBuffer)
        .resize(garmentWidth, garmentHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();

      // Create composite image (overlay garment on person)
      const outputPath = path.join(this.outputDir, outputFileName);
      
      await sharp(resizedPerson)
        .composite([{
          input: resizedGarment,
          top: Math.floor(height * 0.25), // Position garment at 25% from top
          left: Math.floor((width - garmentWidth) / 2), // Center horizontally
          blend: 'over'
        }])
        .toFile(outputPath);

      console.log(`[Local Generator] ✅ Generated: ${outputFileName}`);

      // Return relative URL path
      return `/public/generated/${outputFileName}`;
    } catch (error) {
      console.error('[Local Generator Error]:', error.message);
      throw error;
    }
  }

  /**
   * Generate a simple placeholder image with text
   */
  async generatePlaceholder(text, options = {}) {
    const {
      width = 800,
      height = 1200,
      bgColor = '#f0e6d2',
      textColor = '#8b4513'
    } = options;

    const outputFileName = `placeholder_${Date.now()}.png`;
    const outputPath = path.join(this.outputDir, outputFileName);

    // Create SVG text image
    const svgText = `
      <svg width="${width}" height="${height}">
        <rect width="100%" height="100%" fill="${bgColor}"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="48" 
              fill="${textColor}" text-anchor="middle" dominant-baseline="middle">
          ${text}
        </text>
      </svg>
    `;

    await sharp(Buffer.from(svgText))
      .png()
      .toFile(outputPath);

    return `/public/generated/${outputFileName}`;
  }

  /**
   * Clean up old generated images (older than 1 hour)
   */
  cleanupOldImages() {
    const files = fs.readdirSync(this.outputDir);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    files.forEach(file => {
      const filePath = path.join(this.outputDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > oneHour) {
        fs.unlinkSync(filePath);
        console.log(`[Local Generator] Cleaned up: ${file}`);
      }
    });
  }
}

// Export singleton instance
export const localGenerator = new LocalImageGenerator();

// Run cleanup on startup and every hour
localGenerator.cleanupOldImages();
setInterval(() => localGenerator.cleanupOldImages(), 60 * 60 * 1000);
