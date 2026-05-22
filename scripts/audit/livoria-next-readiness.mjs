import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const generatedAt = new Date().toISOString();

const sourceRoots = [
  'apps/web',
  'packages',
  'supabase/functions',
  '.github/workflows',
];
const ignored = new Set(['node_modules', '.next', 'dist', 'coverage']);
const includeExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.yml', '.yaml', '.md']);

function isGeneratedPublicAsset(rel) {
  const normalized = rel.replaceAll(path.sep, '/');
  return normalized.startsWith('apps/web/public/legacy/') ||
    normalized.startsWith('apps/web/public/assets/') ||
    normalized.startsWith('apps/web/public/icons/') ||
    normalized === 'apps/web/public/pwa-generated-sw.js' ||
    normalized === 'apps/web/public/registerSW.js' ||
    normalized === 'apps/web/public/sw.js' ||
    normalized.startsWith('apps/web/public/workbox-');
}

function walk(dir) {
  const abs = path.join(root, dir);
  let entries = [];
  try {
    entries = readdirSync(abs);
  } catch {
    return [];
  }

  const out = [];
  for (const entry of entries) {
    const full = path.join(abs, entry);
    const rel = path.relative(root, full);
    if (isGeneratedPublicAsset(rel)) continue;
    if (rel.split(path.sep).some((part) => ignored.has(part))) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(rel));
    else if (includeExt.has(path.extname(full))) out.push(rel);
  }
  return out;
}

function read(file) {
  return readFileSync(path.join(root, file), 'utf8');
}

function lineCount(text) {
  return text.split(/\r?\n/).length;
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

const files = sourceRoots.flatMap(walk);
const fileStats = files.map((file) => {
  const text = read(file);
  return {
    file: file.replaceAll(path.sep, '/'),
    lines: lineCount(text),
    browserApiRefs: countMatches(text, /\b(window|document|localStorage|sessionStorage|navigator)\b/g),
    directSupabaseRefs: countMatches(text, /@\/lib\/supabase|@\/integrations\/supabase|supabase\.(from|rpc|functions|storage)/g),
    heavyLibRefs: countMatches(text, /from ['"](xlsx|jspdf|jspdf-autotable|recharts|gsap)['"]|import\(['"](xlsx|jspdf|jspdf-autotable|recharts|gsap)['"]\)/g),
  };
});

const highRiskFiles = fileStats
  .filter((item) => item.lines >= 350 || item.browserApiRefs >= 10 || item.directSupabaseRefs >= 3 || item.heavyLibRefs >= 2)
  .sort((a, b) => (b.lines + b.browserApiRefs * 8 + b.directSupabaseRefs * 20) - (a.lines + a.browserApiRefs * 8 + a.directSupabaseRefs * 20));

const webNextFiles = fileStats.filter((item) => item.file.startsWith('apps/web/'));
const rootPackage = read('package.json');
const netlifyToml = read('netlify.toml');
const nextConfig = read('apps/web/next.config.ts');
const routeParityManifest = JSON.parse(read('docs/architecture/next-route-parity.json'));
const productionDeployment = {
  nextBuildEnabled: rootPackage.includes('"build": "corepack pnpm --filter @livoria/web build"') &&
    netlifyToml.includes('@livoria/web build'),
  legacyParityBridgeActive: nextConfig.includes('/legacy/index.html'),
  viteFallbackBuildIncluded: rootPackage.includes('--base=/legacy/') ||
    rootPackage.includes('sync-vite-legacy-to-next.mjs') ||
    netlifyToml.includes('vite build') ||
    netlifyToml.includes('apps/web/dist'),
};
const hasSessionRefreshBoundary = webNextFiles.some((item) => (
  item.file === 'apps/web/middleware.ts' ||
  item.file === 'apps/web/proxy.ts'
));
const nextReadiness = {
  hasNextApp: webNextFiles.some((item) => item.file === 'apps/web/app/layout.tsx'),
  hasSupabaseSsrSkeleton: webNextFiles.some((item) => item.file === 'apps/web/src/next/lib/supabase/server.ts'),
  hasMiddleware: hasSessionRefreshBoundary,
  hasProxy: webNextFiles.some((item) => item.file === 'apps/web/proxy.ts'),
  hasSessionRefreshBoundary,
  hasObatRoute: webNextFiles.some((item) => item.file.startsWith('apps/web/app/obat/')),
  hasWaifuRoute: webNextFiles.some((item) => item.file.startsWith('apps/web/app/waifu/')),
  hasSettingsRoute: webNextFiles.some((item) => item.file.startsWith('apps/web/app/settings/')),
  hasAnimeRoute: webNextFiles.some((item) => item.file.startsWith('apps/web/app/anime/')),
  hasDonghuaRoute: webNextFiles.some((item) => item.file.startsWith('apps/web/app/donghua/')),
  hasTagihanRoute: webNextFiles.some((item) => item.file.startsWith('apps/web/app/tagihan/')),
  hasDashboardRoute: webNextFiles.some((item) => item.file.startsWith('apps/web/app/dashboard/')),
};

const workflowFiles = fileStats.filter((item) => item.file.startsWith('.github/workflows/'));
const syncWorkflow = workflowFiles.find((item) => item.file.endsWith('sync.yml'));
const syncText = syncWorkflow ? read(syncWorkflow.file) : '';
const workflowSafety = {
  hasAllowedSourceRepoGuard: syncText.includes('ALLOWED_SOURCE_REPOSITORIES'),
  hasLargeSyncGuard: syncText.includes('ALLOW_LARGE_SYNC'),
  hasMassDeleteGuard: syncText.includes('ALLOW_MASS_DELETE'),
  hasDryRunDefault: syncText.includes('DRY_RUN="true"') || syncText.includes('default: "true"'),
};

const routeMigrationOrder = [
  { route: '/', risk: 'low', reason: 'Production memakai Dashboard native Next dengan summary, recent tagihan/media, dan entry quick pay.' },
  { route: '/obat', risk: 'low', reason: 'Production now uses the native Next route with CRUD, search/filter/sort, pagination anchor, detail dialog, and JSON import/export.' },
  { route: '/waifu', risk: 'medium', reason: 'Production now uses the native Next route with CRUD, image upload, source dropdown, tier/source/search filter, and JSON import/export.' },
  { route: '/settings', risk: 'medium', reason: 'Production memakai settings native Next untuk profil, theme, backup, Telegram, dan PWA.' },
  { route: '/anime', risk: 'high', reason: 'Production memakai media native Next dengan filter, pagination anchor, detail, watchlist, import/export, dan title switch.' },
  { route: '/donghua', risk: 'high', reason: 'Production memakai media native Next dengan label Donghua, filter, detail, watchlist, import/export, dan title switch.' },
  { route: '/tagihan', risk: 'high', reason: 'Production memakai Tagihan native Next dengan CRUD, quick pay, history, struk, report, kalkulator, dan export.' },
];
const routeParity = routeParityManifest.routes.map((route) => {
  const legacyRewriteActive = route.legacySources.some((source) => (
    nextConfig.includes(`source: '${source}'`) ||
    nextConfig.includes(`source: "${source}"`)
  ));
  const missingCapabilities = route.capabilities
    .filter((capability) => capability.status !== 'done')
    .map((capability) => capability.id);

  return {
    route: route.route,
    risk: route.risk,
    productionMode: legacyRewriteActive ? 'legacy-bridge' : 'native-next',
    nativeParityComplete: missingCapabilities.length === 0,
    missingCapabilities,
  };
});

const report = {
  generatedAt,
  totals: {
    scannedFiles: files.length,
    highRiskFiles: highRiskFiles.length,
    webNextFiles: webNextFiles.length,
  },
  nextReadiness,
  productionDeployment,
  workflowSafety,
  routeParity,
  routeMigrationOrder,
  highRiskFiles: highRiskFiles.slice(0, 40),
};

function toMarkdown(data) {
  const bool = (value) => (value ? 'Ya' : 'Tidak');
  const lines = [
    '# LIVORIA Next.js Migration Readiness Audit',
    '',
    `Generated: ${data.generatedAt}`,
    '',
    '## Ringkasan',
    '',
    `- File discan: ${data.totals.scannedFiles}`,
    `- File rawan prioritas: ${data.totals.highRiskFiles}`,
    `- File Next production: ${data.totals.webNextFiles}`,
    '',
    '## Next Production Gate',
    '',
    `- Next app shell: ${bool(data.nextReadiness.hasNextApp)}`,
    `- Supabase SSR skeleton: ${bool(data.nextReadiness.hasSupabaseSsrSkeleton)}`,
    `- Request session refresh boundary: ${bool(data.nextReadiness.hasSessionRefreshBoundary)}`,
    `- Next 16 proxy: ${bool(data.nextReadiness.hasProxy)}`,
    `- Dashboard route: ${bool(data.nextReadiness.hasDashboardRoute)}`,
    `- Tagihan route: ${bool(data.nextReadiness.hasTagihanRoute)}`,
    `- Anime route: ${bool(data.nextReadiness.hasAnimeRoute)}`,
    `- Donghua route: ${bool(data.nextReadiness.hasDonghuaRoute)}`,
    `- Obat route: ${bool(data.nextReadiness.hasObatRoute)}`,
    `- Waifu route: ${bool(data.nextReadiness.hasWaifuRoute)}`,
    `- Pengaturan route: ${bool(data.nextReadiness.hasSettingsRoute)}`,
    '',
    '## Production Deployment Gate',
    '',
    `- Next build production: ${bool(data.productionDeployment.nextBuildEnabled)}`,
    `- Legacy parity bridge: ${bool(data.productionDeployment.legacyParityBridgeActive)}`,
    `- Vite fallback build included: ${bool(data.productionDeployment.viteFallbackBuildIncluded)}`,
    `- Full native route parity: ${bool(data.routeParity.every((route) => route.productionMode === 'native-next' && route.nativeParityComplete))}`,
    '',
    '## Workflow Safety Gate',
    '',
    `- Allowed source repo guard: ${bool(data.workflowSafety.hasAllowedSourceRepoGuard)}`,
    `- Large sync guard: ${bool(data.workflowSafety.hasLargeSyncGuard)}`,
    `- Mass delete guard: ${bool(data.workflowSafety.hasMassDeleteGuard)}`,
    `- Dry-run default: ${bool(data.workflowSafety.hasDryRunDefault)}`,
    '',
    '## Urutan Migrasi Route',
    '',
    '| Route | Risiko | Alasan |',
    '| --- | --- | --- |',
    ...data.routeMigrationOrder.map((item) => `| ${item.route} | ${item.risk} | ${item.reason} |`),
    '',
    '## Full Native Route Parity',
    '',
    '| Route | Mode produksi | Risiko | Missing capability |',
    '| --- | --- | --- | --- |',
    ...data.routeParity.map((item) => `| ${item.route} | ${item.productionMode} | ${item.risk} | ${item.missingCapabilities.length > 0 ? item.missingCapabilities.join(', ') : '-'} |`),
    '',
    '## File Rawan Prioritas',
    '',
    '| File | Lines | Browser API | Supabase refs | Heavy libs |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...data.highRiskFiles.map((item) => `| ${item.file} | ${item.lines} | ${item.browserApiRefs} | ${item.directSupabaseRefs} | ${item.heavyLibRefs} |`),
    '',
    '## Rekomendasi Pecah File',
    '',
    '- `BulkImportDialog`: pisah parser, review model, duplicate handling, AI enrichment queue, dan insert adapter.',
    '- `AnimePage`/`DonghuaPage`: ekstrak orchestrator state menjadi route shell dan pindahkan dialog state ke hook feature.',
    '- `AnimeCard`/`DonghuaCard`: pisah action menu, cover media, progress/status, dan hover fan-cover behavior.',
    '- `TagihanForm`: pisah payment-method storage, cycle preview, validation adapter, dan schedule preview.',
    '- `Dashboard`: pindahkan semua formatter/derived finance summary ke repository/core sebelum route Next.',
  ];
  return `${lines.join('\n')}\n`;
}

const markdownArgIndex = process.argv.indexOf('--markdown');
if (markdownArgIndex !== -1) {
  const target = process.argv[markdownArgIndex + 1];
  if (!target) {
    throw new Error('--markdown requires an output path');
  }
  writeFileSync(path.join(root, target), toMarkdown(report));
}

console.log(JSON.stringify(report, null, 2));
