const PAGINATED_FEATURES = new Set(['anime', 'donghua', 'waifu', 'obat']);

function getSegments(pathname: string) {
  return pathname.split('/').filter(Boolean);
}

function hasPageSegment(pathname: string) {
  return getSegments(pathname)[1]?.startsWith('page=') ?? false;
}

export function getPaginatedFeatureBase(pathname: string) {
  const [feature, pageParam, ...rest] = getSegments(pathname);
  if (!feature || !PAGINATED_FEATURES.has(feature) || rest.length > 0) return null;
  if (pageParam && !pageParam.startsWith('page=')) return null;
  return `/${feature}`;
}

export function isSameFeaturePaginationNavigation(previousPathname: string | null, nextPathname: string) {
  if (!previousPathname || previousPathname === nextPathname) return false;

  const previousBase = getPaginatedFeatureBase(previousPathname);
  const nextBase = getPaginatedFeatureBase(nextPathname);

  return Boolean(
    previousBase &&
      nextBase &&
      previousBase === nextBase &&
      (hasPageSegment(previousPathname) || hasPageSegment(nextPathname)),
  );
}
