import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import type { CatatanDocument } from '../domain/catatan-content';

export const CATATAN_ASSET_BUCKET = 'catatan-assets' as const;
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_ASSET_SIZE_BYTES = 25 * 1024 * 1024;

export type CatatanAssetKind = 'image' | 'video' | 'drawing' | 'shape';

export type CatatanUploadedAsset = {
  id: string;
  bucket: typeof CATATAN_ASSET_BUCKET;
  objectPath: string;
  signedUrl: string;
  mimeType: string;
  kind: CatatanAssetKind;
};

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
]);

function randomStorageSuffix(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'asset';
}

function getAssetKind(mimeType: string): CatatanAssetKind {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  throw new Error('Jenis file belum didukung untuk Catatan.');
}

async function requireUserId(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

async function signAssetPath(objectPath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(CATATAN_ASSET_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (error) throw error;
  return data.signedUrl;
}

export async function uploadCatatanAsset(input: {
  file: File;
  draftKey: string;
  catatanId?: string | null;
}): Promise<CatatanUploadedAsset> {
  const { file, draftKey, catatanId = null } = input;
  const userId = await requireUserId();

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error('Format file Catatan belum didukung.');
  }
  if (file.size > MAX_ASSET_SIZE_BYTES) {
    throw new Error('Ukuran file Catatan maksimal 25MB.');
  }

  const kind = getAssetKind(file.type);
  const objectPath = [
    userId,
    catatanId || draftKey.replace(/[^a-zA-Z0-9:_-]/g, '-'),
    `${Date.now()}-${randomStorageSuffix()}-${safeFileName(file.name)}`,
  ].join('/');

  const { error: uploadError } = await supabase.storage
    .from(CATATAN_ASSET_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const insertRow = {
    user_id: userId,
    catatan_id: catatanId,
    draft_key: catatanId ? null : draftKey,
    bucket: CATATAN_ASSET_BUCKET,
    object_path: objectPath,
    mime_type: file.type,
    size_bytes: file.size,
    kind,
  } satisfies TablesInsert<'catatan_assets'>;

  const { data, error } = await supabase
    .from('catatan_assets')
    .insert(insertRow)
    .select('id,bucket,object_path,mime_type,kind')
    .single();

  if (error) throw error;

  return {
    id: String(data.id),
    bucket: CATATAN_ASSET_BUCKET,
    objectPath,
    signedUrl: await signAssetPath(objectPath),
    mimeType: String(data.mime_type),
    kind: data.kind === 'video' ? 'video' : 'image',
  };
}

export async function promoteCatatanDraftAssets(draftKey: string, catatanId: string): Promise<void> {
  const { error } = await supabase
    .from('catatan_assets')
    .update({ catatan_id: catatanId, draft_key: null })
    .eq('draft_key', draftKey);

  if (error) throw error;
}

export async function deleteCatatanAssetsForItem(catatanId: string): Promise<void> {
  const { data, error } = await supabase
    .from('catatan_assets')
    .select('object_path')
    .eq('catatan_id', catatanId);

  if (error) throw error;
  const paths = (data ?? []).map((row) => String(row.object_path)).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from(CATATAN_ASSET_BUCKET).remove(paths);
  }
}

export function stripSignedCatatanAssetUrls(document: CatatanDocument): CatatanDocument {
  return rewriteCatatanAssetNodes(document, (attrs) => {
    if (!attrs.objectPath) return attrs;
    return { ...attrs, src: '', signedUrl: '' };
  });
}

export async function resolveCatatanAssetUrls(document: CatatanDocument): Promise<CatatanDocument> {
  const paths = new Set<string>();
  visitCatatanNodes(document as JsonNode, (node) => {
    const objectPath = typeof node.attrs?.objectPath === 'string' ? node.attrs.objectPath : '';
    if (objectPath) paths.add(objectPath);
  });

  if (paths.size === 0) return document;

  const signed = new Map<string, string>();
  await Promise.all(Array.from(paths).map(async (path) => {
    try {
      signed.set(path, await signAssetPath(path));
    } catch {
      signed.set(path, '');
    }
  }));

  return rewriteCatatanAssetNodes(document, (attrs) => {
    const objectPath = attrs.objectPath;
    if (!objectPath) return attrs;
    return { ...attrs, src: signed.get(objectPath) || attrs.src || '' };
  });
}

type JsonNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
};

function visitCatatanNodes(node: JsonNode, visitor: (node: JsonNode) => void): void {
  visitor(node);
  for (const child of node.content ?? []) visitCatatanNodes(child, visitor);
}

function rewriteCatatanAssetNodes(
  document: CatatanDocument,
  rewriteAttrs: (attrs: Record<string, string>) => Record<string, string>,
): CatatanDocument {
  const rewriteNode = (node: JsonNode): JsonNode => {
    const attrs = node.attrs && typeof node.attrs === 'object'
      ? Object.fromEntries(Object.entries(node.attrs).map(([key, value]) => [key, typeof value === 'string' ? value : String(value ?? '')]))
      : null;

    const nextAttrs = attrs && ['image', 'catatanVideo', 'catatanDrawing'].includes(String(node.type))
      ? rewriteAttrs(attrs)
      : attrs;

    return {
      ...node,
      ...(nextAttrs ? { attrs: nextAttrs } : {}),
      ...(node.content ? { content: node.content.map(rewriteNode) } : {}),
    };
  };

  return rewriteNode(document as JsonNode) as CatatanDocument;
}
