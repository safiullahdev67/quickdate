import dynamic from 'next/dynamic';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

const DateAnalytics = dynamic(() => import('@/components/date-analytics/DateAnalytics'), {
  ssr: false,
});

export default async function DateAnalyticsPage() {
  await requireAdmin();
  return <DateAnalytics />;
}
