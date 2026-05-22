export function formatCurrencyIDR(value: number) {
  return new Intl.NumberFormat('id-ID', {
    currency: 'IDR',
    minimumFractionDigits: 0,
    style: 'currency',
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatCompactIDR(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  if (safeValue >= 1_000_000_000) return `${(safeValue / 1_000_000_000).toFixed(1)}M`;
  if (safeValue >= 1_000_000) return `${(safeValue / 1_000_000).toFixed(1)}jt`;
  if (safeValue >= 1_000) return `${(safeValue / 1_000).toFixed(0)}rb`;
  return String(Math.round(safeValue));
}
