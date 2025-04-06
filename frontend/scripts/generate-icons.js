const fs = require('fs').promises;
const path = require('path');

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const INPUT_DIR = path.join(__dirname, '../public/icons');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

async function generateIcons() {
  try {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Copy and rename each icon size
    for (const size of ICON_SIZES) {
      const inputPath = path.join(INPUT_DIR, `icon-${size}x${size}.png`);
      const tempPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png.new`);
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);

      // Copy the file
      await fs.copyFile(inputPath, tempPath);
      // Rename the file to replace the old one
      await fs.rename(tempPath, outputPath);
      console.log(`Updated ${size}x${size} icon`);
    }

    // Copy and rename maskable icons
    for (const size of ICON_SIZES) {
      const inputPath = path.join(INPUT_DIR, `maskable-${size}x${size}.png`);
      const tempPath = path.join(OUTPUT_DIR, `maskable-${size}x${size}.png.new`);
      const outputPath = path.join(OUTPUT_DIR, `maskable-${size}x${size}.png`);

      // Copy the file
      await fs.copyFile(inputPath, tempPath);
      // Rename the file to replace the old one
      await fs.rename(tempPath, outputPath);
      console.log(`Updated ${size}x${size} maskable icon`);
    }

    console.log('Icon generation complete!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();