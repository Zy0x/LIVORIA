import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const generatedAt = new Date().toISOString();
const args = new Set(process.argv.slice(2));
const markdownIndex = process.argv.indexOf('--markdown');

const scanRoots = [
  'apps/web/app',
  'apps/web/src',
  'packages',
  'scripts',
  'supabase/functions',
];
const ignoredDirs = new Set(['.git', '.next', 'coverage', 'dist', 'node_modules']);
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css', '.md']);

function toPosix(value) {
  return value.replaceAll(path.sep, '/');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function walk(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];

  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolutePath = path.join(absoluteDir, entry.name);
    const relativePath = toPosix(path.relative(root, absolutePath));

    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) return [];
      return walk(relativePath);
    }

    return sourceExtensions.has(path.extname(entry.name)) ? [relativePath] : [];
  });
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function lineCount(text) {
  return text.split(/\r?\n/).length;
}

function classifyLayer(file) {
  const segments = file.split('/');
  if (file.endsWith('.css')) return 'style';
  if (file.startsWith('apps/web/app/')) return 'route';
  if (file.includes('/pages/')) return 'page';
  if (file.includes('/components/')) return 'component';
  if (file.includes('/hooks/')) return 'hook';
  if (file.includes('/services/') || file.includes('.repository.')) return 'service';
  if (file.includes('/domain/')) return 'domain';
  if (file.includes('/schemas/')) return 'schema';
  if (file.includes('/types/')) return 'type';
  if (file.includes('/shared/')) return 'shared';
  if (file.includes('/lib/')) return 'lib';
  if (segments[0] === 'packages') return 'package';
  if (segments[0] === 'supabase') return 'edge-function';
  if (segments[0] === 'scripts') return 'script';
  return 'other';
}

function featureName(file) {
  const match = file.match(/^apps\/web\/src\/features\/([^/]+)\//);
  if (match) return match[1];
  if (file.startsWith('apps/web/app/')) {
    const route = file.replace('apps/web/app/', '').split('/')[0];
    if (route.endsWith('.css')) return 'shared';
    return route.endsWith('.tsx') ? 'root' : route;
  }
  if (file.startsWith('packages/')) return file.split('/').slice(0, 2).join('/');
  if (file.startsWith('supabase/functions/')) return file.split('/').slice(0, 3).join('/');
  return 'shared';
}

function parseImports(text) {
  const imports = [];
  const importPattern = /(?:from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\))/g;
  for (const match of text.matchAll(importPattern)) {
    imports.push(match[1] ?? match[2]);
  }
  return imports;
}

function createRiskReasons(item) {
  const reasons = [];
  const isUi = ['route', 'page', 'component'].includes(item.layer);

  if (item.lines >= 700) reasons.push('very-large-file');
  else if (item.lines >= 500) reasons.push('large-file');
  if (item.layer === 'page' && item.lines >= 450) reasons.push('page-not-thin');
  if (item.layer === 'component' && item.lines >= 450) reasons.push('component-hard-to-debug');
  if (item.layer === 'hook' && item.lines >= 300) reasons.push('hook-too-broad');
  if (item.layer === 'service' && item.browserApiRefs > 0) reasons.push('service-has-browser-api');
  if (item.layer === 'domain' && (item.browserApiRefs > 0 || item.directSupabaseRefs > 0 || item.reactHookRefs > 0)) reasons.push('domain-not-pure');
  if (isUi && item.directSupabaseRefs > 0) reasons.push('ui-direct-supabase');
  if (isUi && item.heavyStaticImports.length > 0) reasons.push('ui-heavy-static-import');
  if (item.browserApiRefs >= 12) reasons.push('browser-api-heavy');
  if (item.relativeInternalImports >= 10) reasons.push('many-relative-imports');

  return reasons;
}

function splitSuggestion(item) {
  if (item.layer === 'page') return 'Keep the route/page as an orchestrator; move dialogs, filters, mutation handlers, and derived data into feature hooks/components.';
  if (item.layer === 'component') return 'Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body.';
  if (item.layer === 'hook') return 'Separate server state, URL state, filter state, and mutation side effects into focused hooks.';
  if (item.layer === 'service') return 'Keep Supabase calls here; move normalization into mapper and payload validation into schema.';
  if (item.layer === 'domain') return 'Keep this file pure; move formatting/UI messages out if they need React, DOM, or Supabase.';
  if (item.layer === 'script') return 'Keep script IO at the edges and extract reusable scanners/helpers if multiple audit scripts need them.';
  return 'Split only when there is a clear debugging boundary and behavior can be verified by existing tests/build.';
}

const allFiles = scanRoots.flatMap(walk).filter((file, index, list) => list.indexOf(file) === index);
const files = allFiles.map((file) => {
  const text = read(file);
  const imports = parseImports(text);
  const staticImports = imports.filter((specifier) => !specifier.startsWith('.'));
  const heavyStaticImports = staticImports.filter((specifier) => ['xlsx', 'jspdf', 'jspdf-autotable', 'recharts', 'gsap'].includes(specifier));
  const layer = classifyLayer(file);

  const item = {
    file,
    feature: featureName(file),
    layer,
    lines: lineCount(text),
    imports: imports.length,
    staticImports: staticImports.length,
    relativeInternalImports: imports.length - staticImports.length,
    heavyStaticImports,
    reactHookRefs: countMatches(text, /\buse[A-Z][A-Za-z0-9_]*\s*\(/g),
    browserApiRefs: countMatches(text, /\b(window|document|localStorage|sessionStorage|navigator)\b/g),
    directSupabaseRefs: countMatches(text, /@\/lib\/supabase|@\/integrations\/supabase\/client|supabase\.(from|rpc|functions|storage)/g),
    todoRefs: countMatches(text, /\b(TODO|FIXME|HACK)\b/g),
  };

  item.riskReasons = createRiskReasons(item);
  item.riskScore =
    Math.floor(item.lines / 100) +
    item.browserApiRefs * 2 +
    item.directSupabaseRefs * 8 +
    item.heavyStaticImports.length * 5 +
    item.riskReasons.length * 6;
  item.splitSuggestion = item.riskReasons.length > 0 ? splitSuggestion(item) : '';

  return item;
});

const featureSummary = Object.values(files.reduce((acc, item) => {
  acc[item.feature] ??= {
    feature: item.feature,
    files: 0,
    lines: 0,
    riskyFiles: 0,
    pages: 0,
    components: 0,
    hooks: 0,
    services: 0,
    domain: 0,
  };
  const bucket = acc[item.feature];
  bucket.files += 1;
  bucket.lines += item.lines;
  if (item.riskReasons.length > 0) bucket.riskyFiles += 1;
  if (item.layer === 'page' || item.layer === 'route') bucket.pages += 1;
  if (item.layer === 'component') bucket.components += 1;
  if (item.layer === 'hook') bucket.hooks += 1;
  if (item.layer === 'service') bucket.services += 1;
  if (item.layer === 'domain') bucket.domain += 1;
  return acc;
}, {})).sort((a, b) => b.lines - a.lines);

const layerSummary = Object.values(files.reduce((acc, item) => {
  acc[item.layer] ??= { layer: item.layer, files: 0, lines: 0, riskyFiles: 0 };
  acc[item.layer].files += 1;
  acc[item.layer].lines += item.lines;
  if (item.riskReasons.length > 0) acc[item.layer].riskyFiles += 1;
  return acc;
}, {})).sort((a, b) => b.lines - a.lines);

const riskFiles = files
  .filter((item) => item.riskReasons.length > 0)
  .sort((a, b) => b.riskScore - a.riskScore || b.lines - a.lines);

const scriptSummary = files
  .filter((item) => item.layer === 'script')
  .sort((a, b) => b.lines - a.lines)
  .map(({ file, lines, imports, riskReasons }) => ({ file, lines, imports, riskReasons }));

const packageJson = exists('package.json') ? JSON.parse(read('package.json')) : {};
const debugScripts = Object.fromEntries(Object.entries(packageJson.scripts ?? {}).filter(([key]) => key.includes('debug') || key.includes('audit') || key === 'check'));

const report = {
  generatedAt,
  summary: {
    scannedFiles: files.length,
    riskyFiles: riskFiles.length,
    features: featureSummary.length,
    layers: layerSummary.length,
  },
  debugScripts,
  layerSummary,
  featureSummary,
  riskFiles: riskFiles.slice(0, args.has('--all') ? undefined : 40),
  scriptSummary,
  recommendations: [
    'Use debug:map before large refactors to see the top risk files and their split suggestions.',
    'Keep page files thin; pages should orchestrate hooks/components and avoid direct Supabase calls.',
    'Keep domain files pure; no React hooks, browser APIs, or Supabase imports.',
    'Move repeated UI date/currency formatting into shared formatter helpers only when behavior is generic.',
    'Split large components by visible responsibility instead of creating overly generic abstractions.',
  ],
};

function markdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const divider = `| ${columns.map((column) => column.align === 'right' ? '---:' : '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(column.value(row)).replaceAll('|', '\\|')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

function toMarkdown(data) {
  const lines = [
    '# LIVORIA Debuggability Map',
    '',
    `Generated: ${data.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Scanned files: ${data.summary.scannedFiles}`,
    `- Risky/debug-priority files: ${data.summary.riskyFiles}`,
    `- Feature buckets: ${data.summary.features}`,
    `- Layer buckets: ${data.summary.layers}`,
    '',
    '## Debug Scripts',
    '',
    markdownTable(Object.entries(data.debugScripts).map(([name, command]) => ({ name, command })), [
      { label: 'Script', value: (row) => row.name },
      { label: 'Command', value: (row) => `\`${row.command}\`` },
    ]),
    '',
    '## Layer Summary',
    '',
    markdownTable(data.layerSummary, [
      { label: 'Layer', value: (row) => row.layer },
      { label: 'Files', align: 'right', value: (row) => row.files },
      { label: 'Lines', align: 'right', value: (row) => row.lines },
      { label: 'Risky', align: 'right', value: (row) => row.riskyFiles },
    ]),
    '',
    '## Feature Summary',
    '',
    markdownTable(data.featureSummary, [
      { label: 'Feature', value: (row) => row.feature },
      { label: 'Files', align: 'right', value: (row) => row.files },
      { label: 'Lines', align: 'right', value: (row) => row.lines },
      { label: 'Risky', align: 'right', value: (row) => row.riskyFiles },
      { label: 'Pages', align: 'right', value: (row) => row.pages },
      { label: 'Components', align: 'right', value: (row) => row.components },
      { label: 'Hooks', align: 'right', value: (row) => row.hooks },
      { label: 'Services', align: 'right', value: (row) => row.services },
    ]),
    '',
    '## Debug-Priority Files',
    '',
    markdownTable(data.riskFiles.slice(0, 30), [
      { label: 'File', value: (row) => row.file },
      { label: 'Layer', value: (row) => row.layer },
      { label: 'Lines', align: 'right', value: (row) => row.lines },
      { label: 'Risk', value: (row) => row.riskReasons.join(', ') },
      { label: 'Suggested split', value: (row) => row.splitSuggestion },
    ]),
    '',
    '## Recommendations',
    '',
    ...data.recommendations.map((item) => `- ${item}`),
    '',
  ];
  return lines.join('\n');
}

if (markdownIndex !== -1) {
  const outputPath = process.argv[markdownIndex + 1];
  if (!outputPath) throw new Error('--markdown requires an output path');
  fs.mkdirSync(path.dirname(path.join(root, outputPath)), { recursive: true });
  fs.writeFileSync(path.join(root, outputPath), `${toMarkdown(report)}\n`);
}

if (args.has('--markdown-only')) {
  process.exit(0);
}

console.log(JSON.stringify(report, null, 2));
