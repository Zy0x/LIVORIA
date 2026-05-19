import type { WaifuTier, WaifuTierFilter } from '../types/waifu.types';
import { WAIFU_TIER_COLORS, WAIFU_TIERS } from '../types/waifu.types';

type WaifuStatsProps = {
  tierStats: Record<WaifuTier, number>;
  tierFilter: WaifuTierFilter;
  onTierFilterChange: (tier: WaifuTierFilter) => void;
};

export function WaifuStats({ tierStats, tierFilter, onTierFilterChange }: WaifuStatsProps) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
      {WAIFU_TIERS.map((tier) => (
        <button
          key={tier}
          onClick={() => onTierFilterChange(tierFilter === tier ? 'all' : tier)}
          className={`stat-card text-center p-3 sm:p-4 transition-all ${tierFilter === tier ? 'ring-2 ring-primary' : ''}`}
        >
          <span
            className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm mb-1 ${WAIFU_TIER_COLORS[tier]}`}
          >
            {tier}
          </span>
          <p className="text-base sm:text-lg font-bold font-display">{tierStats[tier]}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Tier {tier}</p>
        </button>
      ))}
    </div>
  );
}
