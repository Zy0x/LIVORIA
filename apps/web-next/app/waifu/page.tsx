import { WaifuPreviewShell } from '../../features/waifu/WaifuPreviewShell';
import { getWaifuPreview, normalizeWaifuQuery } from '../../features/waifu/waifu.repository';

export const dynamic = 'force-dynamic';

type WaifuPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function WaifuPage({ searchParams }: WaifuPageProps) {
  const params = await searchParams;
  const state = await getWaifuPreview(normalizeWaifuQuery({
    search: readParam(params ?? {}, 'search') ?? '',
    sourceType: readParam(params ?? {}, 'sourceType') as never,
    tier: readParam(params ?? {}, 'tier') as never,
  }));

  return <WaifuPreviewShell state={state} />;
}
