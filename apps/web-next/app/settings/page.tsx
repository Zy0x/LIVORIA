import { SettingsPreviewShell } from '../../features/settings/SettingsPreviewShell';
import { getSettingsPreview } from '../../features/settings/settings.repository';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const state = await getSettingsPreview();

  return <SettingsPreviewShell state={state} />;
}
