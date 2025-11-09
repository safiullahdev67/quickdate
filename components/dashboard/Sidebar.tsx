"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import HoldingHandsIcon from "@/components/icons/HoldingHandsIcon";
import OverviewIcon from "@/components/icons/OverviewIcon";
import AIProfilesIcon from "@/components/icons/AIProfilesIcon";
import TrustSafetyIcon from "@/components/icons/TrustSafetyIcon";
import AnalyticsIcon from "@/components/icons/AnalyticsIcon";
import DateActivityIcon from "@/components/icons/DateActivityIcon";

export const navigationItems = [
  { icon: OverviewIcon, label: "Overview", href: "/" },
  { icon: AIProfilesIcon, label: "AI Profiles", href: "/ai-profiles" },
  { icon: TrustSafetyIcon, label: "Trust & Safety", href: "/trust-safety" },
  { icon: AnalyticsIcon, label: "Analytics", href: "/analytics" },
  { icon: DateActivityIcon, label: "Date Activity Reports", href: "/date-analytics" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex w-[276px] lg:w-[220px] xl:w-[276px] h-full bg-bg-primary flex-col">
      <div className="flex items-center gap-4 px-9 py-10">
        <div className="w-[53px] h-[52px]">
          <img 
            src="/images/logo.jpg" 
            alt="QuickDate Logo" 
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
        <span className="text-brand text-black">QuickDate</span>
      </div>
      
      <nav className="flex flex-col gap-[34px] px-4 mt-16">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.label} href={item.href}>
              <Button
                variant="ghost"
                className={`justify-start gap-[10px] px-4 py-3 h-auto w-full rounded-[12px] ${
                  isActive 
                    ? "bg-primary-purple/15 text-primary-purple hover:bg-primary-purple/20" 
                    : "text-nav text-black hover:bg-transparent"
                }`}
              >
                <Icon
                  className="size-10 min-w-10"
                  color={isActive ? "#7166f9" : "rgba(87, 83, 83, 0.87)"}
                />
                <span className={`text-[16px] ${isActive ? "text-primary-purple font-semibold" : "text-nav"}`}>
                  {item.label}
                </span>
              </Button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}