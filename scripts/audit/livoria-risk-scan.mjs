import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { checks, ignoreParts, includeExtensions, sourceRoots } from './livoria-risk-rules.mjs';

const root = process.cwd();

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
