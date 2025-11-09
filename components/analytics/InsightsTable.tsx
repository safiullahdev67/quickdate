'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { exportAnalyticsAllCSV, exportAnalyticsAllPDF, gatherAnalyticsAll } from '@/lib/exportAnalytics';

type InsightItem = {
  code: string;
  country: string;
  users: number;
  revenue: number;
  engagement: string;
};

function flagSrcFor(code: string): string {
  if (!code || typeof code !== 'string') return '/globe.svg';
  const cc = code.toLowerCase();
  // Use FlagCDN for universal country flags (no dependency install required)
  // Example: https://flagcdn.com/br.svg
  if (cc.length === 2) return `https://flagcdn.com/${cc}.svg`;
  return '/globe.svg';
}

function formatRevenuePKR(n: number): string {
  try {
    // Keep "Rs" prefix for consistency with other cards
    return `Rs ${Math.round(n).toLocaleString('en-PK')}`;
  } catch {
    return `Rs ${Math.round(n)}`;
  }
}

export default function InsightsTable() {
  const [items, setItems] = useState<InsightItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/analytics/region-insights?period=all&maxUsers=20000');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (mounted) setItems(json.items || []);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load insights');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const rows = items ?? [];
  const period = 'all';

  const handleExportCSV = async () => {
    try {
      const payload = await gatherAnalyticsAll(period);
      exportAnalyticsAllCSV(payload);
    } catch (e) {
      console.error('Failed to export analytics CSV', e);
    }
  };

  const handleExportPDF = async () => {
    try {
      const payload = await gatherAnalyticsAll(period);
      await exportAnalyticsAllPDF(payload);
    } catch (e) {
      console.error('Failed to export analytics PDF', e);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Regional & Behavioral Insights</h3>

      {error && (
        <div className="text-red-600 text-sm mb-4">{error}</div>
      )}
      {!items && !error && (
        <div className="text-gray-500 text-sm mb-4">Loading insights…</div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start">
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4">
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="pb-4 text-purple-500 font-medium">Country</th>
                <th className="pb-4 text-purple-500 font-medium">Users</th>
                <th className="pb-4 text-purple-500 font-medium">Revenue</th>
                <th className="pb-4 text-purple-500 font-medium">Engagement</th>
                <th className="pb-4"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isShaded = index % 2 === 0;
                return (
                  <tr key={`${row.code}-${index}`} className="border-t border-gray-100 h-16 align-middle">
                    <td className={`py-3 align-middle pl-4 pr-2 ${isShaded ? 'bg-[#ebeaff] rounded-l-xl' : ''}`}>
                      <div className="flex items-center gap-3">
                        <img src={flagSrcFor(row.code)} alt={`${row.country} flag`} className="w-6 h-6 rounded-sm shrink-0" />
                        <span className="font-medium text-gray-900">{row.country}</span>
                      </div>
                    </td>
                    <td className={`py-3 align-middle text-gray-900 ${isShaded ? 'bg-[#ebeaff]' : ''}`}>{row.users}</td>
                    <td className={`py-3 align-middle text-gray-900 font-medium ${isShaded ? 'bg-[#ebeaff]' : ''}`}>{formatRevenuePKR(row.revenue)}</td>
                    <td className={`py-3 align-middle ${isShaded ? 'bg-[#ebeaff]' : ''}`}>
                      <span className={`text-gray-900 ${row.engagement === 'High' ? 'font-medium' : ''}`}>
                        {row.engagement}
                      </span>
                    </td>
                    <td className="py-3 pl-6 align-middle">
                      {/* Row actions if needed */}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="w-full md:w-48 flex flex-col gap-3">
          <Button
            onClick={handleExportCSV}
            className="h-10 rounded-xl text-white bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] hover:opacity-90"
          >
            Export CSV
          </Button>
          <Button
            onClick={handleExportPDF}
            className="h-10 rounded-xl text-white bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] hover:opacity-90"
          >
            Export PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
