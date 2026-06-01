import type { LucideIcon } from 'lucide-react';

export type RibbonTab = 'home' | 'insert' | 'draw' | 'design' | 'layout' | 'view';
export type DialogType = 'link' | 'formula' | 'table' | 'color' | 'highlight' | 'font' | 'media' | 'symbol' | 'drawing' | 'code';

export type ColorPreset = {
  label: string;
  value: string;
};

export type FormulaTemplate = {
  label: string;
  latex: string;
  category: string;
};

export type SymbolTemplate = {
  label: string;
  symbol: string;
  category: string;
};

export type ToolbarAction = {
  label: string;
  icon: LucideIcon;
  action: string;
  dialog?: DialogType;
};

export const RIBBON_TABS: Array<{ value: RibbonTab; label: string }> = [
  { value: 'home', label: 'Home' },
  { value: 'insert', label: 'Insert' },
  { value: 'draw', label: 'Draw' },
  { value: 'design', label: 'Design' },
  { value: 'layout', label: 'Layout' },
  { value: 'view', label: 'View' },
];

export const HEADING_OPTIONS = [
  { label: 'Paragraph', value: 'paragraph' },
  { label: 'Heading 1', value: '1' },
  { label: 'Heading 2', value: '2' },
  { label: 'Heading 3', value: '3' },
  { label: 'Heading 4', value: '4' },
  { label: 'Heading 5', value: '5' },
  { label: 'Heading 6', value: '6' },
];

export const FONT_FAMILIES = [
  { label: 'Default LIVORIA', value: '' },
  { label: 'Jakarta Sans', value: '"Plus Jakarta Sans", "Inter", sans-serif' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Mono', value: '"JetBrains Mono", "Fira Code", monospace' },
  { label: 'System', value: 'system-ui, sans-serif' },
];

export const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px', '48px'];

export const TEXT_COLOR_PRESETS: ColorPreset[] = [
  { label: 'Default', value: '' },
  { label: 'Sage', value: 'hsl(var(--primary))' },
  { label: 'Biru', value: 'hsl(var(--info))' },
  { label: 'Kuning', value: 'hsl(var(--warning))' },
  { label: 'Merah', value: 'hsl(var(--destructive))' },
  { label: 'Violet', value: '#a855f7' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Slate', value: '#64748b' },
];

export const HIGHLIGHT_PRESETS: ColorPreset[] = [
  { label: 'Kuning lembut', value: '#fde68a' },
  { label: 'Hijau mint', value: '#bbf7d0' },
  { label: 'Biru langit', value: '#bfdbfe' },
  { label: 'Pink', value: '#fecdd3' },
  { label: 'Violet', value: '#ddd6fe' },
  { label: 'Amber', value: '#fed7aa' },
];

export const BULLET_STYLES = [
  { label: 'Disc', value: 'disc' },
  { label: 'Circle', value: 'circle' },
  { label: 'Square', value: 'square' },
  { label: 'Dash', value: '"- "' },
  { label: 'Arrow', value: '"→ "' },
  { label: 'Check', value: '"✓ "' },
  { label: 'Diamond', value: '"◆ "' },
];

export const ORDERED_STYLES = [
  { label: '1, 2, 3', value: 'decimal' },
  { label: 'a, b, c', value: 'lower-alpha' },
  { label: 'A, B, C', value: 'upper-alpha' },
  { label: 'i, ii, iii', value: 'lower-roman' },
  { label: 'I, II, III', value: 'upper-roman' },
];

export const CODE_LANGUAGES = [
  'auto',
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'html',
  'css',
  'json',
  'sql',
  'bash',
  'python',
  'dart',
  'java',
  'kotlin',
  'php',
  'go',
  'rust',
];

export const FORMULA_TEMPLATES: FormulaTemplate[] = [
  { category: 'Algebra', label: 'Persamaan Kuadrat', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { category: 'Algebra', label: 'Faktorisasi', latex: 'a^2 - b^2 = (a-b)(a+b)' },
  { category: 'Calculus', label: 'Turunan', latex: '\\frac{d}{dx} f(x)' },
  { category: 'Calculus', label: 'Integral', latex: '\\int_a^b f(x)\\,dx' },
  { category: 'Calculus', label: 'Limit', latex: '\\lim_{x \\to a} f(x)' },
  { category: 'Trigonometry', label: 'Identitas Pythagoras', latex: '\\sin^2\\theta + \\cos^2\\theta = 1' },
  { category: 'Trigonometry', label: 'Sin Jumlah', latex: '\\sin(a+b)=\\sin a\\cos b+\\cos a\\sin b' },
  { category: 'Statistics', label: 'Rata-rata', latex: '\\bar{x}=\\frac{1}{n}\\sum_{i=1}^{n}x_i' },
  { category: 'Statistics', label: 'Variansi', latex: '\\sigma^2=\\frac{1}{n}\\sum_{i=1}^{n}(x_i-\\mu)^2' },
  { category: 'Geometry', label: 'Lingkaran', latex: 'A=\\pi r^2' },
  { category: 'Geometry', label: 'Volume Bola', latex: 'V=\\frac{4}{3}\\pi r^3' },
  { category: 'Matrix', label: 'Matrix 2x2', latex: '\\begin{bmatrix}a & b\\\\c & d\\end{bmatrix}' },
  { category: 'Logic', label: 'Implikasi', latex: 'p \\Rightarrow q' },
  { category: 'Finance', label: 'Bunga Majemuk', latex: 'A=P\\left(1+\\frac{r}{n}\\right)^{nt}' },
  { category: 'Finance', label: 'Present Value', latex: 'PV=\\frac{FV}{(1+r)^n}' },
];

export const SYMBOL_TEMPLATES: SymbolTemplate[] = [
  { category: 'Math', label: 'Pi', symbol: 'π' },
  { category: 'Math', label: 'Sigma', symbol: 'Σ' },
  { category: 'Math', label: 'Integral', symbol: '∫' },
  { category: 'Math', label: 'Infinity', symbol: '∞' },
  { category: 'Currency', label: 'Rupiah', symbol: 'Rp' },
  { category: 'Currency', label: 'Yen', symbol: '¥' },
  { category: 'Currency', label: 'Euro', symbol: '€' },
  { category: 'Arrows', label: 'Right', symbol: '→' },
  { category: 'Arrows', label: 'Left', symbol: '←' },
  { category: 'Arrows', label: 'Up', symbol: '↑' },
  { category: 'Arrows', label: 'Down', symbol: '↓' },
  { category: 'Greek', label: 'Alpha', symbol: 'α' },
  { category: 'Greek', label: 'Beta', symbol: 'β' },
  { category: 'Greek', label: 'Delta', symbol: 'Δ' },
  { category: 'Punctuation', label: 'Check', symbol: '✓' },
  { category: 'Punctuation', label: 'Warning', symbol: '⚠' },
];
