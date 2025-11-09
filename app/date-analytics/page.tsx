"use client";
import dynamic from 'next/dynamic';

const DateAnalytics = dynamic(() => import('@/components/date-analytics/DateAnalytics'), {
  ssr: false,
});

export default function DateAnalyticsPage() {
  return <DateAnalytics />;
}
