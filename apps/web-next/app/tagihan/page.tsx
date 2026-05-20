import { TagihanPreviewShell } from '../../features/tagihan/TagihanPreviewShell';
import { getTagihanPreview, normalizeTagihanQuery } from '../../features/tagihan/tagihan.repository';

export const dynamic = 'force-dynamic';

type TagihanPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function TagihanPage({ searchParams }: TagihanPageProps) {
  const params = await searchParams;
  const state = await getTagihanPreview(normalizeTagihanQuery({
    page: Number(readParam(params ?? {}, 'page') ?? 1),
    pageSize: Number(readParam(params ?? {}, 'pageSize') ?? 12),
    search: readParam(params ?? {}, 'search') ?? '',
    sort: readParam(params ?? {}, 'sort') as never,
    status: readParam(params ?? {}, 'status') as never,
  }));

  return <TagihanPreviewShell state={state} />;
}
