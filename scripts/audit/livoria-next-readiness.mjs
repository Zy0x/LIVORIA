import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const generatedAt = new Date().toISOString();

const sourceRoots = [
  'apps/web/src',
  'apps/web-next',
  'packages',
  'supabase/functions',
  '.github/workflows',
];
const ignored = new Set(['node_modules', '.next', 'dist', 'coverage']);
const includeExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.yml', '.yaml', '.md']);

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

const webNextFiles = fileStats.filter((item) => item.file.startsWith('apps/web-next/'));
const hasSessionRefreshBoundary = webNextFiles.some((item) => (
  item.file === 'apps/web-next/middleware.ts' ||
  item.file === 'apps/web-next/proxy.ts'
));
const nextReadiness = {
  hasNextApp: webNextFiles.some((item) => item.file === 'apps/web-next/app/layout.tsx'),
  hasSupabaseSsrSkeleton: webNextFiles.some((item) => item.file === 'apps/web-next/lib/supabase/server.ts'),
  hasMiddleware: hasSessionRefreshBoundary,
  hasProxy: webNextFiles.some((item) => item.file === 'apps/web-next/proxy.ts'),
  hasSessionRefreshBoundary,
  hasObatRoute: webNextFiles.some((item) => item.file.startsWith('apps/web-next/app/obat/')),
  hasDashboardRoute: webNextFiles.some((item) => item.file.startsWith('apps/web-next/app/dashboard/')),
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
  { route: '/dashboard', risk: 'medium', reason: 'Read-only summary can move first after auth middleware and repository parity.' },
  { route: '/obat', risk: 'low', reason: 'Small CRUD feature already has repository, mapper, hooks, and pagination boundary.' },
  { route: '/waifu', risk: 'medium', reason: 'Needs storage upload boundary and source dropdown parity.' },
  { route: '/settings', risk: 'medium', reason: 'Split Telegram, backup, PWA, and profile panels before moving.' },
  { route: '/anime', risk: 'high', reason: 'Large page/card, AI title enrichment, bulk import, watchlist, pagination.' },
  { route: '/donghua', risk: 'high', reason: 'Follows Anime but still has duplicate large page/card implementation.' },
  { route: '/tagihan', risk: 'high', reason: 'Financial/payment flows require server action contracts and regression tests first.' },
];

const report = {
  generatedAt,
  totals: {
    scannedFiles: files.length,
    highRiskFiles: highRiskFiles.length,
    webNextFiles: webNextFiles.length,
  },
  nextReadiness,
  workflowSafety,
  routeMigrationOrder,
  highRiskFiles: highRiskFiles.slice(0, 40),
};

function toMarkdown(data) {
  const bool = (value) => (value ? 'Ya' : 'Belum');
  const lines = [
    '# LIVORIA Next.js Migration Readiness Audit',
    '',
    `Generated: ${data.generatedAt}`,
    '',
    '## Ringkasan',
    '',
    `- File discan: ${data.totals.scannedFiles}`,
    `- File rawan prioritas: ${data.totals.highRiskFiles}`,
    `- File Next preview: ${data.totals.webNextFiles}`,
    '',
    '## Next Preview Gate',
    '',
    `- Next app shell: ${bool(data.nextReadiness.hasNextApp)}`,
    `- Supabase SSR skeleton: ${bool(data.nextReadiness.hasSupabaseSsrSkeleton)}`,
    `- Request session refresh boundary: ${bool(data.nextReadiness.hasSessionRefreshBoundary)}`,
    `- Next 16 proxy: ${bool(data.nextReadiness.hasProxy)}`,
    `- Dashboard route: ${bool(data.nextReadiness.hasDashboardRoute)}`,
    `- Obat route: ${bool(data.nextReadiness.hasObatRoute)}`,
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
    '',
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
