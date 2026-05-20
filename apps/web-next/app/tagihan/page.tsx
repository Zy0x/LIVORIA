import { TagihanPreviewShell } from '../../features/tagihan/TagihanPreviewShell';
import { getTagihanPreview } from '../../features/tagihan/tagihan.repository';

export default async function TagihanPage() {
  const state = await getTagihanPreview();

  return <TagihanPreviewShell state={state} />;
}
