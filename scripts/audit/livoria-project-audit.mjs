import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const webRoot = path.join(root, 'apps', 'web');

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(entry.name)) return [];
      return walk(full, predicate);
    }
    return predicate(full) ? [full] : [];
  });
}

function relative(fullPath) {
  return path.relative(root, fullPath).replaceAll(path.sep, '/');
}

function countLines(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
}

function unique(values) {
  return [...new Set(values)].sort();
}

const sourceFiles = walk(path.join(webRoot, 'src'), (file) => /\.(ts|tsx|css)$/.test(file));
const largeFiles = sourceFiles
  .map((file) => ({ file: relative(file), lines: countLines(file) }))
  .filter((item) => item.lines >= 500)
  .sort((a, b) => b.lines - a.lines);

const publicDir = path.join(webRoot, 'public');
const publicFiles = new Set(walk(publicDir).map(relative));
const manifest = JSON.parse(read('apps/web/public/manifest.json'));
const manifestIcons = [
  ...(manifest.icons ?? []).map((icon) => icon.src),
  ...(manifest.shortcuts ?? []).flatMap((shortcut) => (shortcut.icons ?? []).map((icon) => icon.src)),
];
const missingManifestAssets = unique(
  manifestIcons
    .map((src) => src.startsWith('/') ? `apps/web/public${src}` : `apps/web/public/${src}`)
    .filter((asset) => !publicFiles.has(asset)),
);

const residualPaths = [
  'dist',
  '.next-smoke.err.log',
  '.next-smoke.out.log',
  'tmp-vite-dashboard.log',
  'tsconfig.app.tsbuildinfo',
  'tsconfig.node.tsbuildinfo',
  'apps/web/public/assets',
  'apps/web/public/legacy',
  'apps/web/public/pwa-generated-sw.js',
  'apps/web/public/registerSW.js',
].filter(exists);

const deployment = {
  netlifyNextPublish: read('netlify.toml').includes('publish = "apps/web/.next"'),
  netlifyNoGeneratedPwaHeaders: !read('netlify.toml').includes('pwa-generated-sw.js') && !read('netlify.toml').includes('registerSW.js'),
  cloudflareProxyWorker: read('wrangler.jsonc').includes('cloudflare/netlify-proxy-worker.ts'),
  githubSyncWorkflow: exists('.github/workflows/trigger-livoria-sync.yml') && exists('.github/workflows/sync.yml'),
};

const paginationFiles = [
  'apps/web/src/features/anime/pages/AnimePage.tsx',
  'apps/web/src/features/donghua/pages/DonghuaPage.tsx',
  'apps/web/src/features/waifu/pages/WaifuPage.tsx',
  'apps/web/src/features/obat/pages/ObatPage.tsx',
];
const paginationAnchors = Object.fromEntries(
  paginationFiles.map((file) => [
    file,
    exists(file) && read(file).includes('useScrollToListStart') && read(file).includes('listStartRef'),
  ]),
);

const authPageSource = exists('apps/web/src/legacy-pages/Auth.tsx') ? read('apps/web/src/legacy-pages/Auth.tsx') : '';
const floatingActionSource = [
  'apps/web/src/components/ScrollDirectionButton.tsx',
  'apps/web/src/components/floating-action/FloatingActionControls.tsx',
  'apps/web/src/components/floating-action/floating-action-config.ts',
]
  .filter(exists)
  .map(read)
  .join('\n');
const regressionGuards = {
  googleOauthReturnReset:
    authPageSource.includes('oauthInFlightRef') &&
    authPageSource.includes('pageshow') &&
    authPageSource.includes('visibilitychange') &&
    authPageSource.includes('resetOauthLoading'),
  floatingActionDynamicDock:
    floatingActionSource.includes('shouldRaiseAddButton') &&
    floatingActionSource.includes('transition-[bottom]') &&
    floatingActionSource.includes('ADD_BUTTON_RAISED_BOTTOM'),
};

const routePages = ['page.tsx', 'auth/page.tsx', 'admin/page.tsx', 'anime/page.tsx', 'donghua/page.tsx', 'tagihan/page.tsx', 'waifu/page.tsx', 'obat/page.tsx', 'settings/page.tsx'];
const missingRoutePages = routePages
  .map((route) => `apps/web/app/${route}`)
  .filter((file) => !exists(file));

const highSeverity = [
  ...missingManifestAssets.map((file) => ({ check: 'missing-manifest-asset', file })),
  ...residualPaths.map((file) => ({ check: 'residual-root-or-public-artifact', file })),
  ...missingRoutePages.map((file) => ({ check: 'missing-next-route-page', file })),
  ...Object.entries(paginationAnchors)
    .filter(([, ok]) => !ok)
    .map(([file]) => ({ check: 'pagination-anchor-missing', file })),
  ...Object.entries(deployment)
    .filter(([, ok]) => !ok)
    .map(([check]) => ({ check: `deployment-${check}`, file: 'deployment-config' })),
  ...Object.entries(regressionGuards)
    .filter(([, ok]) => !ok)
    .map(([check]) => ({ check: `regression-guard-${check}`, file: check === 'googleOauthReturnReset' ? 'apps/web/src/legacy-pages/Auth.tsx' : 'apps/web/src/components/ScrollDirectionButton.tsx' })),
];

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    highSeverity: highSeverity.length,
    largeFilesOver500Lines: largeFiles.length,
    scannedWebSourceFiles: sourceFiles.length,
  },
  highSeverity,
  deployment,
  regressionGuards,
  paginationAnchors,
  residualPaths,
  missingManifestAssets,
  largeFilesTop20: largeFiles.slice(0, 20),
  recommendations: [
    'Keep visual parity work in active apps/web source files; do not depend on archive folders.',
    'Split files over 500 lines only when the split preserves feature behavior and debugging value is clear.',
    'Keep generated build output and Vite-era public artifacts outside apps/web/public.',
  ],
};

console.log(JSON.stringify(report, null, 2));

if (highSeverity.length > 0) {
  process.exitCode = 1;
}
