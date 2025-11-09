"use client";

import { ReportCategory } from "@/lib/trustSafetyMockData";

interface StatusCardProps {
  totalReports: number;
  resolved: number;
  pending: number;
  categories: ReportCategory[];
}

export function StatusCard({ totalReports, resolved, pending, categories }: StatusCardProps) {
  // Calculate angles for donut chart
  const total = categories.reduce((sum, cat) => sum + cat.value, 0);
  let currentAngle = 0;

  const segments = categories.map(cat => {
    const percentage = (cat.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const segment = {
      ...cat,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      percentage
    };
    currentAngle += angle;
    return segment;
  });

  // Create SVG path for donut segment
  const createArc = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) => {
    const start = polarToCartesian(100, 100, outerRadius, endAngle);
    const end = polarToCartesian(100, 100, outerRadius, startAngle);
    const innerStart = polarToCartesian(100, 100, innerRadius, endAngle);
    const innerEnd = polarToCartesian(100, 100, innerRadius, startAngle);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", start.x, start.y,
      "A", outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
      "L", innerEnd.x, innerEnd.y,
      "A", innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
      "Z"
    ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  return (
    <div className="bg-[#f8f8f8] rounded-[16px] border border-gray-200 p-4 sm:p-6">
      <h3 className="text-[18px] sm:text-[20px] font-semibold text-black mb-4 sm:mb-6" style={{ fontFamily: 'Roboto, sans-serif' }}>
        Status Card
      </h3>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-2">
        {/* Left side - Stats */}
        <div className="w-full md:w-[340px] pl-2 md:pl-12">
          <div className="space-y-4">
            <div>
              <div className="grid grid-cols-[120px_auto] md:grid-cols-[140px_auto] items-baseline gap-x-2 pb-2">
                <span className="text-[18px] md:text-[22px] font-semibold text-[#1a1a1a]" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Total Reports:
                </span>
                <span className="text-[16px] md:text-[20px] text-[#666]" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {totalReports} Reports
                </span>
              </div>
              <div className="h-px bg-gray-300 w-full" />
            </div>
            <div>
              <div className="grid grid-cols-[120px_auto] md:grid-cols-[140px_auto] items-baseline gap-x-2 pb-2">
                <span className="text-[18px] md:text-[22px] font-semibold text-[#1a1a1a]" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Resolved:
                </span>
                <span className="text-[16px] md:text-[20px] text-[#666]" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {resolved} Reports
                </span>
              </div>
              <div className="h-px bg-gray-300 w-full" />
            </div>
            <div>
              <div className="grid grid-cols-[120px_auto] md:grid-cols-[140px_auto] items-baseline gap-x-2 pb-2">
                <span className="text-[18px] md:text-[22px] font-semibold text-[#1a1a1a]" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Pending:
                </span>
                <span className="text-[16px] md:text-[20px] text-[#666]" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {pending} Reports
                </span>
              </div>
              <div className="h-px bg-gray-300 w-full" />
            </div>
          </div>
        </div>

        {/* Center - Donut Chart */}
        <div className="relative w-[160px] h-[160px] md:w-[220px] md:h-[220px] mx-auto md:mx-0 flex-shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {segments.map((segment, index) => (
              <path
                key={index}
                d={createArc(segment.startAngle, segment.endAngle, 60, 90)}
                fill={segment.color}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[12px] md:text-[13px] text-gray-500 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Total Reports
            </div>
            <div className="text-[28px] md:text-[36px] font-bold text-gray-900" style={{ fontFamily: 'Roboto, sans-serif' }}>
              {totalReports}
            </div>
          </div>
        </div>

        {/* Right side - Legend */}
        <div className="w-full md:w-[300px] mt-4 md:mt-0">
          <div className="grid grid-cols-[140px_60px_50px] md:grid-cols-[160px_60px_50px] gap-x-3 text-[14px] md:text-[15px] font-medium text-[#666] pb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
            <span className="text-left">Reports</span>
            <span className="text-center">Value</span>
            <span className="text-right">%</span>
          </div>
          <div className="h-px bg-gray-300 mb-3 w-full" />
          <div className="space-y-2">
            {categories.map((category, index) => (
              <div key={index} className="grid grid-cols-[140px_60px_50px] md:grid-cols-[160px_60px_50px] gap-x-3 items-center">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-[14px] md:text-[15px] text-[#333]" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    {category.name}
                  </span>
                </div>
                <span className="text-[14px] md:text-[15px] text-[#333] text-center font-semibold" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {category.value}
                </span>
                <span className="text-[14px] md:text-[15px] text-[#333] text-right font-semibold" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {category.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
