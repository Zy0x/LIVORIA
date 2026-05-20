import { TagihanPreviewShell } from '../../features/tagihan/TagihanPreviewShell';
import { getTagihanPreview } from '../../features/tagihan/tagihan.repository';

export const dynamic = 'force-dynamic';

export default async function TagihanPage() {
  const state = await getTagihanPreview();

  return <TagihanPreviewShell state={state} />;
}
