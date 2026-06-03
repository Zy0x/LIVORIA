import type { Editor } from '@tiptap/react';

export type FormulaInsertMode = 'inline' | 'block' | 'replace-selection';
export type CatatanCalculationOperation = 'sum' | 'subtract' | 'multiply' | 'divide' | 'average';

export type CatatanCalculationResult = {
  ok: boolean;
  message: string;
};

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

function parseLocalizedNumber(value: string): number | null {
  const clean = value.trim();
  if (!clean) return null;

  const hasComma = clean.includes(',');
  const hasDot = clean.includes('.');
  let normalized = clean;

  if (hasComma && hasDot) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) {
      normalized = clean.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = clean.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = clean.replace(',', '.');
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(clean)) {
    normalized = clean.replace(/\./g, '');
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCalculationNumber(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 6,
  }).format(value);
}

function calculateNumbers(numbers: number[], operation: CatatanCalculationOperation): number | null {
  if (numbers.length === 0) return null;

  switch (operation) {
    case 'sum':
      return numbers.reduce((total, value) => total + value, 0);
    case 'subtract':
      return numbers.slice(1).reduce((total, value) => total - value, numbers[0]);
    case 'multiply':
      return numbers.reduce((total, value) => total * value, 1);
    case 'divide':
      if (numbers.slice(1).some((value) => value === 0)) return null;
      return numbers.slice(1).reduce((total, value) => total / value, numbers[0]);
    case 'average':
      return numbers.reduce((total, value) => total + value, 0) / numbers.length;
    default:
      return null;
  }
}

export function calculateSelectedNumbers(editor: Editor, operation: CatatanCalculationOperation): CatatanCalculationResult {
  const { from, to, empty } = editor.state.selection;
  if (empty) {
    return { ok: false, message: 'Blok angka di isi catatan terlebih dahulu.' };
  }

  const selectedText = editor.state.doc.textBetween(from, to, '\n', '\n');
  const numbers = (selectedText.match(/[-+]?\d[\d.,]*/g) || [])
    .map(parseLocalizedNumber)
    .filter((value): value is number => value !== null);

  if (numbers.length === 0) {
    return { ok: false, message: 'Tidak ada angka valid pada teks yang diblok.' };
  }

  const result = calculateNumbers(numbers, operation);
  if (result === null) {
    return { ok: false, message: 'Perhitungan tidak bisa dilakukan. Periksa pembagi nol atau angka yang dipilih.' };
  }

  const label: Record<CatatanCalculationOperation, string> = {
    sum: 'Jumlah',
    subtract: 'Selisih',
    multiply: 'Perkalian',
    divide: 'Pembagian',
    average: 'Rata-rata',
  };

  editor.chain().focus().insertContentAt(to, `\n${label[operation]} = ${formatCalculationNumber(result)}`).run();
  return { ok: true, message: `${label[operation]}: ${formatCalculationNumber(result)}` };
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
