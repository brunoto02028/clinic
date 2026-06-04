/**
 * Generate PWA / App icons from SVG template.
 * Run: node scripts/generate-icons.js
 * 
 * This creates placeholder PNG icons using Canvas.
 * For production, replace with actual BPR logo assets.
 */

const fs = require("fs");
const { createCanvas } = (() => {
  try { return require("canvas"); } catch { return { createCanvas: null }; }
})();

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

function generateIcon(size) {
  if (!createCanvas) {
    // Fallback: generate a simple SVG and save it
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#0a0f1e"/>
      <text x="50%" y="52%" text-anchor="middle" dominant-baseline="central" 
        font-family="Arial, sans-serif" font-weight="bold" font-size="${size * 0.32}" 
        fill="#7c9a7e" letter-spacing="${size * 0.02}">BPR</text>
    </svg>`;
    fs.writeFileSync(`public/icons/icon-${size}x${size}.svg`, svg);
    console.log(`  Created SVG: icon-${size}x${size}.svg`);
    return;
  }

  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#0a0f1e";
  const r = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Text "BPR"
  ctx.fillStyle = "#7c9a7e";
  ctx.font = `bold ${size * 0.32}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BPR", size / 2, size / 2);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(`public/icons/icon-${size}x${size}.png`, buffer);
  console.log(`  Created PNG: icon-${size}x${size}.png`);
}

console.log("Generating app icons...");
for (const s of sizes) {
  generateIcon(s);
}
console.log("Done!");
