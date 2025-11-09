"use client";

import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { ReportsData } from "@/types/schema";

interface ReportsDonutChartProps {
  data: ReportsData;
}

export function ReportsDonutChart({ data }: ReportsDonutChartProps) {
  const palette = ["#4cd7f6", "#e17cfd", "#7166f9", "#ffa800", "#f64e60", "#10B981"]; // cyan, pink, purple, orange, red, green

  // Prepare legend and donut values: top 5 + 'Others'
  const breakdown = data.breakdown ?? [];
  const topItems = breakdown.slice(0, 5);
  const rest = breakdown.slice(5);
  const restPercentage = Math.max(0, 100 - topItems.reduce((acc, x) => acc + (x.percentage || 0), 0));
  const restCount = rest.reduce((acc, x) => acc + (x.count || 0), 0);
  const withOthers = topItems.concat(rest.length > 0 && restPercentage > 0 ? [{ name: "Others", count: restCount, percentage: restPercentage }] as any : []);

  const chartData = (withOthers.length ? withOthers : [{ name: "No Data", count: 0, percentage: 0 }])
    .map((item, idx) => ({ name: item.name, value: item.percentage, color: palette[idx % palette.length], count: item.count }));

  const top = breakdown[0] || { name: "-", percentage: 0 } as any;
  const animationDuration = 900;

  const formatLabel = (s: string) => {
    const clean = (s ?? "").replace(/_/g, " ").trim();
    if (!clean) return "-";
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  return (
    <Card className="rounded-[32px] bg-bg-card border border-bg-primary p-4 md:p-6 overflow-hidden relative min-h-[180px] md:min-h-[190px]">
      {/* Header */}
      <h3 className="heading-small text-black mb-1 text-[16px] md:text-[18px]">Reports Received</h3>
      
      {/* Horizontal divider */}
      <div className="w-full h-px bg-[#C4C4C4] mb-3" />
      
      {/* Content row: legend on left, donut on right */}
      <div className="flex items-center justify-between gap-4 md:gap-6 min-w-0">
        {/* Left: Legend */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 max-h-[150px] overflow-auto pr-1">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <div className="w-[18px] h-[12px] rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-legend text-black max-w-[140px] truncate" title={formatLabel(item.name)}>{formatLabel(item.name)}</span>
              <span className="text-legend text-black font-medium ml-auto">{item.value}%</span>
            </div>
          ))}
        </div>
        
        {/* Right: Donut chart */}
        <div className="relative w-[128px] h-[128px] md:w-[140px] md:h-[140px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* Track ring (background) */}
              <Pie
                data={[{ name: 'track', value: 100 }]}
                cx="50%"
                cy="50%"
                startAngle={90}
                endAngle={-270}
                innerRadius={44}
                outerRadius={56}
                fill="#EEF1F6"
                stroke="none"
                dataKey="value"
                isAnimationActive={false}
              />
              {/* Value segments */}
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                startAngle={90}
                endAngle={-270}
                innerRadius={44}
                outerRadius={56}
                paddingAngle={2}
                cornerRadius={6}
                stroke="transparent"
                isAnimationActive
                animationBegin={0}
                animationDuration={animationDuration}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center text */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[22px] md:text-[24px] font-extrabold text-black leading-none">{top.percentage ?? 0}%</span>
            <span className="text-[11px] md:text-[12px] text-[#9CA3AF] mt-1 max-w-[96px] truncate text-center" title={formatLabel(top.name || '-')}>{formatLabel(top.name || '-')}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}