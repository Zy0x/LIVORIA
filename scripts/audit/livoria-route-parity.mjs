import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strictFullNative = process.argv.includes('--strict-full-native');
const markdownArgIndex = process.argv.indexOf('--markdown');
const manifestPath = 'docs/architecture/next-route-parity.json';

function read(file) {
  return readFileSync(path.join(root, file), 'utf8');
}

function exists(file) {
  return existsSync(path.join(root, file));
}

function normalizeSource(source) {
  return source.replace(/\/:path\*$/, '');
}

function sourceIsRewritten(nextConfig, source) {
  return nextConfig.includes(`source: '${source}'`) ||
    nextConfig.includes(`source: "${source}"`) ||
    nextConfig.includes(`source:${source}`);
}

const manifest = JSON.parse(read(manifestPath));
const nextConfig = read('apps/web/next.config.ts');

const routes = manifest.routes.map((route) => {
  const missingCapabilities = route.capabilities
    .filter((capability) => capability.status !== 'done')
    .map((capability) => capability.id);
  const legacyRewriteActive = route.legacySources.some((source) => sourceIsRewritten(nextConfig, source));
  const nativeEntrypointExists = exists(route.nativeEntrypoint);
  const nativeParityComplete = nativeEntrypointExists && missingCapabilities.length === 0;

  return {
    route: route.route,
    risk: route.risk,
    nativeEntrypoint: route.nativeEntrypoint,
    nativeEntrypointExists,
    legacyRewriteActive,
    productionMode: legacyRewriteActive ? 'legacy-bridge' : 'native-next',
    nativeParityComplete,
    missingCapabilities,
    nativeSmokeEnv: `LIVORIA_NEXT_NATIVE_ROUTES=${normalizeSource(route.legacySources[0] ?? route.route)}`,
  };
});

const fullNativeReady = routes.every((route) => (
  route.nativeEntrypointExists &&
  route.nativeParityComplete &&
  !route.legacyRewriteActive
));
const bridgeProtectedRoutes = routes
  .filter((route) => route.legacyRewriteActive)
  .map((route) => route.route);
const unsafeNativeRoutes = routes
  .filter((route) => !route.legacyRewriteActive && !route.nativeParityComplete)
  .map((route) => route.route);

const report = {
  generatedAt: new Date().toISOString(),
  manifest: manifestPath,
  fullNativeReady,
  bridgeProtectedRoutes,
  unsafeNativeRoutes,
  routes,
  decision: fullNativeReady
    ? 'All routes are native Next and parity-complete. Legacy bridge can be removed.'
    : 'Do not remove the legacy bridge globally yet. Migrate routes only after missing capabilities are closed and native smoke passes.',
};

function toMarkdown(data) {
  const lines = [
    '# LIVORIA Next Route Parity',
    '',
    `Generated: ${data.generatedAt}`,
    '',
    `Full native ready: ${data.fullNativeReady ? 'Ya' : 'Belum'}`,
    '',
    '## Route Status',
    '',
    '| Route | Mode produksi | Risiko | Native entry | Missing capability | Smoke env |',
    '| --- | --- | --- | --- | --- | --- |',
    ...data.routes.map((route) => [
      route.route,
      route.productionMode,
      route.risk,
      route.nativeEntrypointExists ? 'Ada' : 'Hilang',
      route.missingCapabilities.length > 0 ? route.missingCapabilities.join(', ') : '-',
      route.nativeSmokeEnv,
    ].join(' | ')).map((row) => `| ${row} |`),
    '',
    '## Keputusan',
    '',
    data.decision,
  ];
  return `${lines.join('\n')}\n`;
}

if (markdownArgIndex !== -1) {
  const target = process.argv[markdownArgIndex + 1];
  if (!target) throw new Error('--markdown requires an output path');
  writeFileSync(path.join(root, target), toMarkdown(report));
}

console.log(JSON.stringify(report, null, 2));

if (strictFullNative && !fullNativeReady) {
  process.exitCode = 1;
}
