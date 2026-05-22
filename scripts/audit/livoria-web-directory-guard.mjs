import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const reservedRootDirs = [
  {
    path: 'apps/web/components',
    reason: 'Use apps/web/src/components for app UI or apps/web/src/next for Next-only shell components.',
  },
  {
    path: 'apps/web/features',
    reason: 'Use apps/web/src/features for active product features or apps/web/src/next/features for Next preview/server shells.',
  },
  {
    path: 'apps/web/lib',
    reason: 'Use apps/web/src/lib for web compatibility utilities or apps/web/src/next/lib for Next-specific server/browser helpers.',
  },
  {
    path: 'apps/web/src/legacy-pages',
    reason: 'Use apps/web/src/route-pages for active client-router page modules.',
  },
];

const requiredDirs = [
  'apps/web/app',
  'apps/web/src',
  'apps/web/src/next',
  'apps/web/src/next/features',
  'apps/web/src/next/lib',
  'apps/web/src/features',
  'apps/web/src/route-pages',
  'apps/web/src/shared',
  'packages/core/src',
  'packages/ui-tokens/src',
];

function listFiles(dir) {
  const abs = path.join(root, dir);
  if (!existsSync(abs)) return [];

  const out = [];
  for (const entry of readdirSync(abs)) {
    const full = path.join(abs, entry);
    const rel = path.relative(root, full).replaceAll(path.sep, '/');
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...listFiles(rel));
    else out.push(rel);
  }
  return out;
}

const reservedViolations = reservedRootDirs
  .map((item) => ({ ...item, files: listFiles(item.path) }))
  .filter((item) => item.files.length > 0);

const missingRequiredDirs = requiredDirs.filter((dir) => !existsSync(path.join(root, dir)));

const result = {
  generatedAt: new Date().toISOString(),
  reservedViolations,
  missingRequiredDirs,
  ok: reservedViolations.length === 0 && missingRequiredDirs.length === 0,
};

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}
