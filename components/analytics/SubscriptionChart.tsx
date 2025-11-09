'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomBar = (props: any) => {
  const { x, y, width, height, index } = props;
  const colors = ['#60A5FA', '#10B981', '#000000', '#60A5FA', '#A78BFA', '#10B981'];
  
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={colors[index % colors.length]}
      rx={8}
      ry={8}
    />
  );
};

export default function SubscriptionChart() {
  const [series, setSeries] = useState<Array<{ name: string; value: number }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/analytics/subscriptions-series', { cache: 'no-store' });
        if (!res.ok) throw new Error(`subscriptions-series ${res.status}`);
        const json = await res.json();
        if (mounted) setSeries(json.points || []);
      } catch (e) {
        console.warn('[Analytics] subscriptions-series fetch failed', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="bg-[#f8f8fb] rounded-2xl p-4 sm:p-6 shadow-sm">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Subscription Growth</h3>
      <div className="h-px bg-gray-300/80 -mx-4 sm:-mx-6 mb-3 sm:mb-4" />
      
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={series} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="0" stroke="transparent" />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            tickFormatter={(value) => `${Number(value).toLocaleString()}`}
            domain={[0, 'auto']}
          />
          <Tooltip />
          <Bar 
            dataKey="value" 
            shape={CustomBar}
            barSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
      {loading && series.length === 0 && (
        <div className="text-center text-xs text-gray-500 mt-1">Loading…</div>
      )}
    </div>
  );
}
