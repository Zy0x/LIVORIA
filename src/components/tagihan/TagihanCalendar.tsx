import { useMemo, useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Tagihan } from '@/lib/types';

interface Props {
  data: Tagihan[];
  onSelectDate?: (date: string, items: Tagihan[]) => void;
}

type DayStatus = 'paid' | 'upcoming' | 'due' | 'overdue';

// ─── Helper: get bayar/tempo day from tagihan (new or legacy) ────────────────
function getBayarTempoDay(t: Tagihan): { bayarDay: number; tempoDay: number } | null {
  if (t.tgl_bayar_tanggal && t.tgl_tempo_tanggal) {
    return {
      bayarDay: new Date(t.tgl_bayar_tanggal).getDate(),
      tempoDay: new Date(t.tgl_tempo_tanggal).getDate(),
    };
  }
  if (t.tgl_bayar_hari && t.tgl_tempo_hari) {
    return {
      bayarDay: Number(t.tgl_bayar_hari),
      tempoDay: Number(t.tgl_tempo_hari),
    };
  }
  return null;
}

export default function TagihanCalendar({ data, onSelectDate }: Props) {
  const [current, setCurrent] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const dayMap = useMemo(() => {
    const map: Record<number, { statuses: DayStatus[] }> = {};

    const addDay = (day: number, status: DayStatus) => {
      if (day < 1 || day > daysInMonth) return;
      if (!map[day]) map[day] = { statuses: [] };
      if (!map[day].statuses.includes(status)) map[day].statuses.push(status);
    };

    data.forEach(t => {
      const isLunas = t.status === 'lunas';

      const isPeriodPaid = (() => {
        if (isLunas) return true;
        if (t.jenis_tempo !== 'bulanan') return false;
        const days = getBayarTempoDay(t);
        if (!days) return false;
        const cicilan = Number(t.cicilan_per_bulan);
        if (cicilan <= 0) return false;
        const paidCount = Math.floor(Number(t.total_dibayar) / cicilan);
        const startDate = new Date(t.tanggal_mulai);
        const period = (year * 12 + month) - (startDate.getFullYear() * 12 + startDate.getMonth()) + 1;
        if (period <= 0 || period > t.jangka_waktu_bulan) return true;
        return paidCount >= period;
      })();

      // Recurring monthly
      if (t.jenis_tempo === 'bulanan') {
        const days = getBayarTempoDay(t);
        if (days) {
          const { bayarDay, tempoDay } = days;
          const crossMonth = tempoDay < bayarDay;

          if (isLunas || isPeriodPaid) {
            addDay(bayarDay, 'paid');
            addDay(tempoDay, 'paid');
          } else {
            addDay(tempoDay, 'due');
            if (bayarDay !== tempoDay) {
              if (!crossMonth) {
                // Same month: bayarDay to tempoDay-1 = upcoming
                for (let d = bayarDay; d < tempoDay; d++) addDay(d, 'upcoming');
              } else {
                // Cross month: bayarDay to end of month + start of month to tempoDay-1
                for (let d = bayarDay; d <= daysInMonth; d++) addDay(d, 'upcoming');
                for (let d = 1; d < tempoDay; d++) addDay(d, 'upcoming');
              }
            }
          }
        }
      }

      // Fixed-date tagihan
      if (t.tanggal_jatuh_tempo) {
        const d = new Date(t.tanggal_jatuh_tempo);
        if (d.getFullYear() === year && d.getMonth() === month) {
          if (isLunas) addDay(d.getDate(), 'paid');
          else if (t.status === 'overdue') addDay(d.getDate(), 'overdue');
          else addDay(d.getDate(), 'due');
        }
      }

      // Start date
      if (!isLunas && !isPeriodPaid) {
        const startD = new Date(t.tanggal_mulai);
        if (startD.getFullYear() === year && startD.getMonth() === month) {
          addDay(startD.getDate(), 'upcoming');
        }
      }

      // Payment window for berjangka
      if (t.tanggal_mulai_bayar && !isLunas) {
        const mb = new Date(t.tanggal_mulai_bayar);
        if (mb.getFullYear() === year && mb.getMonth() === month) {
          addDay(mb.getDate(), 'upcoming');
        }
      }
    });

    return map;
  }, [data, year, month, daysInMonth]);

  useEffect(() => {
    if (gridRef.current) {
      gsap.fromTo(gridRef.current.querySelectorAll('.cal-cell'),
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, stagger: 0.01, duration: 0.25, ease: 'power2.out' }
      );
    }
  }, [month, year]);

  const handleDayClick = (day: number) => {
    setSelectedDay(day === selectedDay ? null : day);
    if (onSelectDate) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const items = data.filter(t => {
        if (t.tanggal_jatuh_tempo === dateStr) return true;
        if (t.tanggal_mulai === dateStr) return true;
        if (t.tanggal_mulai_bayar === dateStr) return true;

        if (t.jenis_tempo === 'bulanan' && t.status !== 'lunas') {
          const days = getBayarTempoDay(t);
          if (days) {
            const { bayarDay, tempoDay } = days;
            if (day === tempoDay || day === bayarDay) return true;
            const crossMonth = tempoDay < bayarDay;
            if (!crossMonth) {
              if (day >= bayarDay && day <= tempoDay) return true;
            } else {
              if (day >= bayarDay || day <= tempoDay) return true;
            }
          }
        }
        return false;
      });
      onSelectDate(dateStr, items);
    }
  };

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const statusDotColor: Record<DayStatus, string> = {
    paid: 'bg-success',
    upcoming: 'bg-warning',
    due: 'bg-destructive',
    overdue: 'bg-destructive',
  };

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrent(new Date(year, month - 1))} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-display font-semibold text-sm sm:text-base">{monthNames[month]} {year}</h3>
        <button onClick={() => setCurrent(new Date(year, month + 1))} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div ref={gridRef} className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const info = dayMap[day];
          const selected = selectedDay === day;
          return (
            <button
              key={i}
              onClick={() => handleDayClick(day)}
              className={`cal-cell relative flex flex-col items-center justify-center rounded-lg py-1.5 sm:py-2 text-xs sm:text-sm transition-all min-h-[36px] sm:min-h-[44px]
                ${isToday(day) ? 'bg-primary text-primary-foreground font-bold' : ''}
                ${selected && !isToday(day) ? 'bg-accent ring-2 ring-primary/30' : ''}
                ${!isToday(day) && !selected ? 'hover:bg-muted/50' : ''}
              `}
            >
              <span>{day}</span>
              {info && (
                <div className="flex gap-0.5 mt-0.5">
                  {info.statuses.map((s, idx) => (
                    <span key={idx} className={`w-1.5 h-1.5 rounded-full ${statusDotColor[s]}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mt-3 text-[10px] sm:text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Jatuh Tempo</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> Belum Dibayar</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Lunas/Dibayar</span>
      </div>
    </div>
  );
}