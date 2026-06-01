import type { Editor } from '@tiptap/react';
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
  FileImage,
  Heading,
  Highlighter,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Redo2,
  Rows3,
  Shapes,
  Sigma,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  Trash2,
  Type,
  Underline,
  Undo2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BULLET_STYLES, HEADING_OPTIONS, ORDERED_STYLES, RIBBON_TABS, type DialogType, type RibbonTab } from './catatan-editor-presets';
import { insertTabText } from './catatan-editor.commands';

type CatatanEditorRibbonProps = {
  editor: Editor;
  activeTab: RibbonTab;
  onActiveTabChange: (tab: RibbonTab) => void;
  onOpenDialog: (dialog: DialogType) => void;
  onCopyMarkdown: () => void;
};

type RibbonButtonProps = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function RibbonButton({ label, icon: Icon, active = false, disabled = false, onClick }: RibbonButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 min-w-10 touch-manipulation items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'border-primary bg-primary/15 text-primary' : 'border-transparent text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-foreground'
      }`}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

function RibbonGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-[10rem] rounded-xl border border-border bg-background/60 p-2">
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
      <p className="mt-1.5 truncate text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
    </section>
  );
}

export function CatatanEditorRibbon({ editor, activeTab, onActiveTabChange, onOpenDialog, onCopyMarkdown }: CatatanEditorRibbonProps) {
  const setHeading = (value: string) => {
    if (value === 'paragraph') editor.chain().focus().setParagraph().run();
    else editor.chain().focus().toggleHeading({ level: Number(value) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
  };

  const selectedHeading = editor.isActive('heading')
    ? String(editor.getAttributes('heading').level || '1')
    : 'paragraph';

  return (
    <Tabs value={activeTab} onValueChange={(value) => onActiveTabChange(value as RibbonTab)} className="rounded-t-[16px] border-b border-border bg-card/95 backdrop-blur">
      <div className="overflow-x-auto border-b border-border/70 px-2 pt-2">
        <TabsList className="h-auto justify-start gap-1 bg-transparent p-0">
          {RIBBON_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="rounded-t-lg rounded-b-none px-3 py-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="home" className="m-0 overflow-x-auto p-2">
        <div className="flex min-w-max flex-wrap gap-2">
          <RibbonGroup title="Clipboard">
            <RibbonButton label="Copy Markdown" icon={ClipboardCopy} onClick={onCopyMarkdown} />
            <RibbonButton label="Undo" icon={Undo2} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
            <RibbonButton label="Redo" icon={Redo2} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />
          </RibbonGroup>
          <RibbonGroup title="Font">
            <RibbonButton label="Font" icon={Type} onClick={() => onOpenDialog('font')} />
            <RibbonButton label="Color" icon={Palette} onClick={() => onOpenDialog('color')} />
            <RibbonButton label="Highlight" icon={Highlighter} active={editor.isActive('highlight')} onClick={() => onOpenDialog('highlight')} />
            <RibbonButton label="Bold" icon={Bold} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
            <RibbonButton label="Italic" icon={Italic} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
            <RibbonButton label="Underline" icon={Underline} active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
            <RibbonButton label="Strike" icon={Strikethrough} active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
            <RibbonButton label="Sup" icon={Superscript} active={editor.isActive('superscript')} onClick={() => editor.chain().focus().toggleSuperscript().run()} />
            <RibbonButton label="Sub" icon={Subscript} active={editor.isActive('subscript')} onClick={() => editor.chain().focus().toggleSubscript().run()} />
          </RibbonGroup>
          <RibbonGroup title="Paragraph">
            <Select value={selectedHeading} onValueChange={setHeading}>
              <SelectTrigger className="h-10 w-[132px] text-xs font-bold">
                <Heading className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HEADING_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <RibbonButton label="Left" icon={AlignLeft} active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} />
            <RibbonButton label="Center" icon={AlignCenter} active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} />
            <RibbonButton label="Right" icon={AlignRight} active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} />
            <RibbonButton label="Bullet" icon={List} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
            <RibbonButton label="Number" icon={ListOrdered} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
            <RibbonButton label="Checklist" icon={CheckSquare} active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} />
            <RibbonButton label="Quote" icon={Quote} active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
          </RibbonGroup>
        </div>
      </TabsContent>

      <TabsContent value="insert" className="m-0 overflow-x-auto p-2">
        <div className="flex min-w-max flex-wrap gap-2">
          <RibbonGroup title="Objects">
            <RibbonButton label="Link" icon={Link2} active={editor.isActive('link')} onClick={() => onOpenDialog('link')} />
            <RibbonButton label="Media" icon={ImageIcon} onClick={() => onOpenDialog('media')} />
            <RibbonButton label="Symbol" icon={Sigma} onClick={() => onOpenDialog('symbol')} />
            <RibbonButton label="Formula" icon={Braces} onClick={() => onOpenDialog('formula')} />
            <RibbonButton label="Table" icon={Table2} onClick={() => onOpenDialog('table')} />
          </RibbonGroup>
          <RibbonGroup title="Blocks">
            <RibbonButton label="Code" icon={Code2} active={editor.isActive('codeBlock')} onClick={() => onOpenDialog('code')} />
            <RibbonButton label="Line Break" icon={CornerDownLeft} onClick={() => editor.chain().focus().setHardBreak().run()} />
            <RibbonButton label="Separator" icon={Minus} onClick={() => editor.chain().focus().setHorizontalRule().run()} />
          </RibbonGroup>
        </div>
      </TabsContent>

      <TabsContent value="draw" className="m-0 overflow-x-auto p-2">
        <div className="flex min-w-max flex-wrap gap-2">
          <RibbonGroup title="Draw">
            <RibbonButton label="Shapes" icon={Shapes} onClick={() => onOpenDialog('drawing')} />
            <RibbonButton label="Upload Image" icon={FileImage} onClick={() => onOpenDialog('media')} />
          </RibbonGroup>
        </div>
      </TabsContent>

      <TabsContent value="design" className="m-0 overflow-x-auto p-2">
        <div className="flex min-w-max flex-wrap gap-2">
          <RibbonGroup title="List Style">
            <Select onValueChange={(value) => editor.chain().focus().updateAttributes('bulletList', { listStyle: value }).run()}>
              <SelectTrigger className="h-10 w-[132px] text-xs font-bold"><SelectValue placeholder="Bullet" /></SelectTrigger>
              <SelectContent>{BULLET_STYLES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select onValueChange={(value) => editor.chain().focus().updateAttributes('orderedList', { listStyle: value }).run()}>
              <SelectTrigger className="h-10 w-[132px] text-xs font-bold"><SelectValue placeholder="Number" /></SelectTrigger>
              <SelectContent>{ORDERED_STYLES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
          </RibbonGroup>
          <RibbonGroup title="Clean">
            <RibbonButton label="Clear" icon={Eraser} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} />
          </RibbonGroup>
        </div>
      </TabsContent>

      <TabsContent value="layout" className="m-0 overflow-x-auto p-2">
        <div className="flex min-w-max flex-wrap gap-2">
          <RibbonGroup title="Indent">
            <RibbonButton label="Tab" icon={Pilcrow} onClick={() => insertTabText(editor)} />
            <RibbonButton label="Indent" icon={IndentIncrease} onClick={() => editor.chain().focus().sinkListItem('listItem').run() || editor.chain().focus().sinkListItem('taskItem').run()} />
            <RibbonButton label="Outdent" icon={IndentDecrease} onClick={() => editor.chain().focus().liftListItem('listItem').run() || editor.chain().focus().liftListItem('taskItem').run()} />
          </RibbonGroup>
          <RibbonGroup title="Table">
            <RibbonButton label="Add Row" icon={Rows3} disabled={!editor.isActive('table')} onClick={() => editor.chain().focus().addRowAfter().run()} />
            <RibbonButton label="Add Col" icon={Table2} disabled={!editor.isActive('table')} onClick={() => editor.chain().focus().addColumnAfter().run()} />
            <RibbonButton label="Del Row" icon={Trash2} disabled={!editor.isActive('table')} onClick={() => editor.chain().focus().deleteRow().run()} />
            <RibbonButton label="Del Col" icon={Trash2} disabled={!editor.isActive('table')} onClick={() => editor.chain().focus().deleteColumn().run()} />
            <RibbonButton label="Del Table" icon={Trash2} disabled={!editor.isActive('table')} onClick={() => editor.chain().focus().deleteTable().run()} />
          </RibbonGroup>
        </div>
      </TabsContent>

      <TabsContent value="view" className="m-0 overflow-x-auto p-2">
        <div className="flex min-w-max flex-wrap gap-2">
          <RibbonGroup title="View">
            <RibbonButton label="Paragraph" icon={Pilcrow} active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()} />
            <RibbonButton label="Markdown" icon={ClipboardCopy} onClick={onCopyMarkdown} />
          </RibbonGroup>
        </div>
      </TabsContent>
    </Tabs>
  );
}
