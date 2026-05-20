import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const viteDist = path.join(root, 'apps/web/dist');
const nextPublic = path.join(root, 'apps/web-next/public');
const legacyPublic = path.join(nextPublic, 'legacy');

if (!existsSync(viteDist)) {
  throw new Error('apps/web/dist is missing. Run the Vite legacy build before syncing.');
}

mkdirSync(nextPublic, { recursive: true });
rmSync(legacyPublic, { recursive: true, force: true });
mkdirSync(legacyPublic, { recursive: true });

cpSync(viteDist, legacyPublic, { recursive: true });

const rootAssets = [
  'assets',
  'icons',
  'manifest.json',
  'pwa-generated-sw.js',
  'registerSW.js',
  'sw.js',
  'workbox-4443ceab.js',
];

for (const asset of rootAssets) {
  const source = path.join(viteDist, asset);
  if (!existsSync(source)) continue;

  const target = path.join(nextPublic, asset);
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
}

console.log(`Synced Vite legacy app to ${path.relative(root, legacyPublic).replaceAll(path.sep, '/')}`);
