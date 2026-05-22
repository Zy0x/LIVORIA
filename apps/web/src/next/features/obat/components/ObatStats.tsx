import type { ObatStats as ObatStatsValue } from '../obat.repository';
import { panelStyle, statLabelStyle, statsGridStyle } from './obat.styles';

export function ObatStats({ stats }: { stats: ObatStatsValue }) {
  return (
    <section style={statsGridStyle}>
      <StatCard label="Total obat" value={stats.totalCount} />
      <StatCard label="Jenis" value={stats.typeCount} />
      <StatCard label="Rutin" value={stats.rutinCount} />
      <StatCard label="Ada efek samping" value={stats.sideEffectCount} />
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article style={panelStyle}>
      <p style={statLabelStyle}>{label}</p>
      <strong style={{ fontSize: 28 }}>{value}</strong>
    </article>
  );
}
