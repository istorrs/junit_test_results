// Simple script to generate PWA icons as SVG files
// These can be converted to PNG manually or with a tool like sharp

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

// Create a simple icon SVG with the app's theme color
const createIconSVG = (size, text) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#3b82f6"/>
  <text
    x="50%"
    y="50%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="Arial, sans-serif"
    font-size="${size * 0.4}"
    font-weight="bold"
    fill="white"
  >${text}</text>
</svg>`;

// Generate icons
const icons = [
  { size: 192, name: 'pwa-192x192.svg', text: 'J' },
  { size: 512, name: 'pwa-512x512.svg', text: 'J' },
  { size: 180, name: 'apple-touch-icon.svg', text: 'J' },
  { size: 152, name: 'apple-touch-icon-152x152.svg', text: 'J' },
  { size: 180, name: 'apple-touch-icon-180x180.svg', text: 'J' },
  { size: 167, name: 'apple-touch-icon-167x167.svg', text: 'J' },
];

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate each icon
icons.forEach(({ size, name, text }) => {
  const svg = createIconSVG(size, text);
  const filePath = path.join(publicDir, name);
  fs.writeFileSync(filePath, svg);
  console.log(`✓ Generated ${name}`);
});

console.log('\n✓ All icons generated successfully!');
console.log('\nNote: These are SVG placeholders. For production, convert to PNG:');
console.log('  - Use an online tool: https://www.pwabuilder.com/imageGenerator');
console.log('  - Or install sharp: npm i -g sharp-cli && sharp-cli ...');
