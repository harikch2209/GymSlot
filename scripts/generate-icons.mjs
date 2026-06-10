// Renders all app icons + splash from a single branded barbell mark.
// Reproducible: edit the constants below and re-run `node scripts/generate-icons.mjs`.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');
mkdirSync(assets, { recursive: true });

const EMERALD = '#10B981';
const EMERALD_DARK = '#0E9F6E';
const INK = '#0E1116';

// A clean, symmetric barbell glyph centered in a `size` viewBox.
// `color` is the bar/plates color; scaled to ~`scale` of the canvas.
function barbell(size, color, scale = 0.62) {
  const c = size / 2;
  const w = size * scale; // total barbell width
  const left = c - w / 2;
  const unit = w / 12; // 12 horizontal units across the mark
  const bar = unit * 1.0; // bar thickness
  const r = (x, y, ww, hh, rad) =>
    `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${ww.toFixed(1)}" height="${hh.toFixed(1)}" rx="${rad.toFixed(1)}" fill="${color}"/>`;
  const plate = (cx, h, ww) => r(cx, c - h / 2, ww, h, ww * 0.42);
  return [
    // central bar
    r(left + unit * 3, c - bar / 2, unit * 6, bar, bar / 2),
    // inner plates
    plate(left + unit * 2.2, w * 0.34, unit * 1.1),
    plate(left + unit * 8.7, w * 0.34, unit * 1.1),
    // outer plates (taller)
    plate(left + unit * 0.6, w * 0.46, unit * 1.25),
    plate(left + unit * 10.15, w * 0.46, unit * 1.25),
  ].join('');
}

function svgSolid(size, { bg, mark, rounded = 0 }) {
  const rad = rounded ? `rx="${rounded}"` : '';
  const bgEl = bg
    ? `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0" stop-color="${EMERALD}"/><stop offset="1" stop-color="${EMERALD_DARK}"/>
       </linearGradient></defs>
       <rect width="${size}" height="${size}" ${rad} fill="url(#g)"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bgEl}${barbell(size, mark, bg ? 0.6 : 0.42)}</svg>`;
}

async function png(svg, size, out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(assets, out));
  console.log('  ✓', out);
}

const targets = [
  // iOS / store icon: full-bleed emerald with white mark.
  { out: 'icon.png', size: 1024, svg: svgSolid(1024, { bg: true, mark: '#FFFFFF' }) },
  // Android adaptive foreground: transparent, white mark sized for the safe zone.
  { out: 'adaptive-icon.png', size: 1024, svg: svgSolid(1024, { bg: false, mark: '#FFFFFF' }) },
  // Splash mark: emerald on transparent (splash bg color set in app.json).
  { out: 'splash-icon.png', size: 1024, svg: svgSolid(1024, { bg: false, mark: EMERALD }) },
  // Web favicon.
  { out: 'favicon.png', size: 48, svg: svgSolid(48, { bg: true, mark: '#FFFFFF', rounded: 10 }) },
  // Monochrome notification icon (Android): white mark on transparent.
  { out: 'notification-icon.png', size: 96, svg: svgSolid(96, { bg: false, mark: '#FFFFFF' }) },
];

console.log('Generating GymSlot icons →', assets);
for (const t of targets) await png(t.svg, t.size, t.out);
console.log('Done.');
