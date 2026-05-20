import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');

const routeGates = [
  {
    mustHave: ['apps/web/app/auth/page.tsx', 'apps/web/components/LoginShell.tsx'],
    name: 'auth',
    risk: 'medium',
    status: 'route-ready',
  },
  {
    mustHave: ['apps/web/app/admin/page.tsx'],
    name: 'admin',
    risk: 'high',
    status: 'route-ready',
  },
  {
    mustHave: ['apps/web/app/dashboard/page.tsx', 'apps/web/features/dashboard/dashboard.repository.ts'],
    name: 'dashboard',
    risk: 'medium',
    status: 'production-ready',
  },
  {
    mustHave: [
      'apps/web/app/obat/page.tsx',
      'apps/web/app/obat/[pageParam]/page.tsx',
      'apps/web/features/obat/obat.actions.ts',
    ],
    name: 'obat',
    risk: 'low',
    status: 'crud-ready',
  },
  {
    mustHave: [
      'apps/web/app/waifu/page.tsx',
      'apps/web/app/waifu/[pageParam]/page.tsx',
      'apps/web/features/waifu/waifu.actions.ts',
    ],
    name: 'waifu',
    risk: 'medium',
    status: 'crud-ready',
  },
  {
    mustHave: ['apps/web/app/settings/page.tsx', 'apps/web/features/settings/settings.repository.ts'],
    name: 'settings',
    risk: 'medium',
    status: 'shell-ready',
  },
  {
    mustHave: [
      'apps/web/app/anime/page.tsx',
      'apps/web/app/anime/[pageParam]/page.tsx',
      'apps/web/features/media/media.repository.ts',
      'apps/web/features/media/media.actions.ts',
    ],
    name: 'anime',
    risk: 'high',
    status: 'mutation-ready',
  },
  {
    mustHave: [
      'apps/web/app/donghua/page.tsx',
      'apps/web/app/donghua/[pageParam]/page.tsx',
      'apps/web/features/media/media.repository.ts',
      'apps/web/features/media/media.actions.ts',
    ],
    name: 'donghua',
    risk: 'high',
    status: 'mutation-ready',
  },
  {
    mustHave: [
      'apps/web/app/tagihan/page.tsx',
      'apps/web/features/tagihan/tagihan.repository.ts',
      'apps/web/features/tagihan/tagihan.actions.ts',
    ],
    name: 'tagihan',
    risk: 'high',
    status: 'quick-pay-ready',
  },
];

const productionFiles = [
  'netlify.toml',
  'wrangler.jsonc',
  'package.json',
  'apps/web/next.config.ts',
];

function exists(file) {
  return existsSync(path.join(root, file));
}

function read(file) {
  const abs = path.join(root, file);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : '';
}

function walk(dir) {
  const abs = path.join(root, dir);
  if (!existsSync(abs)) return [];

  const out = [];
  for (const entry of readdirSync(abs)) {
    if (['node_modules', '.next', 'dist', 'coverage', 'public'].includes(entry)) continue;
    const full = path.join(abs, entry);
    const rel = path.relative(root, full).replaceAll(path.sep, '/');
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(rel));
    else if (/\.(ts|tsx|js|mjs)$/.test(entry)) out.push(rel);
  }
  return out;
}

function countLines(file) {
  return read(file).split(/\r?\n/).length;
}

const routeStatus = routeGates.map((gate) => {
  const ready = gate.mustHave.every(exists);
  return {
    name: gate.name,
    ready,
    risk: gate.risk,
    status: ready ? gate.status : 'not-ready',
    missing: gate.mustHave.filter((file) => !exists(file)),
  };
});

const highRiskFiles = walk('apps/web')
  .map((file) => ({ file, lines: countLines(file) }))
  .filter((item) => item.lines >= 700)
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 20);

const clientServerImportViolations = walk('apps/web')
  .filter((file) => {
    const text = read(file);
    const startsAsClient = text.trimStart().startsWith("'use client'") || text.trimStart().startsWith('"use client"');
    if (!startsAsClient) return false;

    return text.split(/\r?\n/).some((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('import ') || trimmed.startsWith('import type ')) return false;
      return /from ['"].*\.repository['"]|from ['"].*\/server['"]/.test(trimmed);
    });
  })
  .map((file) => ({ file }));

const netlifyToml = read('netlify.toml');
const wranglerConfig = read('wrangler.jsonc');
const nextConfig = read('apps/web/next.config.ts');
const routeParityManifest = JSON.parse(read('docs/architecture/next-route-parity.json'));
const productionStillVite = netlifyToml.includes('apps/web/dist') ||
  netlifyToml.includes('vite build') ||
  netlifyToml.includes('prepare:next-legacy');
const productionNextEnabled = netlifyToml.includes('@livoria/web build') &&
  netlifyToml.includes('apps/web/.next') &&
  !productionStillVite;
const cloudflareUsesNextProxy = wranglerConfig.includes('netlify-proxy-worker.ts') &&
  !wranglerConfig.includes('apps/web/dist');
const legacyParityBridgeActive = nextConfig.includes('/legacy/index.html');
const fullNativeProduction = productionNextEnabled && !legacyParityBridgeActive;
const routeParityStatus = routeParityManifest.routes.map((route) => {
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
    nativeParityComplete: missingCapabilities.length === 0 && exists(route.nativeEntrypoint),
    missingCapabilities,
  };
});
const fullNativeNextReady = routeParityStatus.every((route) => (
  route.productionMode === 'native-next' &&
  route.nativeParityComplete
));
const totalReady = routeStatus.every((route) => route.ready) &&
  highRiskFiles.length === 0 &&
  clientServerImportViolations.length === 0 &&
  productionNextEnabled &&
  cloudflareUsesNextProxy &&
  fullNativeProduction &&
  fullNativeNextReady;

const report = {
  generatedAt: new Date().toISOString(),
  productionStillVite,
  productionNextEnabled,
  cloudflareUsesNextProxy,
  legacyParityBridgeActive,
  fullNativeProduction,
  fullNativeNextReady,
  productionFiles,
  routeStatus,
  routeParityStatus,
  highRiskFiles,
  clientServerImportViolations,
  totalNextMigrationReady: totalReady,
  decision: totalReady
    ? 'Full native Next production is enabled. Legacy parity bridge is not active.'
    : 'Do not switch production to full native Next yet; route, risk, Netlify, Cloudflare, or full native gates are still blocking.',
};

console.log(JSON.stringify(report, null, 2));

if (strict && !totalReady) {
  process.exitCode = 1;
}
