import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, CheckCircle2, History } from 'lucide-react';
import type { AnimeItem, DonghuaItem } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  newItem: any;
  existingItems: (AnimeItem | DonghuaItem)[];
  mediaType: 'anime' | 'donghua';
}

export default function DuplicateConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  newItem,
  existingItems,
  mediaType,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Data Terdeteksi Duplikat!</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {mediaType === 'anime' ? 'Anime' : 'Donghua'} ini sepertinya sudah ada di database Anda.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-2">
          <div className="space-y-6 pb-6">
            <div className="bg-muted/30 rounded-xl p-4 border border-dashed border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-primary" /> Data yang akan Anda tambahkan:
              </h4>
              <div className="flex gap-4">
                <img 
                  src={newItem.cover_url || '/placeholder.svg'} 
                  alt={newItem.title} 
                  className="w-16 h-24 object-cover rounded-lg border bg-muted"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground line-clamp-1">{newItem.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                    <span>Season {newItem.season}</span>
                    <span>{newItem.episodes || 0} Ep</span>
                    <span>{newItem.status}</span>
                  </div>
                  {newItem.synopsis && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                      {newItem.synopsis}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <History className="w-3 h-3 text-amber-500" /> Data serupa di Database ({existingItems.length}):
              </h4>
              {existingItems.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors">
                  <img 
                    src={item.cover_url || '/placeholder.svg'} 
                    alt={item.title} 
                    className="w-16 h-24 object-cover rounded-lg border opacity-80"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-foreground line-clamp-1">{item.title}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800/50">
                        EXISTING
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span>Season {item.season}</span>
                      <span>{item.episodes || 0} Ep</span>
                      <span>{item.status}</span>
                    </div>
                    {item.synopsis && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-2 leading-relaxed italic">
                        {item.synopsis}
                      </p>
                    )}
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Ditambahkan: {new Date(item.created_at).toLocaleDateString('id-ID')}</span>
                      {(item.mal_id || item.anilist_id) && (
                        <div className="flex gap-2">
                          {item.mal_id && <span className="text-[9px] font-bold text-blue-500">MAL#{item.mal_id}</span>}
                          {item.anilist_id && <span className="text-[9px] font-bold text-violet-500">AL#{item.anilist_id}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-2 bg-muted/20 border-t flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto order-2 sm:order-1">
            Batalkan Penambahan
          </Button>
          <Button onClick={onConfirm} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white gap-2 order-1 sm:order-2">
            Tetap Tambahkan <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
