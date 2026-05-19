import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoots = [
  'apps/web/src',
  'apps/web-next',
  'supabase/functions',
];

const includeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.md']);
const ignoreParts = ['node_modules', '.next', 'dist', 'coverage'];

const checks = [
  {
    id: 'ui-direct-supabase',
    severity: 'high',
    description: 'UI/client component appears to import or call Supabase directly.',
    pathPattern: /apps[\\/]web[\\/]src[\\/](components|pages|features[\\/].*[\\/](components|pages))[\\/].*\.tsx$/,
    pattern: /from ['"]@\/lib\/supabase['"]|from ['"]@\/integrations\/supabase\/client['"]|supabase\.(from|rpc|functions|storage)\b/,
  },
  {
    id: 'backend-language-ui',
    severity: 'medium',
    description: 'Potential backend/internal wording in user-facing web code.',
    pathPattern: /apps[\\/]web[\\/]src[\\/](components|pages|features[\\/].*[\\/](components|pages))[\\/].*\.tsx$/,
    pattern: /\b(Supabase|RPC|Edge Function|schema|database|bucket|service role|PostgREST|pg_cron)\b/i,
  },
  {
    id: 'inline-id-formatters',
    severity: 'medium',
    description: 'Inline Indonesian currency/date formatting; prefer shared formatter when behavior is generic.',
    pathPattern: /apps[\\/]web[\\/]src[\\/].*\.(ts|tsx)$/,
    pattern: /Intl\.NumberFormat\('id-ID'|toLocale(DateString|String)\('id-ID'/,
  },
  {
    id: 'encoding-mojibake',
    severity: 'medium',
    description: 'Mojibake/encoding artifact likely visible in UI or bot messages.',
    pathPattern: /apps[\\/]web[\\/]src|supabase[\\/]functions|docs[\\/]/,
    pattern: /Â|â[€”œ€˜™€¢œš“”]|\uFFFD|ðŸ/,
  },
  {
    id: 'pagination-scroll-anchor',
    severity: 'low',
    description: 'Pagination state change found; verify it scrolls to list/card start, not document top.',
    pathPattern: /apps[\\/]web[\\/]src[\\/].*\.(ts|tsx)$/,
    pattern: /setCurrentPage|onPageChange|tpage|pageParam/,
  },
  {
    id: 'telegram-targeting',
    severity: 'high',
    description: 'Telegram function targeting/reminder logic surface; review before deployment.',
    pathPattern: /supabase[\\/]functions[\\/]telegram-tagihan[\\/]index\.ts$/,
    pattern: /telegram_subscriptions|sendMessage|daily_reminder|monthly_report|overdue_alert|generateReport|chat_id/,
  },
];

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
    if (ignoreParts.some((part) => rel.split(path.sep).includes(part))) continue;

    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walk(rel));
      continue;
    }
    if (includeExtensions.has(path.extname(full))) files.push(rel);
  }
  return files;
}

const files = sourceRoots.flatMap(walk);
const findings = [];

for (const file of files) {
  const normalized = file.replaceAll(path.sep, '/');
  const text = readFileSync(path.join(root, file), 'utf8');
  const lines = text.split(/\r?\n/);

  for (const check of checks) {
    if (!check.pathPattern.test(normalized)) continue;
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (check.id === 'backend-language-ui') {
        if (/^(import|export|type|interface|\/\/|\/\*|\*)\b/.test(trimmed)) return;
        if (/^<([A-Z][A-Za-z0-9_]*\s|[A-Z][A-Za-z0-9_]*>|\/?[A-Z][A-Za-z0-9_]*>)/.test(trimmed)) return;
        const isSourceOnly =
          /^(const|let|var|function|async function)\b/.test(trimmed) ||
          /^}?\s*(const|let|var)\s/.test(trimmed);
        const hasVisibleString = /['"`][^'"`]*(Supabase|RPC|Edge Function|schema|database|bucket|service role|PostgREST|pg_cron)[^'"`]*['"`]/i.test(trimmed);
        const hasJsxText = />[^<]*(Supabase|RPC|Edge Function|schema|database|bucket|service role|PostgREST|pg_cron)[^<]*</i.test(trimmed);
        if (isSourceOnly && !hasVisibleString && !hasJsxText) return;
      }
      if (!check.pattern.test(line)) return;
      findings.push({
        check: check.id,
        severity: check.severity,
        file: normalized,
        line: index + 1,
        text: line.trim().slice(0, 180),
      });
    });
  }
}

const summary = findings.reduce((acc, item) => {
  acc[item.check] = (acc[item.check] ?? 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  summary,
  findings,
}, null, 2));
