import { CalendarDays, PlayCircle } from 'lucide-react';

import type { AnimeItem, DonghuaItem } from '@/lib/types';
import { DashboardMediaScheduleCard } from './DashboardMediaScheduleCard';

type ScheduleView = 'hari-ini' | 'mingguan';
type MediaScheduleItems = {
  anime: AnimeItem[];
  donghua: DonghuaItem[];
};

interface ScheduleSectionProps {
  hasTodayContent: boolean;
  hasWeeklyContent: boolean;
  scheduleView: ScheduleView;
  setScheduleView: (view: ScheduleView) => void;
  dayLabels: Record<string, string>;
  todayDay: string;
  todayItems: MediaScheduleItems;
  dayOrder: string[];
  weeklySchedule: Record<string, MediaScheduleItems>;
  openDetail: (item: AnimeItem | DonghuaItem, type: 'anime' | 'donghua') => void;
  copyLink: (url: string) => void;
}

export function ScheduleSection({
  hasTodayContent,
  hasWeeklyContent,
  scheduleView,
  setScheduleView,
  dayLabels,
  todayDay,
  todayItems,
  dayOrder,
  weeklySchedule,
  openDetail,
  copyLink,
}: ScheduleSectionProps) {
  if (!hasTodayContent && !hasWeeklyContent) {
    return null;
  }

  return (
    <section className="dash-section rounded-2xl bg-card border border-border/50 p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-info" />
          <h2 className="section-title">Jadwal Tayang</h2>
        </div>
        <div className="flex gap-1">
          {(['hari-ini', 'mingguan'] as const).map(view => (
            <button
              key={view}
              onClick={() => setScheduleView(view)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all min-h-[36px] ${
                scheduleView === view
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {view === 'hari-ini' ? 'Hari Ini' : 'Mingguan'}
            </button>
          ))}
        </div>
      </div>

      {scheduleView === 'hari-ini' ? (
        <TodaySchedule
          dayLabels={dayLabels}
          todayDay={todayDay}
          todayItems={todayItems}
          hasTodayContent={hasTodayContent}
          openDetail={openDetail}
          copyLink={copyLink}
        />
      ) : (
        <WeeklySchedule
          dayLabels={dayLabels}
          todayDay={todayDay}
          dayOrder={dayOrder}
          weeklySchedule={weeklySchedule}
          openDetail={openDetail}
          copyLink={copyLink}
        />
      )}
    </section>
  );
}

interface TodayScheduleProps {
  dayLabels: Record<string, string>;
  todayDay: string;
  todayItems: MediaScheduleItems;
  hasTodayContent: boolean;
  openDetail: ScheduleSectionProps['openDetail'];
  copyLink: ScheduleSectionProps['copyLink'];
}

function TodaySchedule({
  dayLabels,
  todayDay,
  todayItems,
  hasTodayContent,
  openDetail,
  copyLink,
}: TodayScheduleProps) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        {dayLabels[todayDay]} &mdash;{' '}
        {hasTodayContent
          ? `${todayItems.anime.length + todayItems.donghua.length} judul tayang hari ini`
          : 'Tidak ada jadwal hari ini'}
      </p>
      {hasTodayContent ? (
        <div className="space-y-2">
          {todayItems.anime.length > 0 && (
            <>
              <p className="section-subtitle mb-2">Anime</p>
              <div className="space-y-2">
                {todayItems.anime.map(item => (
                  <DashboardMediaScheduleCard
                    key={item.id}
                    item={item}
                    type="anime"
                    onOpenDetail={openDetail}
                    onCopyLink={copyLink}
                  />
                ))}
              </div>
            </>
          )}
          {todayItems.donghua.length > 0 && (
            <div className={todayItems.anime.length > 0 ? 'mt-3' : ''}>
              <p className="section-subtitle mb-2">Donghua</p>
              <div className="space-y-2">
                {todayItems.donghua.map(item => (
                  <DashboardMediaScheduleCard
                    key={item.id}
                    item={item}
                    type="donghua"
                    onOpenDetail={openDetail}
                    onCopyLink={copyLink}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <PlayCircle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Tidak ada anime/donghua tayang hari ini.</p>
        </div>
      )}
    </div>
  );
}

interface WeeklyScheduleProps {
  dayLabels: Record<string, string>;
  todayDay: string;
  dayOrder: string[];
  weeklySchedule: Record<string, MediaScheduleItems>;
  openDetail: ScheduleSectionProps['openDetail'];
  copyLink: ScheduleSectionProps['copyLink'];
}

function WeeklySchedule({
  dayLabels,
  todayDay,
  dayOrder,
  weeklySchedule,
  openDetail,
  copyLink,
}: WeeklyScheduleProps) {
  return (
    <div className="space-y-3">
      {dayOrder.map(day => {
        const items = weeklySchedule[day];
        const total = items.anime.length + items.donghua.length;
        if (total === 0) return null;

        const isToday = day === todayDay;
        return (
          <div
            key={day}
            className={`rounded-xl p-3 ${
              isToday
                ? 'bg-primary/5 border border-primary/20'
                : 'bg-muted/30 border border-border/50'
            }`}
          >
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
              {dayLabels[day]}{isToday && ' (Hari Ini)'}
            </p>
            <div className="space-y-1.5">
              {items.anime.map(item => (
                <DashboardMediaScheduleCard
                  key={item.id}
                  item={item}
                  type="anime"
                  onOpenDetail={openDetail}
                  onCopyLink={copyLink}
                />
              ))}
              {items.donghua.map(item => (
                <DashboardMediaScheduleCard
                  key={item.id}
                  item={item}
                  type="donghua"
                  onOpenDetail={openDetail}
                  onCopyLink={copyLink}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
