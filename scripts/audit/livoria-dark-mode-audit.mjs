import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2).filter((arg) => arg !== '--');
const strict = args.includes('--strict');
const full = args.includes('--full');
const maxFindings = Number(process.argv.find((arg) => arg.startsWith('--max='))?.split('=')[1] ?? 80);

const sourceRoots = ['apps/web/app', 'apps/web/src'];
const includeExtensions = new Set(['.css', '.ts', '.tsx']);
const ignoreParts = new Set(['.next', 'dist', 'node_modules', 'coverage']);

const checks = [
  {
    id: 'hardcoded-light-surface',
    severity: 'high',
    pattern: /\b(bg-white(?!\/)|bg-gray-\d{2,3}|bg-slate-\d{2,3}|bg-zinc-\d{2,3}|bg-neutral-\d{2,3}|bg-stone-\d{2,3})\b/,
    hint: 'Prefer bg-card/bg-background/bg-muted or add an explicit dark: surface.',
  },
  {
    id: 'hardcoded-dark-text',
    severity: 'high',
    pattern: /\b(text-black|text-gray-\d{2,3}|text-slate-\d{2,3}|text-zinc-\d{2,3}|text-neutral-\d{2,3}|text-stone-\d{2,3})\b/,
    hint: 'Prefer text-foreground/text-muted-foreground or add an explicit dark: text color.',
  },
  {
    id: 'pastel-surface',
    severity: 'medium',
    pattern: /\bbg-pastel-(pink|green|purple|yellow|blue|orange)(\/\d+)?\b/,
    hint: 'Pastel surfaces must rely on dark pastel tokens or semantic notice classes.',
  },
  {
    id: 'semantic-soft-surface',
    severity: 'medium',
    pattern: /\bbg-(primary|warning|success|info|destructive)\/(5|8|10|15|20)\b/,
    hint: 'Use semantic text plus border, or notice-* when the surface contains paragraphs.',
  },
  {
    id: 'inline-color-style',
    severity: 'medium',
    pattern: /\b(style=\{\{[^}]*\b(background|color|borderColor):|#[0-9a-fA-F]{3,8}\b)/,
    hint: 'Prefer design tokens so dark mode inherits contrast fixes.',
  },
];

function readIfExists(file) {
  try {
    return readFileSync(path.join(root, file), 'utf8');
  } catch {
    return '';
  }
}

const globalCss = [
  readIfExists('apps/web/app/globals.css'),
  readIfExists('apps/web/src/index.css'),
].join('\n');

const hasSemanticSurfaceGuard =
  /dark \.bg-warning\\\/10/.test(globalCss) &&
  /dark \.bg-success\\\/10/.test(globalCss) &&
  /dark \.bg-info\\\/10/.test(globalCss) &&
  /dark \.bg-destructive\\\/10/.test(globalCss) &&
  /dark \.bg-primary\\\/10/.test(globalCss);

const hasPastelSurfaceGuard =
  /dark \.bg-pastel-yellow/.test(globalCss) &&
  /dark \.bg-pastel-green/.test(globalCss) &&
  /dark \.bg-pastel-blue/.test(globalCss) &&
  /dark \.bg-pastel-purple/.test(globalCss) &&
  /dark \.bg-pastel-pink/.test(globalCss);

function walk(dir) {
  const absDir = path.join(root, dir);
  let entries = [];
  try {
    entries = readdirSync(absDir);
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const full = path.join(absDir, entry);
    const rel = path.relative(root, full);
    if (rel.split(path.sep).some((part) => ignoreParts.has(part))) continue;

    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walk(rel));
      continue;
    }
    if (includeExtensions.has(path.extname(full))) files.push(rel);
  }
  return files;
}

function isKnownSafeDecoration(checkId, line) {
  if (checkId !== 'hardcoded-light-surface') return false;
  return (
    /rounded-full bg-white/.test(line) &&
    (/\bw-1\.5\b/.test(line) || /absolute top-0\.5/.test(line))
  );
}

function isKnownTokenStyle(checkId, line) {
  if (checkId !== 'inline-color-style') return false;
  return (
    /theme\.colors|hsl\(var\(|p\.color|rgba\(255,\s*255,\s*255/.test(line) ||
    /withAlpha\(|kpi\.(color|accent|bg|border)|s\.color|GENRE_PALETTE|CHART_COLORS/.test(line) ||
    /style=\{\{\s*(background|color):\s*c\s*\}\}/.test(line) ||
    /style=\{\{[^}]*\b(width|height|transform|margin|fontSize|fontWeight|lineHeight)\b/.test(line)
  );
}

const findings = [];

for (const file of sourceRoots.flatMap(walk)) {
  const normalized = file.replaceAll(path.sep, '/');
  const text = readFileSync(path.join(root, file), 'utf8');
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const hasDarkOverride = /\bdark:|\.dark\b|notice-|text-foreground|text-muted-foreground|bg-card|bg-background|bg-muted/.test(line);
    checks.forEach((check) => {
      if (!check.pattern.test(line)) return;
      if (hasDarkOverride && check.id !== 'inline-color-style') return;
      if (isKnownSafeDecoration(check.id, line)) return;
      if (isKnownTokenStyle(check.id, line)) return;
      if (check.id === 'semantic-soft-surface' && hasSemanticSurfaceGuard) return;
      if (check.id === 'pastel-surface' && hasPastelSurfaceGuard) return;

      findings.push({
        check: check.id,
        severity: check.severity,
        file: normalized,
        line: index + 1,
        text: line.trim().slice(0, 180),
        hint: check.hint,
      });
    });
  });
}

const summary = findings.reduce((acc, item) => {
  acc[item.check] = (acc[item.check] ?? 0) + 1;
  return acc;
}, {});

const result = {
  generatedAt: new Date().toISOString(),
  strict,
  totalFindings: findings.length,
  summary,
  findings: full ? findings : findings.slice(0, maxFindings),
  truncated: !full && findings.length > maxFindings,
};

console.log(JSON.stringify(result, null, 2));

if (strict && findings.some((item) => item.severity === 'high')) {
  process.exitCode = 1;
}
