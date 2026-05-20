import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const generatedAt = new Date().toISOString();

function read(relPath) {
  return readFileSync(path.join(root, relPath), 'utf8');
}

function hasBom(relPath) {
  const bytes = readFileSync(path.join(root, relPath));
  return bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
}

function gate(id, ok, severity, file, detail) {
  return { detail, file, id, ok, severity };
}

const files = {
  adminAuth: 'supabase/functions/admin-backup/admin-auth.ts',
  adminBackup: 'supabase/functions/admin-backup/index.ts',
  adminRestoreSafety: 'supabase/functions/admin-backup/restore-safety.ts',
  telegram: 'supabase/functions/telegram-tagihan/index.ts',
  telegramHelpers: 'supabase/functions/telegram-tagihan/telegram-helpers.ts',
  telegramRenderer: 'supabase/functions/telegram-tagihan/report-renderer.ts',
};

const loaded = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, existsSync(path.join(root, file)) ? read(file) : '']),
);

const allEdgeText = Object.values(loaded).join('\n');
const mojibakePattern = /Ã|â|ð|�/;

const gates = [
  gate(
    'telegram-helper-split',
    loaded.telegram.includes('./telegram-helpers.ts') && loaded.telegram.includes('./report-renderer.ts'),
    'medium',
    files.telegram,
    'Telegram index should import helper/renderer modules instead of owning all logic.',
  ),
  gate(
    'telegram-chat-id-normalized',
    loaded.telegram.includes('normalizeChatId(msg?.chat?.id)') &&
      loaded.telegram.includes('normalizeChatId(sub.chat_id)') &&
      loaded.telegram.includes('normalizeChatId(body.chatId)'),
    'high',
    files.telegram,
    'Webhook, cron, register, and test flows should normalize chat IDs before sending.',
  ),
  gate(
    'telegram-cron-secret',
    loaded.telegram.includes('verifyCronSecret') && loaded.telegram.includes('x-livoria-cron-secret'),
    'high',
    files.telegram,
    'Telegram cron actions must require a server-side cron secret.',
  ),
  gate(
    'telegram-webhook-secret-ready',
    loaded.telegram.includes('verifyTelegramWebhook') && loaded.telegram.includes('x-telegram-bot-api-secret-token'),
    'medium',
    files.telegram,
    'Telegram webhook should support Telegram secret-token validation.',
  ),
  gate(
    'telegram-mojibake-free',
    !mojibakePattern.test(loaded.telegram + loaded.telegramHelpers + loaded.telegramRenderer),
    'medium',
    'supabase/functions/telegram-tagihan',
    'Telegram files should not contain mojibake or replacement characters.',
  ),
  gate(
    'admin-restore-confirmation',
    loaded.adminBackup.includes('validateRestoreConfirmation(body)') &&
      loaded.adminRestoreSafety.includes('RESTORE LIVORIA'),
    'high',
    files.adminBackup,
    'Admin restore must require an explicit server-side confirmation phrase.',
  ),
  gate(
    'admin-cron-backup-only',
    loaded.adminAuth.includes("body?.action === 'backup'") &&
      loaded.adminAuth.includes('Cron access is only allowed for backup.'),
    'high',
    files.adminAuth,
    'Cron secret must not authorize destructive or admin actions beyond backup.',
  ),
  gate(
    'admin-isauto-rejected',
    loaded.adminAuth.includes('body?.isAuto') && loaded.adminAuth.includes('Missing or invalid cron secret.'),
    'high',
    files.adminAuth,
    'Legacy isAuto bypass attempts should be rejected without a valid cron secret.',
  ),
  gate(
    'admin-restore-allowlist',
    loaded.adminRestoreSafety.includes('RESTORE_TABLES') &&
      loaded.adminRestoreSafety.includes('Backup berisi tabel tidak dikenal'),
    'high',
    files.adminRestoreSafety,
    'Restore payload should only allow known LIVORIA tables.',
  ),
  ...Object.values(files).map((file) => gate(
    `no-bom:${file}`,
    existsSync(path.join(root, file)) ? !hasBom(file) : false,
    'low',
    file,
    'Edge function source should be UTF-8 without BOM.',
  )),
];

const report = {
  generatedAt,
  summary: {
    failed: gates.filter((item) => !item.ok).length,
    passed: gates.filter((item) => item.ok).length,
    total: gates.length,
  },
  gates,
};

function toMarkdown(data) {
  const lines = [
    '# LIVORIA Edge Function Safety Audit',
    '',
    `Generated: ${data.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Passed: ${data.summary.passed}`,
    `- Failed: ${data.summary.failed}`,
    `- Total: ${data.summary.total}`,
    '',
    '## Gates',
    '',
    '| Gate | Status | Severity | File | Detail |',
    '| --- | --- | --- | --- | --- |',
    ...data.gates.map((item) => `| ${item.id} | ${item.ok ? 'OK' : 'FAIL'} | ${item.severity} | ${item.file} | ${item.detail} |`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

const markdownArgIndex = process.argv.indexOf('--markdown');
if (markdownArgIndex !== -1) {
  const target = process.argv[markdownArgIndex + 1];
  if (!target) throw new Error('--markdown requires an output path');
  writeFileSync(path.join(root, target), toMarkdown(report));
}

console.log(JSON.stringify(report, null, 2));

if (report.summary.failed > 0) {
  process.exitCode = 1;
}
