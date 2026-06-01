import { useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import katex from 'katex';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FORMULA_TEMPLATES } from './catatan-editor-presets';
import { insertCatatanFormula, type FormulaInsertMode } from './catatan-editor.commands';

type CatatanFormulaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
};

const MODES: Array<{ value: FormulaInsertMode; label: string }> = [
  { value: 'inline', label: 'Inline' },
  { value: 'block', label: 'Block' },
  { value: 'replace-selection', label: 'Render Pilihan' },
];

export function CatatanFormulaDialog({ open, onOpenChange, editor }: CatatanFormulaDialogProps) {
  const [latex, setLatex] = useState('E = mc^2');
  const [mode, setMode] = useState<FormulaInsertMode>('inline');
  const [category, setCategory] = useState('Algebra');

  useEffect(() => {
    if (!open || !editor) return;
    const { from, to } = editor.state.selection;
    const selected = from !== to ? editor.state.doc.textBetween(from, to, '\n').replace(/^\$+|\$+$/g, '').trim() : '';
    if (selected) {
      setLatex(selected);
      setMode('replace-selection');
    }
  }, [editor, open]);

  const categories = useMemo(() => Array.from(new Set(FORMULA_TEMPLATES.map((item) => item.category))), []);
  const preview = useMemo(() => {
    try {
      return katex.renderToString(latex || '\\square', { throwOnError: false, strict: false, displayMode: mode === 'block' });
    } catch {
      return '<span>Formula belum valid.</span>';
    }
  }, [latex, mode]);

  const apply = () => {
    if (!editor) return;
    insertCatatanFormula(editor, latex, mode);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(58rem,calc(100vw-1rem))]">
        <DialogHeader>
          <DialogTitle>Formula Matematika</DialogTitle>
          <DialogDescription>Pilih template atau tulis LaTeX sendiri. Formula dirender langsung dengan KaTeX.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <aside className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${category === item ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="max-h-[18rem] space-y-2 overflow-y-auto pr-1">
              {FORMULA_TEMPLATES.filter((item) => item.category === category).map((item) => (
                <button
                  key={`${item.category}-${item.label}`}
                  type="button"
                  onClick={() => setLatex(item.latex)}
                  className="w-full rounded-lg border border-border bg-background p-2 text-left text-xs font-semibold hover:border-primary/50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>
          <section className="min-w-0 space-y-3">
            <div className="flex flex-wrap gap-2">
              {MODES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMode(item.value)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === item.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <textarea
              value={latex}
              onChange={(event) => setLatex(event.target.value)}
              className="min-h-[130px] w-full rounded-xl border border-input bg-background p-3 font-mono text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="min-h-[90px] overflow-x-auto rounded-xl border border-border bg-card p-4 text-center" dangerouslySetInnerHTML={{ __html: preview }} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
                Batal
              </button>
              <button type="button" onClick={apply} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                Masukkan Formula
              </button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
