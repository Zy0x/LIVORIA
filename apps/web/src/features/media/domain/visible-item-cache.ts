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
