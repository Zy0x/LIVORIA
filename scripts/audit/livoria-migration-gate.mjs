import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');

const routeGates = [
  {
    mustHave: ['apps/web-next/app/auth/page.tsx', 'apps/web-next/components/LoginShell.tsx'],
    name: 'auth',
    risk: 'medium',
    status: 'route-ready',
  },
  {
    mustHave: ['apps/web-next/app/admin/page.tsx'],
    name: 'admin',
    risk: 'high',
    status: 'route-ready',
  },
  {
    mustHave: ['apps/web-next/app/dashboard/page.tsx', 'apps/web-next/features/dashboard/dashboard.repository.ts'],
    name: 'dashboard',
    risk: 'medium',
    status: 'production-ready',
  },
  {
    mustHave: [
      'apps/web-next/app/obat/page.tsx',
      'apps/web-next/app/obat/[pageParam]/page.tsx',
      'apps/web-next/features/obat/obat.actions.ts',
    ],
    name: 'obat',
    risk: 'low',
    status: 'crud-ready',
  },
  {
    mustHave: [
      'apps/web-next/app/waifu/page.tsx',
      'apps/web-next/app/waifu/[pageParam]/page.tsx',
      'apps/web-next/features/waifu/waifu.actions.ts',
    ],
    name: 'waifu',
    risk: 'medium',
    status: 'crud-ready',
  },
  {
    mustHave: ['apps/web-next/app/settings/page.tsx', 'apps/web-next/features/settings/settings.repository.ts'],
    name: 'settings',
    risk: 'medium',
    status: 'shell-ready',
  },
  {
    mustHave: [
      'apps/web-next/app/anime/page.tsx',
      'apps/web-next/app/anime/[pageParam]/page.tsx',
      'apps/web-next/features/media/media.repository.ts',
      'apps/web-next/features/media/media.actions.ts',
    ],
    name: 'anime',
    risk: 'high',
    status: 'mutation-ready',
  },
  {
    mustHave: [
      'apps/web-next/app/donghua/page.tsx',
      'apps/web-next/app/donghua/[pageParam]/page.tsx',
      'apps/web-next/features/media/media.repository.ts',
      'apps/web-next/features/media/media.actions.ts',
    ],
    name: 'donghua',
    risk: 'high',
    status: 'mutation-ready',
  },
  {
    mustHave: [
      'apps/web-next/app/tagihan/page.tsx',
      'apps/web-next/features/tagihan/tagihan.repository.ts',
      'apps/web-next/features/tagihan/tagihan.actions.ts',
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
  'apps/web/vite.config.ts',
  'apps/web-next/next.config.ts',
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
    if (['node_modules', '.next', 'dist', 'coverage'].includes(entry)) continue;
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

const highRiskFiles = walk('apps/web/src')
  .map((file) => ({ file, lines: countLines(file) }))
  .filter((item) => item.lines >= 700)
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 20);

const clientServerImportViolations = walk('apps/web-next')
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
const nextConfig = read('apps/web-next/next.config.ts');
const productionStillVite = netlifyToml.includes('apps/web/dist') && !netlifyToml.includes('apps/web-next');
const productionNextEnabled = netlifyToml.includes('@livoria/web-next build') &&
  netlifyToml.includes('apps/web-next/.next') &&
  !productionStillVite;
const cloudflareUsesNextProxy = wranglerConfig.includes('netlify-proxy-worker.ts') &&
  !wranglerConfig.includes('apps/web/dist');
const legacyParityBridgeActive = netlifyToml.includes('prepare:next-legacy') &&
  nextConfig.includes('/legacy/index.html');
const totalReady = routeStatus.every((route) => route.ready) &&
  highRiskFiles.length === 0 &&
  clientServerImportViolations.length === 0 &&
  productionNextEnabled &&
  cloudflareUsesNextProxy &&
  legacyParityBridgeActive;

const report = {
  generatedAt: new Date().toISOString(),
  productionStillVite,
  productionNextEnabled,
  cloudflareUsesNextProxy,
  legacyParityBridgeActive,
  productionFiles,
  routeStatus,
  highRiskFiles,
  clientServerImportViolations,
  totalNextMigrationReady: totalReady,
  decision: totalReady
    ? 'Next production switch is enabled with a Vite legacy parity bridge; run live smoke tests after deploy completes.'
    : 'Do not switch production to Next yet; route, risk, Netlify, Cloudflare, or legacy parity bridge gates are still blocking.',
};

console.log(JSON.stringify(report, null, 2));

if (strict && !totalReady) {
  process.exitCode = 1;
}
