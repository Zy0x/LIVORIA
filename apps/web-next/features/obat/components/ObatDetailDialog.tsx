import type { ObatItem } from '@livoria/core';
import { theme } from '../../../lib/theme';
import {
  fieldLabelStyle,
  panelStyle,
  primaryButtonStyle,
} from './obat.styles';

export function ObatDetailDialog({ item, onClose }: { item: ObatItem | null; onClose: () => void }) {
  if (!item) return null;

  return (
    <div aria-modal="true" role="dialog" style={overlayStyle}>
      <article style={modalStyle}>
        <h2 style={{ fontSize: 24, marginTop: 0 }}>{item.name}</h2>
        <p style={{ color: theme.colors.primary, fontWeight: 800 }}>{item.type}</p>
        <DetailLine label="Aturan pakai" value={item.usage_info || '-'} />
        <DetailLine label="Dosis" value={item.dosage || '-'} />
        <DetailLine label="Frekuensi" value={item.frequency || '-'} />
        {item.side_effects ? <DetailLine label="Efek samping" value={item.side_effects} /> : null}
        {item.notes ? <DetailLine label="Catatan" value={item.notes} /> : null}
        <button onClick={onClose} style={primaryButtonStyle} type="button">
          Tutup
        </button>
      </article>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: theme.spacing.md }}>
      <p style={fieldLabelStyle}>{label}</p>
      <p style={{ lineHeight: 1.6, margin: 0 }}>{value}</p>
    </div>
  );
}

const overlayStyle = {
  alignItems: 'center',
  background: 'rgba(0, 0, 0, 0.45)',
  display: 'flex',
  inset: 0,
  justifyContent: 'center',
  padding: theme.spacing.md,
  position: 'fixed',
  zIndex: 50,
} as const;

const modalStyle = {
  ...panelStyle,
  maxHeight: '90vh',
  maxWidth: 560,
  overflowY: 'auto',
  width: '100%',
} as const;
