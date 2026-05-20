import { ObatPreviewShell } from '../../features/obat/ObatPreviewShell';
import { getObatPreview } from '../../features/obat/obat.repository';

export const dynamic = 'force-dynamic';

export default async function ObatPage() {
  const state = await getObatPreview();

  return <ObatPreviewShell state={state} />;
}
