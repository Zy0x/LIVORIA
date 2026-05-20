import { MediaPreviewShell } from '../../features/media/MediaPreviewShell';
import { getMediaPreview } from '../../features/media/media.repository';

export const dynamic = 'force-dynamic';

export default async function DonghuaPage() {
  const state = await getMediaPreview('donghua');

  return <MediaPreviewShell state={state} />;
}
