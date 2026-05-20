export const TAGIHAN_REPORT_CHART_COLORS = {
  primary: 'hsl(155, 30%, 26%)',
  success: 'hsl(152, 56%, 38%)',
  warning: 'hsl(35, 90%, 48%)',
  info: 'hsl(214, 88%, 58%)',
  destructive: 'hsl(0, 70%, 50%)',
};

export function formatReportCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n);
}

export function formatReportShort(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return String(Math.round(n));
}
