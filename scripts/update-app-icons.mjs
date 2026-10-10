import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const rootDir = process.cwd();
const option3Path = path.join(rootDir, 'public/icons/zeneva-options/option-3-receipt-check.svg');

if (!fs.existsSync(option3Path)) {
  console.error('Error: option-3-receipt-check.svg not found at', option3Path);
  process.exit(1);
}

const option3Svg = fs.readFileSync(option3Path, 'utf-8');

console.log('1. Updating public/icon.svg with option-3-receipt-check.svg...');
const publicIconSvgPath = path.join(rootDir, 'public/icon.svg');
fs.writeFileSync(publicIconSvgPath, option3Svg, 'utf-8');

console.log('2. Generating PNG icons using sharp...');
const svgBuffer = Buffer.from(option3Svg);

// Generate public/icon-pwa.png (512x512)
await sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(path.join(rootDir, 'public/icon-pwa.png'));
console.log(' - Generated public/icon-pwa.png (512x512)');

// Generate public/apple-icon.png (180x180)
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(path.join(rootDir, 'public/apple-icon.png'));
console.log(' - Generated public/apple-icon.png (180x180)');

// Generate favicon 32x32 and 48x48 PNGs
const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
const png48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();

// Generate standard ICO file from 32x32 PNG
function createIco(pngBuffers) {
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + entrySize * numImages;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(numImages, 4);

  const entries = [];
  for (const { buffer, width, height } of pngBuffers) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([
    header,
    ...entries,
    ...pngBuffers.map(p => p.buffer)
  ]);
}

const icoBuffer = createIco([
  { buffer: png32, width: 32, height: 32 },
  { buffer: png48, width: 48, height: 48 },
]);
fs.writeFileSync(path.join(rootDir, 'public/favicon.ico'), icoBuffer);
console.log(' - Generated public/favicon.ico');

// Update src-tauri/icons if directory exists
const tauriIconsDir = path.join(rootDir, 'src-tauri/icons');
if (fs.existsSync(tauriIconsDir)) {
  console.log('3. Updating desktop Tauri icons in src-tauri/icons...');
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(tauriIconsDir, '32x32.png'));
  await sharp(svgBuffer).resize(64, 64).png().toFile(path.join(tauriIconsDir, '64x64.png'));
  await sharp(svgBuffer).resize(128, 128).png().toFile(path.join(tauriIconsDir, '128x128.png'));
  await sharp(svgBuffer).resize(256, 256).png().toFile(path.join(tauriIconsDir, '128x128@2x.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(tauriIconsDir, 'icon.png'));
  fs.writeFileSync(path.join(tauriIconsDir, 'icon.ico'), icoBuffer);
  console.log(' - Updated src-tauri/icons (32x32, 64x64, 128x128, 128x128@2x, icon.png, icon.ico)');
}

console.log('4. Updating src/lib/config.ts logoUrl and logoIconUrl...');
const logoIconBase64 = Buffer.from(option3Svg).toString('base64');
const logoIconDataUri = `data:image/svg+xml;base64,${logoIconBase64}`;

const logoSvg = `<svg width="700" height="350" viewBox="0 0 350 175" xmlns="http://www.w3.org/2000/svg">
<style>text { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 500; }</style>
<defs>
<linearGradient id="sharedOrangeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
<stop offset="0%" style="stop-color:#ff9933;stop-opacity:1" />
<stop offset="100%" style="stop-color:#cc5200;stop-opacity:1" />
</linearGradient>
<linearGradient id="bgGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#FF7A18" />
<stop offset="100%" stop-color="#EA580C" />
</linearGradient>
</defs>
<g transform="translate(15, 50) scale(0.145)">
<rect width="512" height="512" rx="116" fill="url(#bgGrad3)" />
<g fill="#FFFFFF">
<path d="M148 124C148 110.745 158.745 100 172 100H340C353.255 100 364 110.745 364 124V384L337 366L310 384L283 366L256 384L229 366L202 384L175 366L148 384V124Z" />
<rect x="188" y="148" width="80" height="16" rx="8" fill="url(#bgGrad3)" />
<rect x="188" y="188" width="136" height="10" rx="5" fill="url(#bgGrad3)" />
<rect x="188" y="214" width="136" height="10" rx="5" fill="url(#bgGrad3)" />
<rect x="188" y="240" width="96" height="10" rx="5" fill="url(#bgGrad3)" />
<circle cx="196" cy="274" r="4" fill="url(#bgGrad3)" />
<circle cx="216" cy="274" r="4" fill="url(#bgGrad3)" />
<circle cx="236" cy="274" r="4" fill="url(#bgGrad3)" />
<circle cx="256" cy="274" r="4" fill="url(#bgGrad3)" />
<circle cx="276" cy="274" r="4" fill="url(#bgGrad3)" />
<circle cx="296" cy="274" r="4" fill="url(#bgGrad3)" />
<circle cx="316" cy="274" r="4" fill="url(#bgGrad3)" />
<rect x="188" y="296" width="70" height="28" rx="8" fill="url(#bgGrad3)" />
</g>
<circle cx="344" cy="148" r="44" fill="#FFFFFF" />
<circle cx="344" cy="148" r="38" fill="url(#bgGrad3)" />
<path d="M330 148L340 158L360 138" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
</g>
<text x="105" y="110" fill="url(#sharedOrangeGradient)" font-size="68" letter-spacing="-1">zeneva</text>
</svg>`;

const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;

const configContent = `export const AppConfig = {
  // Injected from package.json by next.config.ts. The literal that used to live
  // here drifted to 2.9.9 while the app shipped 3.1.4.
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0',
  logoUrl: '${logoDataUri}',
  logoIconUrl: '${logoIconDataUri}',
};
`;

fs.writeFileSync(path.join(rootDir, 'src/lib/config.ts'), configContent, 'utf-8');
console.log(' - Updated src/lib/config.ts with Option 3 Receipt Check logo & icon');

console.log('Icon update complete!');
