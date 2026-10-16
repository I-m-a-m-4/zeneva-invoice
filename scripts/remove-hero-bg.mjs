import sharp from 'sharp';
import fs from 'fs';

async function main() {
  const inputPath = 'public/hero-invoices-devices.jpg';
  const outputPath = 'public/hero-invoices-devices.png';

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  console.log(`Processing ${width}x${height} with ${channels} channels...`);

  // visited[y * width + x]
  const isBackground = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let qHead = 0;
  let qTail = 0;

  // Determine if a pixel qualifies as dark background
  function isDark(x, y) {
    const idx = (y * width + x) * channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    // Background is dark floor/wall: max(r,g,b) < 45 or luminance < 38
    return Math.max(r, g, b) < 45;
  }

  // Push borders into BFS queue
  for (let x = 0; x < width; x++) {
    // Top border
    if (isDark(x, 0)) {
      isBackground[0 * width + x] = 1;
      queue[qTail++] = (0 << 16) | x;
    }
    // Bottom border
    if (isDark(x, height - 1)) {
      isBackground[(height - 1) * width + x] = 1;
      queue[qTail++] = ((height - 1) << 16) | x;
    }
  }

  for (let y = 0; y < height; y++) {
    // Left border
    if (!isBackground[y * width + 0] && isDark(0, y)) {
      isBackground[y * width + 0] = 1;
      queue[qTail++] = (y << 16) | 0;
    }
    // Right border
    if (!isBackground[y * width + (width - 1)] && isDark(width - 1, y)) {
      isBackground[y * width + (width - 1)] = 1;
      queue[qTail++] = (y << 16) | (width - 1);
    }
  }

  const dx = [0, 0, 1, -1];
  const dy = [1, -1, 0, 0];

  while (qHead < qTail) {
    const val = queue[qHead++];
    const cy = val >> 16;
    const cx = val & 0xffff;

    for (let i = 0; i < 4; i++) {
      const nx = cx + dx[i];
      const ny = cy + dy[i];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nPos = ny * width + nx;
        if (!isBackground[nPos] && isDark(nx, ny)) {
          isBackground[nPos] = 1;
          queue[qTail++] = (ny << 16) | nx;
        }
      }
    }
  }

  console.log(`Flooded ${qTail} background pixels.`);

  // Apply alpha with a soft edge
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x;
      const idx = pos * channels;
      if (isBackground[pos]) {
        data[idx + 3] = 0; // Transparent
      } else {
        // If bordering background, apply subtle antialiasing
        let bgNeighbors = 0;
        for (let i = 0; i < 4; i++) {
          const nx = x + dx[i];
          const ny = y + dy[i];
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (isBackground[ny * width + nx]) bgNeighbors++;
          }
        }
        if (bgNeighbors > 0) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const brightness = Math.max(r, g, b);
          if (brightness < 50) {
            data[idx + 3] = Math.round(255 * (1 - bgNeighbors * 0.22));
          }
        }
      }
    }
  }

  await sharp(data, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`Saved transparent image to ${outputPath}!`);
}

main().catch(console.error);
