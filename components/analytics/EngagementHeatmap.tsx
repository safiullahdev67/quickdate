'use client';

import React, { useEffect, useState } from 'react';

type HeatmapRow = {
  time: string;
  Mon: number; Tue: number; Wed: number; Thu: number; Fri: number; Sat: number; Sun: number;
};

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getIntensityColor = (value: number) => {
  // Map intensity levels to exact design colors
  // 1 -> lightest, 2 -> light, 3 -> dark
  switch (value) {
    case 3:
      return 'bg-[#3e1c96]';
    case 2:
      return 'bg-[#9b8afb]';
    case 1:
      return 'bg-[#ebeaff]';
    default:
      return 'bg-transparent';
  }
};

export default function EngagementHeatmap() {
  const [rows, setRows] = useState<HeatmapRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/analytics/engagement-heatmap?days=14');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (mounted) setRows(json.rows || []);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load heatmap');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const data: HeatmapRow[] = rows ?? [];

  return (
    <div className="bg-[#f8f8fb] rounded-2xl p-4 sm:p-6 shadow-sm">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">User Engagement Heatmap</h3>
      <div className="h-px bg-gray-300/80 -mx-4 sm:-mx-6 mb-3 sm:mb-4" />

      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
      {!rows && !error && <div className="text-sm text-gray-500 mb-3">Loading…</div>}
      
      <div className="overflow-x-auto">
        <div className="flex gap-4 sm:gap-8 min-w-[520px]">
          <div className="flex flex-col justify-between text-xs text-gray-500">
            {data.map((row) => (
              <div key={row.time} className="h-4 flex items-center">
                {row.time}
              </div>
            ))}
          </div>
          
          <div className="flex-1">
            <div className="flex gap-1 mb-2">
              {days.map((day) => (
                <div key={day} className="flex-1 text-center text-xs text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="flex flex-col gap-1">
              {data.map((row) => (
                <div key={row.time} className="flex gap-1">
                  {days.map((day) => (
                    <div
                      key={day}
                      className={`flex-1 h-4 rounded ${getIntensityColor((row as any)[day] as number)}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
