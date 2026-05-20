# LIVORIA Edge Function Safety Audit

Generated: 2026-05-20T05:29:54.287Z

## Summary

- Passed: 15
- Failed: 0
- Total: 15

## Gates

| Gate | Status | Severity | File | Detail |
| --- | --- | --- | --- | --- |
| telegram-helper-split | OK | medium | supabase/functions/telegram-tagihan/index.ts | Telegram index should import helper/renderer modules instead of owning all logic. |
| telegram-chat-id-normalized | OK | high | supabase/functions/telegram-tagihan/index.ts | Webhook, cron, register, and test flows should normalize chat IDs before sending. |
| telegram-cron-secret | OK | high | supabase/functions/telegram-tagihan/index.ts | Telegram cron actions must require a server-side cron secret. |
| telegram-webhook-secret-ready | OK | medium | supabase/functions/telegram-tagihan/index.ts | Telegram webhook should support Telegram secret-token validation. |
| telegram-mojibake-free | OK | medium | supabase/functions/telegram-tagihan | Telegram files should not contain mojibake or replacement characters. |
| admin-restore-confirmation | OK | high | supabase/functions/admin-backup/index.ts | Admin restore must require an explicit server-side confirmation phrase. |
| admin-cron-backup-only | OK | high | supabase/functions/admin-backup/admin-auth.ts | Cron secret must not authorize destructive or admin actions beyond backup. |
| admin-isauto-rejected | OK | high | supabase/functions/admin-backup/admin-auth.ts | Legacy isAuto bypass attempts should be rejected without a valid cron secret. |
| admin-restore-allowlist | OK | high | supabase/functions/admin-backup/restore-safety.ts | Restore payload should only allow known LIVORIA tables. |
| no-bom:supabase/functions/admin-backup/admin-auth.ts | OK | low | supabase/functions/admin-backup/admin-auth.ts | Edge function source should be UTF-8 without BOM. |
| no-bom:supabase/functions/admin-backup/index.ts | OK | low | supabase/functions/admin-backup/index.ts | Edge function source should be UTF-8 without BOM. |
| no-bom:supabase/functions/admin-backup/restore-safety.ts | OK | low | supabase/functions/admin-backup/restore-safety.ts | Edge function source should be UTF-8 without BOM. |
| no-bom:supabase/functions/telegram-tagihan/index.ts | OK | low | supabase/functions/telegram-tagihan/index.ts | Edge function source should be UTF-8 without BOM. |
| no-bom:supabase/functions/telegram-tagihan/telegram-helpers.ts | OK | low | supabase/functions/telegram-tagihan/telegram-helpers.ts | Edge function source should be UTF-8 without BOM. |
| no-bom:supabase/functions/telegram-tagihan/report-renderer.ts | OK | low | supabase/functions/telegram-tagihan/report-renderer.ts | Edge function source should be UTF-8 without BOM. |

