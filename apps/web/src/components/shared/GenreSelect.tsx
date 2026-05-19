import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';

interface Props {
  genres: readonly string[];
  selected: string[];
  onChange: (genres: string[]) => void;
  placeholder?: string;
}

export default function GenreSelect({ genres, selected, onChange, placeholder = 'Pilih genre...' }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [open]);

  const filtered = genres.filter(g => g.toLowerCase().includes(search.toLowerCase()));

  const toggle = (genre: string) => {
    if (selected.includes(genre)) onChange(selected.filter(g => g !== genre));
    else onChange([...selected, genre]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-left flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all min-h-[42px]"
      >
        <div className="flex-1 flex flex-wrap gap-1 min-w-0">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selected.map(g => (
              <span key={g} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                {g}
                <button type="button" onClick={e => { e.stopPropagation(); toggle(g); }} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 animate-scale-in">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari genre..."
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-muted text-xs focus:outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1.5 grid grid-cols-2 gap-0.5">
            {filtered.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => toggle(g)}
                className={`text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  selected.includes(g) ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted text-foreground'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-border">
              <button type="button" onClick={() => onChange([])} className="text-xs text-destructive hover:underline">
                Hapus semua ({selected.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
