export type ObatItem = {
  id: string;
  user_id?: string;
  name: string;
  type: string;
  dosage: string;
  usage_info: string;
  frequency: string;
  side_effects?: string | null;
  notes?: string | null;
  created_at?: string;
};

export type ObatInput = Pick<
  ObatItem,
  'name' | 'type' | 'dosage' | 'usage_info' | 'frequency' | 'side_effects' | 'notes'
>;

export function normalizeObatItem(input: Partial<ObatItem>): ObatItem {
  return {
    id: String(input.id ?? ''),
    user_id: input.user_id ? String(input.user_id) : undefined,
    name: String(input.name ?? ''),
    type: String(input.type ?? 'Lainnya'),
    dosage: String(input.dosage ?? ''),
    usage_info: String(input.usage_info ?? ''),
    frequency: String(input.frequency ?? ''),
    side_effects: input.side_effects == null ? null : String(input.side_effects),
    notes: input.notes == null ? null : String(input.notes),
    created_at: input.created_at ? String(input.created_at) : undefined,
  };
}

export function normalizeObatInput(input: Partial<ObatInput>): ObatInput {
  return {
    name: String(input.name ?? '').trim(),
    type: String(input.type ?? 'Lainnya').trim() || 'Lainnya',
    dosage: String(input.dosage ?? '').trim(),
    usage_info: String(input.usage_info ?? '').trim(),
    frequency: String(input.frequency ?? '').trim(),
    side_effects: input.side_effects == null ? null : String(input.side_effects).trim(),
    notes: input.notes == null ? null : String(input.notes).trim(),
  };
}
