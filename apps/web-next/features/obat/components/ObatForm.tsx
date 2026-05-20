import type { ObatItem } from '@livoria/core';
import {
  fieldLabelStyle,
  formGridStyle,
  inputStyle,
  primaryButtonStyle,
} from './obat.styles';

export function ObatForm({
  formAction,
  intent,
  isPending,
  item,
}: {
  formAction: (payload: FormData) => void;
  intent: 'create' | 'update';
  isPending: boolean;
  item?: ObatItem;
}) {
  return (
    <form action={formAction} style={formGridStyle}>
      <input name="intent" type="hidden" value={intent} />
      {item ? <input name="id" type="hidden" value={item.id} /> : null}
      <Field defaultValue={item?.name} label="Nama" name="name" required />
      <Field defaultValue={item?.type || 'Lainnya'} label="Tipe" name="type" />
      <Field defaultValue={item?.dosage} label="Dosis" name="dosage" />
      <Field defaultValue={item?.frequency} label="Frekuensi" name="frequency" />
      <Field defaultValue={item?.usage_info} label="Aturan pakai" name="usage_info" wide />
      <Field defaultValue={item?.side_effects ?? ''} label="Efek samping" name="side_effects" wide />
      <Field defaultValue={item?.notes ?? ''} label="Catatan" name="notes" wide />
      <button disabled={isPending} style={primaryButtonStyle} type="submit">
        {intent === 'create' ? 'Tambah' : 'Simpan'}
      </button>
    </form>
  );
}

function Field({
  defaultValue,
  label,
  name,
  required,
  wide,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <label style={{ display: 'grid', gap: 6, gridColumn: wide ? '1 / -1' : undefined }}>
      <span style={fieldLabelStyle}>{label}</span>
      <input
        defaultValue={defaultValue ?? ''}
        name={name}
        required={required}
        style={inputStyle}
      />
    </label>
  );
}
