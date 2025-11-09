'use client';

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function RevenueChart() {
  const [selectedPeriod, setSelectedPeriod] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Daily');
  const [series, setSeries] = useState<Array<{ name: string; value: number }>>([]);
  const [loading, setLoading] = useState(false);
  const periods = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const g = selectedPeriod.toLowerCase();
        const res = await fetch(`/api/analytics/revenue-series?granularity=${g}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`revenue-series ${res.status}`);
        const json = await res.json();
        if (mounted) setSeries(json.points || []);
      } catch (e) {
        console.warn('[Analytics] revenue-series fetch failed', e);
        if (mounted) setSeries([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [selectedPeriod]);

  return (
    <div className="bg-[#f8f8fb] rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Revenue Over Time</h3>
      </div>
      <div className="h-px bg-gray-300/80 -mx-4 sm:-mx-6 mb-3 sm:mb-4" />
      
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
        {periods.map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-2.5 sm:px-3 py-1 text-xs sm:text-sm transition-colors ${
              selectedPeriod === period
                ? 'text-purple-600 font-medium'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
          {/* Horizontal grid disabled; verticals will be custom so the last one is omitted */}
          <CartesianGrid strokeDasharray="0" stroke="#E5E7EB" vertical={false} horizontal={false} />
          <XAxis 
            dataKey="name" 
            axisLine={{ stroke: '#D1D5DB', strokeWidth: 1 }}
            tickLine={false}
            tick={false}
            interval={0}
          />
          <YAxis 
            axisLine={{ stroke: '#D1D5DB', strokeWidth: 1 }}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            tickFormatter={(value) => `Rs ${Number(value).toLocaleString()}`}
            domain={[0, 'auto']}
          />
          <Tooltip />
          {/* Custom vertical grid lines at each x except the last */}
          {series.slice(0, -1).map((d) => (
            <ReferenceLine key={d.name} x={d.name} stroke="#E5E7EB" strokeWidth={1} />
          ))}
          <Line 
            type="linear" 
            dataKey="value" 
            stroke="#8B5CF6" 
            strokeWidth={2.5}
            dot={{ fill: '#FFFFFF', stroke: '#8B5CF6', strokeWidth: 3, r: 5 }}
            activeDot={{ r: 7, fill: '#FFFFFF', stroke: '#8B5CF6', strokeWidth: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="text-center text-sm text-gray-500 mt-1">
        {loading ? 'Loading…' : 'Time (Days/Months)'}
      </div>
    </div>
  );
}
