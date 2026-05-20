import { DashboardShell } from '../../features/dashboard/DashboardShell';
import { getDashboardSummaryState } from '../../features/dashboard/dashboard.repository';

export default async function DashboardPage() {
  const state = await getDashboardSummaryState();

  return <DashboardShell state={state} />;
}
