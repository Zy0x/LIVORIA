import { DashboardShell } from '../features/dashboard/DashboardShell';
import { getDashboardSummaryState } from '../features/dashboard/dashboard.repository';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const state = await getDashboardSummaryState();

  return <DashboardShell state={state} />;
}
