import { WaifuPreviewShell } from '../../features/waifu/WaifuPreviewShell';
import { getWaifuPreview } from '../../features/waifu/waifu.repository';

export const dynamic = 'force-dynamic';

export default async function WaifuPage() {
  const state = await getWaifuPreview();

  return <WaifuPreviewShell state={state} />;
}
