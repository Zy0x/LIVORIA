import type { ObatInput, ObatItem } from '../types/obat.types';

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

export function mapObatRow(row: Record<string, unknown>): ObatItem {
  return {
    id: toStringValue(row.id),
    user_id: toStringValue(row.user_id),
    name: toStringValue(row.name),
    type: toStringValue(row.type) || 'Lainnya',
    dosage: toStringValue(row.dosage),
    usage_info: toStringValue(row.usage_info),
    notes: toStringValue(row.notes),
    frequency: toStringValue(row.frequency),
    side_effects: toStringValue(row.side_effects),
    created_at: toStringValue(row.created_at),
  };
}

export function mapObatRows(rows: Record<string, unknown>[] | null | undefined): ObatItem[] {
  return (rows ?? []).map(mapObatRow);
}

export function mapObatInput(input: ObatInput): ObatInput {
  return {
    name: input.name?.trim() ?? '',
    type: input.type?.trim() || 'Lainnya',
    dosage: input.dosage?.trim() ?? '',
    usage_info: input.usage_info?.trim() ?? '',
    notes: input.notes?.trim() ?? '',
    frequency: input.frequency?.trim() ?? '',
    side_effects: input.side_effects?.trim() ?? '',
  };
}
