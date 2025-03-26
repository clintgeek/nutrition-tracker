const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const INPUT_SVG = path.join(__dirname, '../public/icons/icon.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

async function generateIcons() {
  try {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Generate each icon size
    for (const size of ICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);

      await sharp(INPUT_SVG)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`Generated ${size}x${size} icon`);
    }

    // Generate maskable icons (with padding)
    for (const size of ICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `maskable-${size}x${size}.png`);

      // Add 10% padding for maskable icons
      const padding = Math.floor(size * 0.1);
      const innerSize = size - (padding * 2);

      await sharp(INPUT_SVG)
        .resize(innerSize, innerSize)
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 25, g: 118, b: 210, alpha: 1 } // #1976D2
        })
        .png()
        .toFile(outputPath);

      console.log(`Generated ${size}x${size} maskable icon`);
    }

    console.log('Icon generation complete!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();