const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '../public');

const icons = [
  { input: 'pwa-192x192.svg', output: 'pwa-192x192.png', size: 192 },
  { input: 'pwa-512x512.svg', output: 'pwa-512x512.png', size: 512 },
  { input: 'apple-touch-icon.svg', output: 'apple-touch-icon.png', size: 180 },
  { input: 'apple-touch-icon-152x152.svg', output: 'apple-touch-icon-152x152.png', size: 152 },
  { input: 'apple-touch-icon-180x180.svg', output: 'apple-touch-icon-180x180.png', size: 180 },
  { input: 'apple-touch-icon-167x167.svg', output: 'apple-touch-icon-167x167.png', size: 167 },
];

async function convertIcons() {
  for (const { input, output, size } of icons) {
    const inputPath = path.join(publicDir, input);
    const outputPath = path.join(publicDir, output);

    try {
      await sharp(inputPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✓ Converted ${input} → ${output}`);
    } catch (error) {
      console.error(`✗ Error converting ${input}:`, error.message);
    }
  }
  console.log('\n✓ All icons converted to PNG successfully!');
}

convertIcons();
