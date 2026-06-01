import { EditorContent, type Editor } from '@tiptap/react';

type CatatanEditorSurfaceProps = {
  editor: Editor;
};

export function CatatanEditorSurface({ editor }: CatatanEditorSurfaceProps) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <EditorContent editor={editor} />
    </div>
  );
}
