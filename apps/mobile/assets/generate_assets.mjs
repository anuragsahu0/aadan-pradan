import fs from 'node:fs';
import path from 'node:path';

// Valid 1x1 dark slate PNG base64
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const buffer = Buffer.from(pngBase64, 'base64');

const assetsDir = path.resolve('apps/mobile/assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const files = ['icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png'];
for (const file of files) {
  fs.writeFileSync(path.join(assetsDir, file), buffer);
}

console.log('✅ Generated placeholder assets for Expo');
