export const sourceRoots = [
  'apps/web',
  'supabase/functions',
];

export const includeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.md']);
export const ignoreParts = ['node_modules', '.next', 'dist', 'coverage', 'public'];

export const checks = [
  {
    id: 'ui-direct-supabase',
    severity: 'high',
    description: 'UI/client component appears to import or call Supabase directly.',
    pathPattern: /apps[\\/]web[\\/](components|app|features[\\/].*[\\/]components)[\\/].*\.tsx$/,
    pattern: /from ['"]@\/lib\/supabase['"]|from ['"]@\/integrations\/supabase\/client['"]|supabase\.(from|rpc|functions|storage)\b/,
  },
  {
    id: 'backend-language-ui',
    severity: 'medium',
    description: 'Potential backend/internal wording in user-facing web code.',
    pathPattern: /apps[\\/]web[\\/](components|app|features[\\/].*[\\/]components)[\\/].*\.tsx$/,
    pattern: /\b(Supabase|RPC|Edge Function|schema|database|bucket|service role|PostgREST|pg_cron)\b/i,
  },
  {
    id: 'inline-id-formatters',
    severity: 'medium',
    description: 'Inline Indonesian currency/date formatting; prefer shared formatter when behavior is generic.',
    pathPattern: /apps[\\/]web[\\/].*\.(ts|tsx)$/,
    pattern: /Intl\.NumberFormat\('id-ID'|toLocale(DateString|String)\('id-ID'/,
  },
  {
    id: 'encoding-mojibake',
    severity: 'medium',
    description: 'Mojibake/encoding artifact likely visible in UI or bot messages.',
    pathPattern: /apps[\\/]web|supabase[\\/]functions|docs[\\/]/,
    pattern: /\u00c3|\u00e2|\u00f0|\uFFFD/,
  },
  {
    id: 'pagination-scroll-anchor',
    severity: 'low',
    description: 'Pagination state change found; verify it scrolls to list/card start, not document top.',
    pathPattern: /apps[\\/]web[\\/].*\.(ts|tsx)$/,
    pattern: /setCurrentPage|onPageChange|tpage|pageParam/,
  },
  {
    id: 'telegram-targeting',
    severity: 'high',
    description: 'Telegram reminder function must keep targeting, preference, and cron-secret guard rails.',
    pathPattern: /supabase[\\/]functions[\\/]telegram-tagihan[\\/]index\.ts$/,
    pattern: /telegram_subscriptions|sendMessage|daily_reminder|monthly_report|overdue_alert|generateReport|chat_id/,
  },
];
