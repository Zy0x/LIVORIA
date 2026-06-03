import type { QueryClient, QueryKey } from '@tanstack/react-query';

export function getCachedVisibleItems<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: QueryKey,
): Map<string, T> {
  const cachedById = new Map<string, T>();

  for (const [, cachedItems] of queryClient.getQueriesData<T[]>({ queryKey })) {
    if (!cachedItems) continue;
    for (const item of cachedItems) cachedById.set(item.id, item);
  }

  return cachedById;
}

export function mergeVisibleItems<T extends { id: string }>(
  ids: string[],
  cachedById: Map<string, T>,
  fetchedItems: T[],
): T[] {
  const mergedById = new Map(cachedById);
  for (const item of fetchedItems) mergedById.set(item.id, item);

  return ids
    .map((id) => mergedById.get(id))
    .filter((item): item is T => Boolean(item));
}

export function upsertVisibleItemCache<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  item: T,
) {
  queryClient.setQueriesData<T[]>({ queryKey }, (current) => {
    if (!current) return current;
    let changed = false;
    const next = current.map((cachedItem) => {
      if (cachedItem.id !== item.id) return cachedItem;
      changed = true;
      return item;
    });
    return changed ? next : current;
  });
}

export function removeVisibleItemsCache<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  ids: string[],
) {
  const idsSet = new Set(ids);
  queryClient.setQueriesData<T[]>({ queryKey }, (current) => {
    if (!current) return current;
    const next = current.filter((item) => !idsSet.has(item.id));
    return next.length === current.length ? current : next;
  });
}
