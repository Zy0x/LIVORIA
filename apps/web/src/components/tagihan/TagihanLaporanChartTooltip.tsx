import { formatReportShort as fmtShort } from './tagihan-report-helpers';

interface ChartTooltipPayload {
  color?: string;
  name?: string;
  value?: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string | number;
}

export const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border/80 rounded-xl shadow-xl p-3 text-xs min-w-[120px]">
        <p className="font-semibold text-foreground mb-1.5">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="text-muted-foreground">{p.name}</span>
            </span>
            <span className="font-semibold tabular-nums">{fmtShort(Number(p.value ?? 0))}</span>
          </div>
        ))}
      </div>
    );
  };
