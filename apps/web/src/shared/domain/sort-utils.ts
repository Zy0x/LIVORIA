export function toSortableTime(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function compareDateDesc(a: string | null | undefined, b: string | null | undefined): number {
  return toSortableTime(b) - toSortableTime(a);
}

export function compareDateAsc(a: string | null | undefined, b: string | null | undefined): number {
  const aTime = toSortableTime(a);
  const bTime = toSortableTime(b);
  if (!aTime && !bTime) return 0;
  if (!aTime) return 1;
  if (!bTime) return -1;
  return aTime - bTime;
}

export function compareNumberDesc(a: number | null | undefined, b: number | null | undefined): number {
  return (b ?? 0) - (a ?? 0);
}

export function compareNumberAsc(a: number | null | undefined, b: number | null | undefined): number {
  return (a ?? 0) - (b ?? 0);
}

export function compareTextAsc(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? '').localeCompare(b ?? '', 'id', {
    sensitivity: 'base',
    numeric: true,
  });
}

export function chainComparators<T>(...comparators: Array<(a: T, b: T) => number>) {
  return (a: T, b: T) => {
    for (const compare of comparators) {
      const result = compare(a, b);
      if (result !== 0) return result;
    }
    return 0;
  };
}
