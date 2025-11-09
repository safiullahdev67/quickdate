"use client";

import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useState } from "react";
import type { TotalRevenueData } from "@/types/schema";

interface RevenueChartProps {
  data: TotalRevenueData;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [activeX, setActiveX] = useState<string | number | null>(null);
  return (
    <Card className="rounded-[32px] bg-bg-card border border-bg-primary p-4 md:p-8 lg:p-6 h-[350px] md:h-[404px] lg:h-[340px] xl:h-[404px] flex flex-col">
      <div className="flex justify-between items-center mb-3 md:mb-4">
        <h3 className="heading-small text-black text-[16px] md:text-[18px]">Total Revenue</h3>
        <span className="heading-medium text-primary-purple text-[18px] md:text-[20px]">Rs {data.amount.toLocaleString()}</span>
      </div>
      {/* Divider under header */}
      <div className="w-full h-px bg-[#C4C4C4] mb-3 md:mb-4" />
      
      <div className="w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data.chartData}
            margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
            onMouseMove={(state: any) => {
              if (state && state.isTooltipActive) {
                setActiveX(state.activeLabel ?? null);
              }
            }}
            onMouseLeave={() => setActiveX(null)}
          >
            <CartesianGrid strokeDasharray="0" stroke="#C4C4C4" horizontal={false} vertical={true} />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#aeaeae", fontSize: 10, fontFamily: "Roboto" }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#aeaeae", fontSize: 10, fontFamily: "Roboto" }}
              tickMargin={12}
              width={36}
              ticks={[0, 500, 1000, 1500, 2000]}
            />
            <Tooltip
              offset={-28}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="relative rounded-xl px-3 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.2)]" style={{ background: '#2F2F2F' }}>
                      <p className="text-white text-[12px] font-bold">Rs {payload[0].value}</p>
                      <p className="text-white/70 text-[12px]">Revenue</p>
                      {/* Down arrow */}
                      <div
                        className="absolute left-1/2 bottom-0 -translate-x-1/2"
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid #2F2F2F',
                        }}
                      />
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Bold vertical line on hover */}
            {activeX !== null && (
              <ReferenceLine x={activeX as any} stroke="#C4C4C4" strokeWidth={3} />
            )}

            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#7166f9" 
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: "#7166f9" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}