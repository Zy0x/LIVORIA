export function formatDateID(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('id-ID', options || {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
