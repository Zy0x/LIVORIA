import { formatDateID, type ObatItem } from '@livoria/core';
import { theme } from '../../../lib/theme';
import { ObatForm } from './ObatForm';
import {
  buttonRowStyle,
  dangerButtonStyle,
  panelStyle,
  secondaryButtonStyle,
} from './obat.styles';

export function ObatCard({
  formAction,
  isPending,
  item,
  onDetail,
}: {
  formAction: (payload: FormData) => void;
  isPending: boolean;
  item: ObatItem;
  onDetail: () => void;
}) {
  return (
    <article style={panelStyle}>
      <p style={{ color: theme.colors.muted, fontSize: 13, fontWeight: 700, margin: 0 }}>
        {item.type || 'Lainnya'}
      </p>
      <h2 style={{ fontSize: 22, margin: '8px 0' }}>{item.name || 'Tanpa nama'}</h2>
      <p style={{ color: theme.colors.foreground, lineHeight: 1.5, margin: 0 }}>
        {item.dosage || '-'} / {item.frequency || '-'}
      </p>
      <p style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 0 }}>
        {item.usage_info || 'Tidak ada aturan pakai.'}
      </p>
      {item.created_at ? (
        <p style={{ color: theme.colors.muted, fontSize: 12, marginBottom: 0 }}>
          Dibuat {formatDateID(item.created_at)}
        </p>
      ) : null}
      <div style={buttonRowStyle}>
        <button onClick={onDetail} style={secondaryButtonStyle} type="button">
          Detail
        </button>
      </div>
      <details style={{ marginTop: theme.spacing.md }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Edit</summary>
        <ObatForm formAction={formAction} isPending={isPending} intent="update" item={item} />
      </details>
      <form action={formAction} style={{ marginTop: theme.spacing.sm }}>
        <input name="intent" type="hidden" value="delete" />
        <input name="id" type="hidden" value={item.id} />
        <button disabled={isPending} style={dangerButtonStyle} type="submit">
          Hapus
        </button>
      </form>
    </article>
  );
}
