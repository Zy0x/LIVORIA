import { useEffect, useMemo, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mathematics from '@tiptap/extension-mathematics';
import { TableKit } from '@tiptap/extension-table';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Typography from '@tiptap/extension-typography';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  CheckSquare,
  ClipboardCopy,
  Code2,
  CornerDownLeft,
  Eraser,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Rows3,
  Quote,
  Redo2,
  Sigma,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table2,
  Trash2,
  Type,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';

import type { CatatanDocument } from '../domain/catatan-content';
import { catatanDocumentToMarkdown, catatanDocumentToPlainText, normalizeCatatanDocument } from '../domain/catatan-content';

type CatatanRichEditorProps = {
  value: CatatanDocument;
  onChange: (document: CatatanDocument, plainText: string) => void;
};

type ToolbarButton = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: () => boolean;
  disabled?: () => boolean;
  onClick: () => void;
};

export function CatatanRichEditor({ value, onChange }: CatatanRichEditorProps) {
  const lastJsonRef = useRef(JSON.stringify(value));

  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Typography,
    TextStyle,
    Color,
    Link.configure({
      autolink: true,
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary underline underline-offset-2',
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      },
    }),
    Placeholder.configure({
      placeholder: 'Tulis catatan panjangmu di sini...',
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight.configure({ multicolor: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Subscript,
    Superscript,
    TableKit.configure({
      table: { resizable: true },
    }),
    Mathematics.configure({
      katexOptions: {
        throwOnError: false,
        strict: false,
      },
    }),
    Underline,
    CharacterCount.configure({ limit: 20000 }),
  ], []);

  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'catatan-rich-editor min-h-[240px] px-3 py-3 text-sm leading-relaxed text-foreground outline-none sm:min-h-[320px]',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const document = normalizeCatatanDocument(currentEditor.getJSON());
      const serialized = JSON.stringify(document);
      lastJsonRef.current = serialized;
      onChange(document, catatanDocumentToPlainText(document));
    },
  });

  useEffect(() => {
    if (!editor) return;
    const serialized = JSON.stringify(value);
    if (serialized === lastJsonRef.current) return;
    lastJsonRef.current = serialized;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="min-h-[280px] rounded-xl border border-input bg-background p-4 text-sm text-muted-foreground">
        Memuat editor...
      </div>
    );
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Masukkan URL tautan', previousUrl || 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const copyMarkdown = async () => {
    const markdown = catatanDocumentToMarkdown(normalizeCatatanDocument(editor.getJSON()));
    try {
      await navigator.clipboard.writeText(markdown || catatanDocumentToPlainText(normalizeCatatanDocument(editor.getJSON())));
    } catch {
      window.prompt('Salin teks ini', markdown);
    }
  };

  const insertInlineFormula = () => {
    const latex = window.prompt('Formula inline LaTeX', 'E = mc^2');
    if (!latex?.trim()) return;
    editor.chain().focus().insertInlineMath({ latex: latex.trim() }).run();
  };

  const insertBlockFormula = () => {
    const latex = window.prompt('Formula blok LaTeX', '\\\\sum_{i=1}^{n} x_i');
    if (!latex?.trim()) return;
    editor.chain().focus().insertBlockMath({ latex: latex.trim() }).run();
  };

  const renderSelectedFormula = () => {
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, '\n').trim();
    const latex = selected.replace(/^\$+|\$+$/g, '').trim() || window.prompt('Formula LaTeX yang ingin dirender', 'x^2 + y^2 = z^2');
    if (!latex?.trim()) return;
    editor.chain().focus().deleteSelection().insertInlineMath({ latex: latex.trim() }).run();
  };

  const setTextColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
  };

  const buttons: ToolbarButton[] = [
    { label: 'Paragraf', icon: Pilcrow, active: () => editor.isActive('paragraph'), onClick: () => editor.chain().focus().setParagraph().run() },
    { label: 'Heading 1', icon: Heading1, active: () => editor.isActive('heading', { level: 1 }), onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'Heading 2', icon: Heading2, active: () => editor.isActive('heading', { level: 2 }), onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Bold', icon: Bold, active: () => editor.isActive('bold'), onClick: () => editor.chain().focus().toggleBold().run() },
    { label: 'Italic', icon: Italic, active: () => editor.isActive('italic'), onClick: () => editor.chain().focus().toggleItalic().run() },
    { label: 'Underline', icon: UnderlineIcon, active: () => editor.isActive('underline'), onClick: () => editor.chain().focus().toggleUnderline().run() },
    { label: 'Strike', icon: Strikethrough, active: () => editor.isActive('strike'), onClick: () => editor.chain().focus().toggleStrike().run() },
    { label: 'Superscript', icon: SuperscriptIcon, active: () => editor.isActive('superscript'), onClick: () => editor.chain().focus().toggleSuperscript().run() },
    { label: 'Subscript', icon: SubscriptIcon, active: () => editor.isActive('subscript'), onClick: () => editor.chain().focus().toggleSubscript().run() },
    { label: 'Highlight', icon: Highlighter, active: () => editor.isActive('highlight'), onClick: () => editor.chain().focus().toggleHighlight().run() },
    { label: 'Bullet list', icon: List, active: () => editor.isActive('bulletList'), onClick: () => editor.chain().focus().toggleBulletList().run() },
    { label: 'Numbered list', icon: ListOrdered, active: () => editor.isActive('orderedList'), onClick: () => editor.chain().focus().toggleOrderedList().run() },
    { label: 'Checklist', icon: CheckSquare, active: () => editor.isActive('taskList'), onClick: () => editor.chain().focus().toggleTaskList().run() },
    { label: 'Quote', icon: Quote, active: () => editor.isActive('blockquote'), onClick: () => editor.chain().focus().toggleBlockquote().run() },
    { label: 'Code block', icon: Code2, active: () => editor.isActive('codeBlock'), onClick: () => editor.chain().focus().toggleCodeBlock().run() },
    { label: 'Link', icon: Link2, active: () => editor.isActive('link'), onClick: setLink },
    { label: 'Baris baru', icon: CornerDownLeft, onClick: () => editor.chain().focus().setHardBreak().run() },
    { label: 'Garis pemisah', icon: Minus, onClick: () => editor.chain().focus().setHorizontalRule().run() },
    { label: 'Formula inline', icon: Sigma, onClick: insertInlineFormula },
    { label: 'Formula blok', icon: Braces, onClick: insertBlockFormula },
    { label: 'Render pilihan jadi formula', icon: Type, onClick: renderSelectedFormula },
    { label: 'Tabel 3x3', icon: Table2, onClick: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { label: 'Tambah baris tabel', icon: Rows3, disabled: () => !editor.isActive('table'), onClick: () => editor.chain().focus().addRowAfter().run() },
    { label: 'Hapus tabel', icon: Trash2, disabled: () => !editor.isActive('table'), onClick: () => editor.chain().focus().deleteTable().run() },
    { label: 'Align left', icon: AlignLeft, active: () => editor.isActive({ textAlign: 'left' }), onClick: () => editor.chain().focus().setTextAlign('left').run() },
    { label: 'Align center', icon: AlignCenter, active: () => editor.isActive({ textAlign: 'center' }), onClick: () => editor.chain().focus().setTextAlign('center').run() },
    { label: 'Align right', icon: AlignRight, active: () => editor.isActive({ textAlign: 'right' }), onClick: () => editor.chain().focus().setTextAlign('right').run() },
    { label: 'Clear format', icon: Eraser, onClick: () => editor.chain().focus().unsetAllMarks().clearNodes().run() },
    { label: 'Copy Markdown', icon: ClipboardCopy, onClick: () => { void copyMarkdown(); } },
    { label: 'Undo', icon: Undo2, disabled: () => !editor.can().undo(), onClick: () => editor.chain().focus().undo().run() },
    { label: 'Redo', icon: Redo2, disabled: () => !editor.can().redo(), onClick: () => editor.chain().focus().redo().run() },
  ];
  const colorButtons = [
    { label: 'Teks hijau', color: 'hsl(var(--primary))' },
    { label: 'Teks biru', color: 'hsl(var(--info))' },
    { label: 'Teks kuning', color: 'hsl(var(--warning))' },
    { label: 'Teks merah', color: 'hsl(var(--destructive))' },
  ];

  return (
    <div className="rounded-[18px] border border-input bg-background p-1 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
      <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto overscroll-x-contain rounded-t-[14px] border-b border-border bg-card/95 p-1.5 backdrop-blur touch-pan-x">
        {buttons.map((button) => {
          const Icon = button.icon;
          const active = button.active?.() ?? false;
          const disabled = button.disabled?.() ?? false;
          return (
            <button
              key={button.label}
              type="button"
              onClick={button.onClick}
              disabled={disabled}
              className={`inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-xl border text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 ${
                active ? 'border-primary bg-primary/15 text-primary' : 'border-transparent'
              }`}
              title={button.label}
              aria-label={button.label}
              aria-pressed={active}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
        <div className="mx-1 h-10 w-px shrink-0 bg-border" />
        {colorButtons.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setTextColor(item.color)}
            className="inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-transparent hover:border-primary/40 hover:bg-primary/10"
            title={item.label}
            aria-label={item.label}
          >
            <span className="h-4 w-4 rounded-full border border-white/30 shadow-sm" style={{ background: item.color }} />
          </button>
        ))}
      </div>

      <EditorContent editor={editor} />

      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        <span>{editor.storage.characterCount.words()} kata</span>
        <span>{editor.storage.characterCount.characters()}/20000 karakter</span>
      </div>
    </div>
  );
}
