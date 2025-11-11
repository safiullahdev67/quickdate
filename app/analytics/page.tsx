import Analytics from '@/components/analytics/Analytics';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

export default async function AnalyticsPage() {
  await requireAdmin();
  return <Analytics />;
}
