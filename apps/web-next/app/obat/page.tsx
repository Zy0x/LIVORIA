import { ObatPreviewShell } from '../../features/obat/ObatPreviewShell';
import { getObatPreview, normalizeObatQuery } from '../../features/obat/obat.repository';

export const dynamic = 'force-dynamic';

type ObatPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ObatPage({ searchParams }: ObatPageProps) {
  const params = await searchParams;
  const query = normalizeObatQuery({
    frequency: readParam(params ?? {}, 'frequency') as never,
    page: Number(readParam(params ?? {}, 'page') ?? 1),
    pageSize: Number(readParam(params ?? {}, 'pageSize') ?? 12),
    search: readParam(params ?? {}, 'search') ?? '',
    sort: readParam(params ?? {}, 'sort') as never,
    type: readParam(params ?? {}, 'type') ?? 'all',
  });
  const state = await getObatPreview(query);

  return <ObatPreviewShell state={state} />;
}
