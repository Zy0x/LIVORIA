import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import { CATATAN_DRAFT_SELECT_COLUMNS } from '@/services/query-columns';
import {
  catatanDocumentToJson,
  catatanDocumentToPlainText,
  normalizeCatatanDocument,
} from '../domain/catatan-content';
import type { CatatanColor, CatatanDraft, CatatanFormValues, CatatanRelatedType } from '../types/catatan.types';

const COLORS = new Set<CatatanColor>(['sage', 'blue', 'amber', 'rose', 'violet']);
const RELATED_TYPES = new Set<CatatanRelatedType>(['tagihan', 'anime', 'donghua', 'waifu', 'obat']);

const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const asBoolean = (value: unknown) => value === true;
const asTags = (value: unknown): string[] => Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === 'string') : [];
const asNullableString = (value: unknown) => {
  const text = asString(value).trim();
  return text ? text : null;
};
const asColor = (value: unknown): CatatanColor => {
  const color = asString(value) as CatatanColor;
  return COLORS.has(color) ? color : 'sage';
};
const asRelatedType = (value: unknown): CatatanRelatedType | null => {
  const type = asString(value) as CatatanRelatedType;
  return RELATED_TYPES.has(type) ? type : null;
};

async function requireUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export const getCatatanDraftKey = (catatanId: string | null) => catatanId ? `edit:${catatanId}` : 'new';

export function mapCatatanDraftRow(row: Record<string, unknown>): CatatanDraft {
  const content = asString(row.content);
  const contentDoc = normalizeCatatanDocument(row.content_doc, content);
  return {
    id: asString(row.id),
    user_id: asString(row.user_id),
    catatan_id: asNullableString(row.catatan_id),
    draft_key: asString(row.draft_key),
    title: asString(row.title),
    content: content || catatanDocumentToPlainText(contentDoc),
    content_doc: contentDoc,
    tags: asTags(row.tags),
    color: asColor(row.color),
    is_pinned: asBoolean(row.is_pinned),
    related_type: asRelatedType(row.related_type),
    related_id: asNullableString(row.related_id),
    related_title: asNullableString(row.related_title),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

export function draftToFormValues(draft: CatatanDraft): CatatanFormValues {
  return {
    title: draft.title,
    content: draft.content,
    content_doc: draft.content_doc,
    tagsText: draft.tags.join(', '),
    color: draft.color,
    is_pinned: draft.is_pinned,
    related_type: draft.related_type ?? 'none',
    related_id: draft.related_id ?? '',
  };
}

export const supabaseCatatanDraftRepository = {
  async get(draftKey: string): Promise<CatatanDraft | null> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('catatan_drafts')
      .select(CATATAN_DRAFT_SELECT_COLUMNS)
      .eq('user_id', userId)
      .eq('draft_key', draftKey)
      .maybeSingle();

    if (error) throw error;
    return data ? mapCatatanDraftRow(data as Record<string, unknown>) : null;
  },

  async upsert(draftKey: string, catatanId: string | null, form: CatatanFormValues): Promise<CatatanDraft> {
    const userId = await requireUserId();
    const contentDoc = normalizeCatatanDocument(form.content_doc, form.content);
    const content = catatanDocumentToPlainText(contentDoc);
    const relatedType = form.related_type === 'none' || !form.related_id ? null : form.related_type;
    const row = {
      user_id: userId,
      catatan_id: catatanId,
      draft_key: draftKey,
      title: form.title,
      content,
      content_doc: catatanDocumentToJson(contentDoc),
      tags: form.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 12),
      color: form.color,
      is_pinned: form.is_pinned,
      related_type: relatedType,
      related_id: relatedType ? form.related_id : null,
      related_title: null,
      updated_at: new Date().toISOString(),
    } satisfies TablesInsert<'catatan_drafts'>;

    const { data, error } = await supabase
      .from('catatan_drafts')
      .upsert(row, { onConflict: 'user_id,draft_key' })
      .select(CATATAN_DRAFT_SELECT_COLUMNS)
      .single();

    if (error) throw error;
    return mapCatatanDraftRow(data as Record<string, unknown>);
  },

  async remove(draftKey: string): Promise<void> {
    const userId = await requireUserId();
    const { error } = await supabase
      .from('catatan_drafts')
      .delete()
      .eq('user_id', userId)
      .eq('draft_key', draftKey);

    if (error) throw error;
  },
};
