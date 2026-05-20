import { MediaPreviewShell } from '../../features/media/MediaPreviewShell';
import { getMediaPreview } from '../../features/media/media.repository';

export default async function AnimePage() {
  const state = await getMediaPreview('anime');

  return <MediaPreviewShell state={state} />;
}
