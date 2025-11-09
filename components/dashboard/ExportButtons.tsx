"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ExportButtonsProps {
  onExportCSV?: () => void;
  onExportPDF?: () => void;
}

export function ExportButtons({ onExportCSV, onExportPDF }: ExportButtonsProps) {
  return (
    <Card className="rounded-[32px] bg-bg-card p-4 md:p-8 lg:p-5 h-auto md:h-[120px] lg:h-[96px] flex items-center">
      <div className="flex flex-col md:flex-row w-full items-stretch md:items-center justify-between gap-3 md:gap-6 lg:gap-3">
        <h3 className="heading-small text-black whitespace-nowrap text-[16px] md:text-[18px]">Quick Export</h3>
        <div className="flex gap-3 md:gap-4 lg:gap-3 w-full md:w-[520px] lg:w-full lg:max-w-[420px] xl:w-[520px]">
          <Button
            variant="outline"
            className="flex-1 h-10 md:h-12 lg:h-10 rounded-full border-2 border-primary-pink text-filter text-[13px] md:text-[14px] lg:text-[13px] text-primary-pink hover:bg-primary-pink/10"
            onClick={onExportCSV}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-10 md:h-12 lg:h-10 rounded-full border-2 border-primary-cyan text-filter text-[13px] md:text-[14px] lg:text-[13px] text-primary-cyan hover:bg-primary-cyan/10"
            onClick={onExportPDF}
          >
            Export PDF
          </Button>
        </div>
      </div>
    </Card>
  );
}