import type { Editor } from '@tiptap/react';

export type FormulaInsertMode = 'inline' | 'block' | 'replace-selection';

export function normalizeCatatanUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return '';
  if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return `mailto:${raw}`;
  if (/^\+?[0-9][0-9\s-]{6,}$/.test(raw)) return `tel:${raw.replace(/\s+/g, '')}`;
  return `https://${raw}`;
}

export function applyCatatanLink(editor: Editor, input: { url: string; label?: string }): void {
  const href = normalizeCatatanUrl(input.url);
  if (!href) {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }

  const label = input.label?.trim();
  if (label) {
    editor.chain().focus().insertContent({
      type: 'text',
      text: label,
      marks: [{ type: 'link', attrs: { href } }],
    }).run();
    return;
  }

  editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
}

export function insertCatatanFormula(editor: Editor, latex: string, mode: FormulaInsertMode): void {
  const clean = latex.trim();
  if (!clean) return;

  if (mode === 'block') {
    editor.chain().focus().insertBlockMath({ latex: clean }).run();
    return;
  }

  if (mode === 'replace-selection') {
    editor.chain().focus().deleteSelection().insertInlineMath({ latex: clean }).run();
    return;
  }

  editor.chain().focus().insertInlineMath({ latex: clean }).run();
}

export function setCatatanFontSize(editor: Editor, fontSize: string): void {
  const clean = fontSize.trim();
  if (!clean) {
    editor.chain().focus().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
    return;
  }
  editor.chain().focus().setMark('textStyle', { fontSize: clean }).run();
}

export function insertTabText(editor: Editor): void {
  editor.chain().focus().insertContent('\t').run();
}

export function insertCatatanTable(editor: Editor, input: {
  rows: number;
  cols: number;
  withHeaderRow: boolean;
  style: string;
}): void {
  const rows = Math.min(Math.max(input.rows, 1), 30);
  const cols = Math.min(Math.max(input.cols, 1), 20);
  editor.chain().focus().insertTable({
    rows,
    cols,
    withHeaderRow: input.withHeaderRow,
  }).updateAttributes('table', { tableStyle: input.style }).run();
}

export function insertCatatanVideo(editor: Editor, input: {
  src: string;
  title?: string;
  objectPath?: string;
  assetId?: string;
}): void {
  editor.chain().focus().insertContent({
    type: 'catatanVideo',
    attrs: input,
  }).run();
}

export function insertCatatanDrawing(editor: Editor, input: { svg: string; title: string }): void {
  editor.chain().focus().insertContent({
    type: 'catatanDrawing',
    attrs: input,
  }).run();
}
