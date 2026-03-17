import { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { Download, Upload, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { exportToJSON, exportToCSV, importFromJSON, importFromCSV } from '@/lib/import-export';

interface ExportOption {
  label: string;
  icon: typeof FileJson;
  onClick: () => void;
}

interface Props {
  data: any[];
  filename: string;
  onImport?: (items: any[]) => Promise<void>;
  extraExports?: ExportOption[];
  importAccept?: string;
}

export default function ExportMenu({ data, filename, onImport, extraExports, importAccept = '.json,.csv' }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        gsap.to(menuRef.current, {
          opacity: 0, y: -6, scale: 0.95, duration: 0.15, ease: 'power2.in',
          onComplete: () => setOpen(false),
        });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && menuRef.current) {
      gsap.fromTo(menuRef.current,
        { opacity: 0, y: -8, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'back.out(2)' }
      );
    }
  }, [open]);

  const handleToggle = () => {
    if (open && menuRef.current) {
      gsap.to(menuRef.current, {
        opacity: 0, y: -6, scale: 0.95, duration: 0.15, ease: 'power2.in',
        onComplete: () => setOpen(false),
      });
    } else {
      setOpen(true);
    }
  };

  const handleImport = async (file: File) => {
    if (!onImport) return;
    try {
      let items: any[];
      if (file.name.endsWith('.json')) items = await importFromJSON(file);
      else items = await importFromCSV(file);
      await onImport(items);
    } catch (e: any) {
      throw e;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={containerRef}>
        <button onClick={handleToggle}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-accent transition-all">
          <Download className="w-4 h-4" /> Ekspor
        </button>
        {open && (
          <div ref={menuRef} className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
            <button onClick={() => { exportToJSON(data, filename); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
              <FileJson className="w-4 h-4" /> JSON
            </button>
            <button onClick={() => { exportToCSV(data, filename); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
              <FileSpreadsheet className="w-4 h-4" /> CSV
            </button>
            {extraExports?.map((opt, i) => (
              <button key={i} onClick={() => { opt.onClick(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
                <opt.icon className="w-4 h-4" /> {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {onImport && (
        <>
          <button onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-accent transition-all">
            <Upload className="w-4 h-4" /> Impor
          </button>
          <input ref={fileRef} type="file" accept={importAccept} className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleImport(e.target.files[0]); e.target.value = ''; }} />
        </>
      )}
    </div>
  );
}
