import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { normalizeCatatanDocument } from '../domain/catatan-content';
import {
  draftToFormValues,
  getCatatanDraftKey,
  supabaseCatatanDraftRepository,
} from '../services/catatan-draft.repository';
import type { CatatanDraft, CatatanFormValues, CatatanItem } from '../types/catatan.types';

type DraftSource = 'local' | 'cloud';
type DraftStatus = 'idle' | 'saving' | 'saved-local' | 'saved-cloud' | 'error';

type LocalDraft = {
  source: DraftSource;
  draft_key: string;
  catatan_id: string | null;
  form: CatatanFormValues;
  updated_at: string;
};

type PendingDraft = {
  source: DraftSource;
  form: CatatanFormValues;
  updated_at: string;
};

type UseCatatanEditorDraftProps = {
  open: boolean;
  editItem: CatatanItem | null;
  form: CatatanFormValues;
  setForm: Dispatch<SetStateAction<CatatanFormValues>>;
};

const LOCAL_STORAGE_PREFIX = 'livoria:catatan:draft';
const CLOUD_SYNC_DELAY = 3500;

const serializeForm = (form: CatatanFormValues) => JSON.stringify({
  ...form,
  content_doc: normalizeCatatanDocument(form.content_doc, form.content),
});

const localDraftToPending = (draft: LocalDraft): PendingDraft => ({
  source: draft.source,
  form: draft.form,
  updated_at: draft.updated_at,
});

const cloudDraftToPending = (draft: CatatanDraft): PendingDraft => ({
  source: 'cloud',
  form: draftToFormValues(draft),
  updated_at: draft.updated_at,
});

export function useCatatanEditorDraft({ open, editItem, form, setForm }: UseCatatanEditorDraftProps) {
  const [userId, setUserId] = useState<string>('anonymous');
  const [pendingDraft, setPendingDraft] = useState<PendingDraft | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const baselineRef = useRef('');
  const hydratedRef = useRef(false);
  const cloudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const catatanId = editItem?.id ?? null;
  const draftKey = useMemo(() => getCatatanDraftKey(catatanId), [catatanId]);
  const localStorageKey = useMemo(
    () => `${LOCAL_STORAGE_PREFIX}:${userId}:${draftKey}`,
    [draftKey, userId],
  );

  const readLocalDraft = useCallback((): LocalDraft | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(localStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LocalDraft;
      if (parsed.draft_key !== draftKey) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [draftKey, localStorageKey]);

  const writeLocalDraft = useCallback((nextForm: CatatanFormValues) => {
    if (typeof window === 'undefined') return;
    const draft: LocalDraft = {
      source: 'local',
      draft_key: draftKey,
      catatan_id: catatanId,
      form: {
        ...nextForm,
        content_doc: normalizeCatatanDocument(nextForm.content_doc, nextForm.content),
      },
      updated_at: new Date().toISOString(),
    };
    window.localStorage.setItem(localStorageKey, JSON.stringify(draft));
  }, [catatanId, draftKey, localStorageKey]);

  const removeLocalDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(localStorageKey);
  }, [localStorageKey]);

  const clearDraft = useCallback(async () => {
    removeLocalDraft();
    setPendingDraft(null);
    setHasUnsavedChanges(false);
    setDraftStatus('idle');
    try {
      await supabaseCatatanDraftRepository.remove(draftKey);
    } catch {
      // Local draft cleanup is enough for UX; cloud cleanup can retry on next save.
    }
  }, [draftKey, removeLocalDraft]);

  useEffect(() => {
    const handleClear = (event: Event) => {
      const detail = (event as CustomEvent<{ draftKey?: string }>).detail;
      if (detail?.draftKey !== draftKey) return;
      removeLocalDraft();
      setPendingDraft(null);
      setHasUnsavedChanges(false);
      setDraftStatus('idle');
    };

    window.addEventListener('livoria:catatan-draft-clear', handleClear);
    return () => window.removeEventListener('livoria:catatan-draft-clear', handleClear);
  }, [draftKey, removeLocalDraft]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUserId(data.session?.user?.id ?? 'anonymous');
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      if (cloudTimerRef.current) clearTimeout(cloudTimerRef.current);
      return;
    }

    let cancelled = false;
    const baseline = serializeForm(form);
    baselineRef.current = baseline;
    hydratedRef.current = false;
    setHasUnsavedChanges(false);
    setDraftStatus('idle');
    setPendingDraft(null);

    async function hydrateDraft() {
      const localDraft = readLocalDraft();
      let cloudDraft: PendingDraft | null = null;

      try {
        const remote = await supabaseCatatanDraftRepository.get(draftKey);
        if (remote) cloudDraft = cloudDraftToPending(remote);
      } catch {
        cloudDraft = null;
      }

      if (cancelled) return;

      const candidates = [localDraft ? localDraftToPending(localDraft) : null, cloudDraft]
        .filter((draft): draft is PendingDraft => Boolean(draft))
        .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));

      const newest = candidates[0] ?? null;
      if (newest && serializeForm(newest.form) !== baseline) {
        setPendingDraft(newest);
      }
      hydratedRef.current = true;
    }

    hydrateDraft();

    return () => {
      cancelled = true;
    };
  }, [draftKey, open, readLocalDraft]);

  useEffect(() => {
    if (!open || !hydratedRef.current) return;
    const serialized = serializeForm(form);
    if (serialized === baselineRef.current) return;

    setHasUnsavedChanges(true);
    setDraftStatus('saving');
    writeLocalDraft(form);
    setDraftStatus('saved-local');

    if (cloudTimerRef.current) clearTimeout(cloudTimerRef.current);
    cloudTimerRef.current = setTimeout(() => {
      supabaseCatatanDraftRepository.upsert(draftKey, catatanId, form)
        .then(() => setDraftStatus('saved-cloud'))
        .catch(() => setDraftStatus('error'));
    }, CLOUD_SYNC_DELAY);
  }, [catatanId, draftKey, form, open, writeLocalDraft]);

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) return;
    setForm(pendingDraft.form);
    setPendingDraft(null);
    setHasUnsavedChanges(true);
  }, [pendingDraft, setForm]);

  const dismissDraft = useCallback(() => {
    setPendingDraft(null);
  }, []);

  return {
    draftStatus,
    hasUnsavedChanges,
    pendingDraft,
    restoreDraft,
    dismissDraft,
    clearDraft,
  };
}
