export interface HydratedPageItems<T> {
  items: T[];
  appendSkeletonCount: number;
  isBlocking: boolean;
  isPartial: boolean;
}

export function buildHydratedPageItems<T extends { id: string }>(
  targetItems: T[],
  hydratedItems: T[],
  isFetching: boolean,
  fallbackItems: T[] = [],
): HydratedPageItems<T> {
  const hydratedById = new Map(fallbackItems.map((item) => [item.id, item]));
  for (const item of hydratedItems) hydratedById.set(item.id, item);

  if (!isFetching) {
    return {
      items: targetItems.map((item) => hydratedById.get(item.id) ?? item),
      appendSkeletonCount: 0,
      isBlocking: false,
      isPartial: false,
    };
  }

  const items: T[] = [];

  for (const targetItem of targetItems) {
    const hydratedItem = hydratedById.get(targetItem.id);
    if (!hydratedItem) break;
    items.push(hydratedItem);
  }

  const appendSkeletonCount = Math.max(0, targetItems.length - items.length);

  return {
    items,
    appendSkeletonCount,
    isBlocking: targetItems.length > 0 && items.length === 0,
    isPartial: items.length > 0 && appendSkeletonCount > 0,
  };
}
