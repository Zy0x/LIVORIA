import { useState } from 'react';
import { Copy, ExternalLink, PlayCircle, Share2, Link2, CheckCircle2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { openExternalUrl } from '@/lib/external';
import { resolveSmartStreamUrl } from '@/lib/smartStreamingUrl';

type Size = 'sm' | 'md';

interface SmartStreamButtonProps {
  streamingUrl: string;
  episodesWatched?: number | null;
  totalEpisodes?: number | null;
  isMovie?: boolean;
  size?: Size;
  /** Called with the URL that was actually opened, so parent can auto-bump progress if desired. */
  onOpened?: (url: string, wasNext: boolean) => void;
  className?: string;
  labelClassName?: string;
  /** Show text label next to icon (used by dialog/details variants). */
  showLabel?: boolean;
}

async function shareOrCopy(url: string, title: string) {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  if (nav && 'share' in nav && typeof nav.share === 'function') {
    try {
      await nav.share({ title, url });
      return;
    } catch (err) {
      // User cancelled or share failed — fall through to clipboard fallback.
      if ((err as DOMException)?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast({ title: 'Link disalin', description: 'Web Share tidak tersedia — link disalin ke clipboard.' });
  } catch {
    toast({ title: 'Gagal membagikan link', variant: 'destructive' });
  }
}

export function SmartStreamButton({
  streamingUrl,
  episodesWatched,
  totalEpisodes,
  isMovie = false,
  size = 'sm',
  onOpened,
  className,
  labelClassName,
  showLabel = false,
}: SmartStreamButtonProps) {
  const [open, setOpen] = useState(false);
  const resolution = resolveSmartStreamUrl(streamingUrl, episodesWatched, totalEpisodes);
  const hasNext = !isMovie && !!resolution.nextUrl;

  const triggerBase =
    size === 'sm'
      ? 'flex items-center justify-center p-1.5 rounded-lg bg-info/10 text-info hover:bg-info/20 transition-colors min-w-[30px] min-h-[30px]'
      : 'flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-info/10 text-info text-xs font-medium hover:bg-info/20 transition-colors min-h-[44px]';

  const iconClass = size === 'sm' ? 'w-3.5 h-3.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5';

  const openUrl = (url: string, wasNext: boolean) => {
    openExternalUrl(url);
    onOpened?.(url, wasNext);
    setOpen(false);
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link disalin!', description: url.slice(0, 60) });
    } catch {
      toast({ title: 'Gagal menyalin link', variant: 'destructive' });
    }
    setOpen(false);
  };

  const share = async (url: string) => {
    await shareOrCopy(url, isMovie ? 'Tonton Film' : 'Tonton Episode');
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={className || triggerBase}
          aria-label={hasNext ? `Tonton episode ${resolution.nextEpisode}` : 'Buka link streaming'}
          title={hasNext ? `Lanjut ke episode ${resolution.nextEpisode}` : 'Buka link streaming'}
        >
          <ExternalLink className={iconClass} />
          {showLabel && (
            <span className={labelClassName}>{isMovie ? 'Tonton Film' : 'Tonton'}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
        className="w-64"
      >
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Streaming
        </DropdownMenuLabel>

        {hasNext && resolution.nextUrl && resolution.nextEpisode !== null && (
          <>
            <DropdownMenuItem
              onSelect={(e) => { e.preventDefault(); openUrl(resolution.nextUrl!, true); }}
              className="gap-2 py-2 cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 text-info shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold">
                  Lanjut episode {resolution.nextEpisode}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {resolution.detectedEpisode !== null
                    ? `Terakhir tonton ep ${Math.max(resolution.detectedEpisode, episodesWatched || 0)}`
                    : 'Berdasarkan progres tontonan'}
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => { e.preventDefault(); copyUrl(resolution.nextUrl!); }}
              className="gap-2 py-2 cursor-pointer"
            >
              <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs">Salin link ep {resolution.nextEpisode}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => { e.preventDefault(); share(resolution.nextUrl!); }}
              className="gap-2 py-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs">Bagikan ep {resolution.nextEpisode}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {!hasNext && resolution.isFinished && (
          <div className="px-2 py-2 flex items-center gap-2 text-[11px] text-success">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sudah episode terakhir
          </div>
        )}

        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); openUrl(streamingUrl, false); }}
          className="gap-2 py-2 cursor-pointer"
        >
          <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-xs">
            {isMovie ? 'Buka link film' : hasNext ? 'Buka link asli / halaman utama' : 'Buka link streaming'}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); copyUrl(streamingUrl); }}
          className="gap-2 py-2 cursor-pointer"
        >
          <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-xs">Salin link asli</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); share(streamingUrl); }}
          className="gap-2 py-2 cursor-pointer"
        >
          <Share2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-xs">Bagikan link asli</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SmartStreamButton;