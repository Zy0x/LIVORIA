import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DashboardChartsProps {
  monthlyProfitData: Array<Record<string, unknown>>;
  cashflowProjection: Array<Record<string, unknown>>;
  fmt: (value: number) => string;
  fmtShort: (value: number) => string;
}

export default function DashboardCharts({
  monthlyProfitData,
  cashflowProjection,
  fmt,
  fmtShort,
}: DashboardChartsProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {fmt(p.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-border/50">
      <div className="rounded-xl bg-muted/20 border border-border/50 p-4">
        <p className="section-subtitle mb-3">Keuntungan & Cicilan (6 Bln)</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyProfitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={44} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="keuntungan" name="Keuntungan" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 2.5 }} />
              <Line type="monotone" dataKey="cicilan" name="Cicilan" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2.5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-xl bg-muted/20 border border-border/50 p-4">
        <p className="section-subtitle mb-3">Proyeksi Cashflow (6 Bln ke Depan)</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashflowProjection}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={44} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="masuk" name="Est. Pemasukan" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

