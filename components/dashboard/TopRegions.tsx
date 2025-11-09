"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import type { RegionData } from "@/types/schema";

interface TopRegionsProps {
  regions: RegionData[];
}

export function TopRegions({ regions }: TopRegionsProps) {
  const [svgRaw, setSvgRaw] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load the world map SVG once on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/images/world-map.svg", { cache: "force-cache" });
        if (!res.ok) throw new Error(`world-map.svg ${res.status}`);
        const text = await res.text();
        if (mounted) setSvgRaw(text);
      } catch (e: any) {
        if (mounted) setError(e?.message || "failed to load svg");
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Build component-scoped CSS that only affects this wrapper
  const scopedCss = useMemo(() => {
    const defaultGrey = "#ECECEC"; // match asset
    let css = `.topregions-map svg path{fill:${defaultGrey} !important;}`;
    regions
      .filter(r => r.code && /^[-A-Za-z0-9_]+$/.test(r.code))
      .forEach((r) => {
        css += `\n.topregions-map svg #${r.code}{fill:${r.color} !important;}`;
      });
    return css;
  }, [regions]);

  return (
    <Card className="rounded-[32px] bg-bg-card p-4 md:p-8 lg:p-6 h-[320px] md:h-[344px] lg:h-[300px] xl:h-[344px] flex flex-col">
      <h3 className="heading-small text-black mb-4 md:mb-6 text-[16px] md:text-[18px]">Top Regions</h3>
      
      <Separator className="mb-4 md:mb-6 bg-border-light" />
      
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-3 md:gap-4">
          {regions.map((region) => (
            <div key={region.type} className="flex items-center gap-2 md:gap-3">
              <div 
                className="w-[18px] h-[12px] rounded-sm" 
                style={{ backgroundColor: region.color }} 
              />
              <span className="text-legend text-black text-[13px] md:text-[14px]">{region.type}</span>
            </div>
          ))}
        </div>
        
        <div className="relative w-[200px] h-[120px] md:w-[273px] md:h-[165px] lg:w-[240px] lg:h-[145px]">
          {/* Component-scoped styles: only target elements inside this wrapper */}
          <style>{scopedCss}</style>
          {svgRaw ? (
            <div
              className="topregions-map absolute inset-0"
              aria-label="World map with highlighted regions"
              dangerouslySetInnerHTML={{ __html: svgRaw }}
            />
          ) : (
            <Image
              src="/images/world-map.svg"
              alt="World Map"
              fill
              className="object-contain"
            />
          )}
        </div>
      </div>
    </Card>
  );
}