export function toStringValue(value: unknown) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

export function toNullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}
