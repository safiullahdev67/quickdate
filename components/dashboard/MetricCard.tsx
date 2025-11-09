"use client";

import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";

interface MetricCardProps {
  icon?: ReactNode;
  value: string | number;
  label: string;
  percentageChange?: number;
  isIncrease?: boolean;
  variant?: "default" | "gradient";
  showHelpIcon?: boolean; // show small question icon on default variant cards
}

export function MetricCard({
  icon,
  value,
  label,
  percentageChange,
  isIncrease,
  variant = "default",
  showHelpIcon = false,
}: MetricCardProps) {
  const formattedValue = typeof value === "number" ? value.toLocaleString() : value;
  
  return (
    <Card
      className={`relative rounded-[32px] w-full md:w-[242px] h-[187px] md:h-[187px] lg:w-[140px] lg:h-[145px] xl:w-[242px] xl:h-[187px] overflow-hidden ${
        variant === "gradient" ? 'bg-[#4CD7F6]' : 'bg-[#f6f6fb]'
      }`}
    >
      {variant === "gradient" ? (
        <>
          <img
            src="/images/card1bg.png"
            alt="Background gradient"
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
          
          {/* Icon container with background */}
          {icon && (
            <div 
              className="absolute z-10 flex items-center justify-center left-[35px] top-[17px] w-[52px] h-[52px] lg:left-[14px] lg:top-[10px] lg:w-[36px] lg:h-[36px]"
            >
              {icon}
            </div>
          )}
          
          {/* Percentage indicator at top-right */}
          {percentageChange !== undefined && (
            <div 
              className="absolute flex items-center gap-1 z-10 right-[37px] top-[41px] lg:right-[18px] lg:top-[20px]"
            >
              <svg width="13" height="7" viewBox="0 0 13 7" fill="none">
                <path d="M6.5 0L13 7H0L6.5 0Z" fill="#14ed44" />
              </svg>
              <span className="text-[12px] font-normal text-white" style={{ fontFamily: 'Roboto, sans-serif' }}>
                {percentageChange}%
              </span>
            </div>
          )}
          
          {/* Value */}
          <div 
            className="absolute text-[32px] lg:text-[22px] leading-none tracking-tight font-medium text-[#f6f6fb] z-10 left-[25px] top-[90px] lg:left-[16px] lg:top-[64px]"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            {formattedValue}
          </div>
          
          {/* Label */}
          <div 
            className="absolute text-[16px] lg:text-[13px] font-semibold text-[#f6f6fb] opacity-[0.72] z-10 left-[25px] top-[134px] lg:left-[16px] lg:top-[98px] whitespace-nowrap overflow-hidden text-ellipsis pr-[28px] lg:pr-[20px]"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            {label}
          </div>
          
          {/* Question icon - use provided SVG asset */}
          <div
            className="absolute z-10 right-[22px] bottom-[22px] w-[24px] h-[24px] lg:right-[10px] lg:bottom-[10px] lg:w-[18px] lg:h-[18px]"
          >
            <img
              src="/images/question.svg"
              alt="Help"
              className="w-full h-full object-contain"
            />
          </div>
        </>
      ) : (
        <>
          {/* Default variant layout - absolute positioning for pixel perfection */}
          {/* Icon top-left with soft background */}
          {icon && (
            <div
              className="absolute z-10 flex items-center justify-center left-[25px] top-[20px] w-[52px] h-[52px] lg:left-[16px] lg:top-[12px] lg:w-[36px] lg:h-[36px]"
            >
              {icon}
            </div>
          )}

          {/* Percentage indicator at top-right */}
          {percentageChange !== undefined && (
            <div
              className="absolute flex items-center gap-1 z-10 right-[30px] top-[38px] lg:right-[14px] lg:top-[18px]"
            >
              <svg width="13" height="7" viewBox="0 0 13 7" fill="none">
                <path d="M6.5 0L13 7H0L6.5 0Z" fill="#14ed44" />
              </svg>
              <span className="text-[12px] font-normal text-[#2b2f42]" style={{ fontFamily: 'Roboto, sans-serif' }}>
                {percentageChange}%
              </span>
            </div>
          )}

          {/* Value */}
          <div
            className="absolute text-[32px] lg:text-[22px] leading-none tracking-tight font-semibold text-[#2b2f42] z-10 left-[25px] top-[90px] lg:left-[16px] lg:top-[64px]"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            {formattedValue}
          </div>

          {/* Label */}
          <div
            className="absolute text-[16px] lg:text-[13px] font-medium text-[#2b2f42] opacity-[0.72] z-10 left-[25px] top-[134px] lg:left-[16px] lg:top-[98px] whitespace-nowrap overflow-hidden text-ellipsis pr-[28px] lg:pr-[20px]"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            {label}
          </div>

          {/* Question icon (default cards) - purple, mid-right */}
          {showHelpIcon && (
            <div
              className="absolute z-10 right-[22px] bottom-[22px] w-[24px] h-[24px] lg:right-[10px] lg:bottom-[10px] lg:w-[18px] lg:h-[18px]"
            >
              {/* Purple question mark only, no background */}
              <div
                aria-hidden
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#7166f9',
                  WebkitMask: 'url(/images/question.svg) no-repeat center / contain',
                  mask: 'url(/images/question.svg) no-repeat center / contain',
                }}
              />
            </div>
          )}
        </>
      )}
    </Card>
  );
}