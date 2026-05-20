import { WAIFU_TIERS } from '@livoria/core';
import { theme } from '../../../lib/theme';
import type { WaifuQuery } from '../waifu.repository';

export function WaifuFilterBar({ query }: { query: WaifuQuery }) {
  return (
    <section style={panelStyle}>
      <form action="/waifu" style={gridStyle}>
        <label style={fieldStyle}>
          <span style={labelStyle}>Cari</span>
          <input defaultValue={query.search} name="search" placeholder="Nama, sumber, atau catatan" style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle}>Tier</span>
          <select defaultValue={query.tier} name="tier" style={inputStyle}>
            <option value="all">Semua tier</option>
            {WAIFU_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                Tier {tier}
              </option>
            ))}
          </select>
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle}>Tipe sumber</span>
          <select defaultValue={query.sourceType} name="sourceType" style={inputStyle}>
            <option value="all">Semua sumber</option>
            <option value="anime">Anime</option>
            <option value="donghua">Donghua</option>
          </select>
        </label>
        <button style={buttonStyle} type="submit">
          Terapkan
        </button>
      </form>
    </section>
  );
}

const panelStyle = {
  background: theme.colors.card,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 12,
  marginTop: theme.spacing.md,
  padding: theme.spacing.lg,
} as const;

const gridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
} as const;

const fieldStyle = {
  display: 'grid',
  gap: 6,
} as const;

const labelStyle = {
  color: theme.colors.muted,
  fontSize: 13,
  fontWeight: 800,
} as const;

const inputStyle = {
  background: theme.colors.background,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 8,
  color: theme.colors.foreground,
  font: 'inherit',
  padding: '10px 12px',
} as const;

const buttonStyle = {
  alignSelf: 'end',
  background: theme.colors.primary,
  border: 0,
  borderRadius: 8,
  color: theme.colors.primaryForeground,
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 800,
  padding: '11px 14px',
} as const;
