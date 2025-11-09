"use client";

import { Button } from "@/components/ui/button";

type TimePeriod = "30days" | "90days" | "6months" | "12months";

interface TimePeriodFilterProps {
  selected: TimePeriod;
  onSelect: (period: TimePeriod) => void;
}

const periods: { value: TimePeriod; label: string }[] = [
  { value: "30days", label: "30 days" },
  { value: "90days", label: "90 days" },
  { value: "6months", label: "6 monts" },
  { value: "12months", label: "12 monts" },
];

export function TimePeriodFilter({ selected, onSelect }: TimePeriodFilterProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 md:gap-4 lg:gap-3 min-w-max">
        {periods.map((period) => (
          <Button
            key={period.value}
            variant={selected === period.value ? "default" : "ghost"}
            className={`text-filter rounded-full px-4 md:px-6 lg:px-5 h-10 md:h-12 lg:h-11 whitespace-nowrap ${
              selected === period.value
                ? "bg-primary-purple text-white hover:bg-primary-purple/90"
                : "bg-[#f5f5f5] text-[#2b2f42] hover:bg-[#ececec]"
            }`}
            onClick={() => onSelect(period.value)}
          >
            {period.label}
          </Button>
        ))}
      </div>
    </div>
  );
}