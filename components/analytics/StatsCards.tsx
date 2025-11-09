'use client';

import React, { useEffect, useState } from 'react';

// Small solid triangle using CSS borders to match the design precisely
function Triangle({ direction, color }: { direction: 'up' | 'down'; color: string }) {
  const base = 'inline-block';
  const style: React.CSSProperties =
    direction === 'up'
      ? {
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: `8px solid ${color}`,
        }
      : {
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `8px solid ${color}`,
        };
  return <span className={base} style={style} aria-hidden="true" />;
}

type StatsResponse = {
  todaysRevenue: { amount: number; changePct: number };
  monthlyRevenue: { amount: number; changePct: number };
  activeSubscriptions: { count: number; changePct: number };
  retentionRate: { rate: number; changePct: number };
};

function formatCurrency(n: number) {
  try { return `Rs ${Number(n || 0).toLocaleString()}`; } catch { return `Rs ${n}`; }
}

function withSign(n: number) {
  const v = Math.round((n || 0) * 10) / 10;
  return `${v >= 0 ? '+' : ''}${v}%`;
}

export default function StatsCards() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/analytics/stats', { cache: 'no-store' });
        if (!res.ok) throw new Error(`stats ${res.status}`);
        const json = (await res.json()) as StatsResponse;
        if (mounted) setData(json);
      } catch (e) {
        console.warn('[Analytics] stats fetch failed', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const cards = [
    {
      iconSrc: '/images/analytics-1.svg',
      value: formatCurrency(data?.todaysRevenue.amount || 0),
      label: "Today's Revenue",
      change: `${withSign(data?.todaysRevenue.changePct || 0)} from yesterday`,
      bgColor: 'bg-[#FFE2E5]',
      iconBgColor: 'bg-pink-500',
      trend: (data?.todaysRevenue.changePct || 0) >= 0 ? 'up' : 'down',
      trendColor: 'text-[#4079ED]'
    },
    {
      iconSrc: '/images/analytics-2.svg',
      value: formatCurrency(data?.monthlyRevenue.amount || 0),
      label: 'Monthly Revenue',
      change: `${withSign(data?.monthlyRevenue.changePct || 0)} from last month`,
      bgColor: 'bg-orange-100',
      iconBgColor: 'bg-orange-500',
      trend: (data?.monthlyRevenue.changePct || 0) >= 0 ? 'up' : 'down',
      trendColor: 'text-[#4079ED]'
    },
    {
      iconSrc: '/images/analytics-3.svg',
      value: `${data?.activeSubscriptions.count ?? 0}`,
      label: 'Active Subscriptions',
      change: `${withSign(data?.activeSubscriptions.changePct || 0)} from yesterday`,
      bgColor: 'bg-green-100',
      iconBgColor: 'bg-green-500',
      trend: (data?.activeSubscriptions.changePct || 0) >= 0 ? 'up' : 'down',
      trendColor: 'text-[#4079ED]'
    },
    {
      iconSrc: '/images/analytics-4.svg',
      value: `${data?.retentionRate.rate ?? 0}%`,
      label: 'Retention Rate',
      change: `${withSign(data?.retentionRate.changePct || 0)} from yesterday`,
      bgColor: 'bg-purple-100',
      iconBgColor: 'bg-purple-500',
      trend: (data?.retentionRate.changePct || 0) >= 0 ? 'up' : 'down',
      trendColor: 'text-[#4079ED]'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
      {cards.map((stat, index) => (
        <div key={index} className={`${stat.bgColor} rounded-2xl p-4 sm:p-6 relative overflow-hidden`}>
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <div className="p-0">
              <img src={stat.iconSrc} alt="" className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <Triangle
              direction={stat.trend === 'up' ? 'up' : 'down'}
              color={stat.trend === 'up' ? '#1E8E3E' : '#E11D48'}
            />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{loading && !data ? '—' : stat.value}</div>
          <div className="text-sm md:text-base text-gray-700 font-medium mb-1">{stat.label}</div>
          <div className={`text-[11px] md:text-xs ${stat.trendColor}`}>{loading && !data ? '' : stat.change}</div>
        </div>
      ))}
    </div>
  );
}
