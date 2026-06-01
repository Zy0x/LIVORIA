import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { uploadCatatanAsset } from '../../services/catatan-asset.repository';
import { insertCatatanVideo, normalizeCatatanUrl } from './catatan-editor.commands';

type CatatanMediaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
  draftKey: string;
  catatanId?: string | null;
};

export function CatatanMediaDialog({ open, onOpenChange, editor, draftKey, catatanId }: CatatanMediaDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const insertUrl = () => {
    if (!editor || !url.trim()) return;
    const src = normalizeCatatanUrl(url);
    if (/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(src)) {
      editor.chain().focus().setImage({ src, alt: 'Gambar Catatan' }).run();
    } else {
      insertCatatanVideo(editor, { src, title: 'Video Catatan' });
    }
    onOpenChange(false);
  };

  const upload = async (file: File) => {
    if (!editor) return;
    setBusy(true);
    try {
      const asset = await uploadCatatanAsset({ file, draftKey, catatanId });
      if (asset.kind === 'image') {
        editor.chain().focus().insertContent({
          type: 'image',
          attrs: {
            src: asset.signedUrl,
            alt: file.name,
            objectPath: asset.objectPath,
            assetId: asset.id,
          },
        }).run();
      } else {
        insertCatatanVideo(editor, {
          src: asset.signedUrl,
          title: file.name,
          objectPath: asset.objectPath,
          assetId: asset.id,
        });
      }
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(40rem,calc(100vw-1rem))]">
        <DialogHeader>
          <DialogTitle>Media Catatan</DialogTitle>
          <DialogDescription>Masukkan gambar/video dari URL atau upload ke private storage Catatan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
            <button type="button" onClick={insertUrl} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              Insert URL
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/webm"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.currentTarget.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground hover:border-primary/50 disabled:opacity-50"
          >
            {busy ? 'Mengupload...' : 'Upload Gambar / Video'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
