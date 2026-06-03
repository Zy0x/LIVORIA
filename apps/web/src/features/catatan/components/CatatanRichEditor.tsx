import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';

import type { CatatanDocument } from '../domain/catatan-content';
import { catatanDocumentToMarkdown, catatanDocumentToPlainText, normalizeCatatanDocument } from '../domain/catatan-content';
import { uploadCatatanAsset, stripSignedCatatanAssetUrls } from '../services/catatan-asset.repository';
import { CatatanCodeDialog } from './editor/CatatanCodeDialog';
import { CatatanColorDialog } from './editor/CatatanColorDialog';
import { CatatanDrawingDialog } from './editor/CatatanDrawingDialog';
import { CatatanEditorRibbon } from './editor/CatatanEditorRibbon';
import { CatatanEditorSurface } from './editor/CatatanEditorSurface';
import { CatatanFontDialog } from './editor/CatatanFontDialog';
import { CatatanFormulaDialog } from './editor/CatatanFormulaDialog';
import { CatatanLinkDialog } from './editor/CatatanLinkDialog';
import { CatatanMediaDialog } from './editor/CatatanMediaDialog';
import { CatatanSymbolDialog } from './editor/CatatanSymbolDialog';
import { CatatanTableDialog } from './editor/CatatanTableDialog';
import { createCatatanEditorExtensions } from './editor/catatan-editor.extensions';
import type { DialogType, RibbonTab } from './editor/catatan-editor-presets';
import { insertCatatanVideo } from './editor/catatan-editor.commands';

type CatatanRichEditorProps = {
  value: CatatanDocument;
  onChange: (document: CatatanDocument, plainText: string) => void;
  draftKey: string;
  catatanId?: string | null;
  autosaveLabel?: string;
  autosaveStatus?: 'idle' | 'saving' | 'saved-local' | 'saved-cloud' | 'error';
};

export function CatatanRichEditor({ value, onChange, draftKey, catatanId = null, autosaveLabel, autosaveStatus = 'idle' }: CatatanRichEditorProps) {
  const lastJsonRef = useRef(JSON.stringify(value));
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');
  const [openDialog, setOpenDialog] = useState<DialogType | null>(null);

  const extensions = useMemo(() => createCatatanEditorExtensions(), []);

  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'catatan-rich-editor min-h-[260px] px-3 py-3 text-sm leading-relaxed text-foreground outline-none sm:min-h-[360px]',
      },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        const mediaFile = files.find((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
        if (!mediaFile) return false;
        event.preventDefault();
        void uploadCatatanAsset({ file: mediaFile, draftKey, catatanId }).then((asset) => {
          const chain = editor?.chain().focus();
          if (!chain) return;
          if (asset.kind === 'image') {
            chain.insertContent({
              type: 'image',
              attrs: {
                src: asset.signedUrl,
                alt: mediaFile.name,
                objectPath: asset.objectPath,
                assetId: asset.id,
              },
            }).run();
            return;
          }
          insertCatatanVideo(editor, {
            src: asset.signedUrl,
            title: mediaFile.name,
            objectPath: asset.objectPath,
            assetId: asset.id,
          });
        });
        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const document = stripSignedCatatanAssetUrls(normalizeCatatanDocument(currentEditor.getJSON()));
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

  const copyMarkdown = async () => {
    if (!editor) return;
    const document = normalizeCatatanDocument(editor.getJSON());
    const markdown = catatanDocumentToMarkdown(document);
    try {
      await navigator.clipboard.writeText(markdown || catatanDocumentToPlainText(document));
    } catch {
      // Clipboard can fail in older browsers; keep the editor usable without browser prompts.
    }
  };

  if (!editor) {
    return (
      <div className="min-h-[280px] rounded-xl border border-input bg-background p-4 text-sm text-muted-foreground">
        Memuat editor...
      </div>
    );
  }

  const setDialogOpen = (dialog: DialogType, open: boolean) => {
    setOpenDialog(open ? dialog : null);
  };

  return (
    <div className="rounded-[18px] border border-input bg-background p-1 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
      <CatatanEditorRibbon
        editor={editor}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        onOpenDialog={setOpenDialog}
        onCopyMarkdown={() => { void copyMarkdown(); }}
        autosaveLabel={autosaveLabel}
        autosaveStatus={autosaveStatus}
      />

      <CatatanEditorSurface editor={editor} />

      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        <span>{editor.storage.characterCount.words()} kata</span>
        <span>{editor.storage.characterCount.characters()}/20000 karakter</span>
      </div>

      <CatatanLinkDialog open={openDialog === 'link'} onOpenChange={(open) => setDialogOpen('link', open)} editor={editor} />
      <CatatanFormulaDialog open={openDialog === 'formula'} onOpenChange={(open) => setDialogOpen('formula', open)} editor={editor} />
      <CatatanTableDialog open={openDialog === 'table'} onOpenChange={(open) => setDialogOpen('table', open)} editor={editor} />
      <CatatanColorDialog open={openDialog === 'color'} onOpenChange={(open) => setDialogOpen('color', open)} editor={editor} mode="text" />
      <CatatanColorDialog open={openDialog === 'highlight'} onOpenChange={(open) => setDialogOpen('highlight', open)} editor={editor} mode="highlight" />
      <CatatanFontDialog open={openDialog === 'font'} onOpenChange={(open) => setDialogOpen('font', open)} editor={editor} />
      <CatatanMediaDialog open={openDialog === 'media'} onOpenChange={(open) => setDialogOpen('media', open)} editor={editor} draftKey={draftKey} catatanId={catatanId} />
      <CatatanSymbolDialog open={openDialog === 'symbol'} onOpenChange={(open) => setDialogOpen('symbol', open)} editor={editor} />
      <CatatanDrawingDialog open={openDialog === 'drawing'} onOpenChange={(open) => setDialogOpen('drawing', open)} editor={editor} />
      <CatatanCodeDialog open={openDialog === 'code'} onOpenChange={(open) => setDialogOpen('code', open)} editor={editor} />
    </div>
  );
}
