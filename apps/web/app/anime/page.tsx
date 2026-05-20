import { MediaPreviewShell } from '../../features/media/MediaPreviewShell';
import { getMediaPreview, normalizeMediaQuery } from '../../features/media/media.repository';

export const dynamic = 'force-dynamic';

type AnimePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AnimePage({ searchParams }: AnimePageProps) {
  const params = await searchParams;
  const state = await getMediaPreview('anime', normalizeMediaQuery({
    bookmark: readParam(params ?? {}, 'bookmark') === '1',
    favorite: readParam(params ?? {}, 'favorite') === '1',
    genre: readParam(params ?? {}, 'genre') ?? 'all',
    page: Number(readParam(params ?? {}, 'page') ?? 1),
    pageSize: Number(readParam(params ?? {}, 'pageSize') ?? 12),
    search: readParam(params ?? {}, 'search') ?? '',
    sort: readParam(params ?? {}, 'sort') as never,
    status: readParam(params ?? {}, 'status') as never,
    tab: readParam(params ?? {}, 'tab') as never,
    titleLang: readParam(params ?? {}, 'titleLang') as never,
    watch: readParam(params ?? {}, 'watch') as never,
  }));

  return <MediaPreviewShell state={state} />;
}
