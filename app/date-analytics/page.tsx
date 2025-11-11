import { requireAdmin } from '@/lib/auth';
import DateAnalytics from '@/components/date-analytics/DateAnalytics';

export const runtime = 'nodejs';

export default async function DateAnalyticsPage() {
  await requireAdmin();
  return <DateAnalytics />;
}
