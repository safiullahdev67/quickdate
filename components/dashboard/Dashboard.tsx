"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { TimePeriodFilter } from "./TimePeriodFilter";
import { MetricCard } from "./MetricCard";
import { RevenueChart } from "./RevenueChart";
import { ReportsDonutChart } from "./ReportsDonutChart";
import { ExportButtons } from "./ExportButtons";
import { TopRegions } from "./TopRegions";
import RobotIcon from "@/components/icons/RobotIcon";
import BarChartIcon from "@/components/icons/BarChartIcon";
import CreditCardIcon from "@/components/icons/CreditCardIcon";
import type { DashboardProps } from "@/types/schema";
import { exportDashboardCSV, exportDashboardPDF } from "@/lib/exportDashboard";

type TimePeriod = "30days" | "90days" | "6months" | "12months";

export function Dashboard(props: DashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("30days");
  const [revenue, setRevenue] = useState(props.totalRevenue);
  const [loadingRevenue, setLoadingRevenue] = useState(false);

  // Load revenue series when the period changes
  useEffect(() => {
    let aborted = false;
    async function load() {
      setLoadingRevenue(true);
      try {
        const res = await fetch(`/api/revenue?period=${selectedPeriod}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Revenue request failed: ${res.status}`);
        const data = await res.json();
        if (!aborted) setRevenue(data);
      } catch (e) {
        console.warn("[Dashboard] Failed to fetch revenue data", e);
      } finally {
        if (!aborted) setLoadingRevenue(false);
      }
    }
    load();
    return () => {
      aborted = true;
    };
  }, [selectedPeriod]);
  
  const handleSearch = (query: string) => {
    console.log("Search query:", query);
  };
  
  const handleExportCSV = () => {
    try {
      exportDashboardCSV(props, revenue, selectedPeriod);
    } catch (e) {
      console.error("Failed to export CSV", e);
    }
  };
  
  const handleExportPDF = async () => {
    try {
      await exportDashboardPDF(props, revenue, selectedPeriod);
    } catch (e) {
      console.error("Failed to export PDF", e);
    }
  };
  
  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userProfile={props.userProfile} onSearch={handleSearch} />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-4 bg-white">
          <div className="flex justify-end mb-4 md:mb-6">
            <TimePeriodFilter selected={selectedPeriod} onSelect={setSelectedPeriod} />
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 lg:gap-2 mb-4 md:mb-6">
            {/* Left side: 4 metric cards in grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 md:gap-x-[24px] md:gap-y-[30px] lg:gap-x-3 lg:gap-y-3 lg:w-[300px] xl:w-auto">
              <MetricCard
                icon={<img src="/images/person.svg" alt="Person Icon" width="32" height="32" />}
                value={props.activeUsers.count}
                label="Active Users"
                percentageChange={props.activeUsers.percentageChange}
                isIncrease={props.activeUsers.isIncrease}
                variant="gradient"
              />
              
              <MetricCard
                icon={<RobotIcon width={33} height={32} color="#7166f9" />}
                value={props.aiProfiles.count}
                label="AI Profiles"
                showHelpIcon
              />
              
              <MetricCard
                icon={<BarChartIcon width={24} height={25} color="#7166f9" />}
                value={`Rs ${props.todaysRevenue.amount.toLocaleString()}`}
                label="Todays Revenue"
                percentageChange={props.todaysRevenue.percentageChange}
                isIncrease={props.todaysRevenue.isIncrease}
              />
              
              <MetricCard
                icon={<CreditCardIcon width={33} height={33} color="#7166f9" />}
                value={props.activeSubscriptions.count}
                label="Active Subscriptions"
                percentageChange={props.activeSubscriptions.percentageChange}
                isIncrease={props.activeSubscriptions.isIncrease}
              />
            </div>
            
            {/* Right side: Revenue chart */}
            <div className="flex-1">
              <RevenueChart data={revenue} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-4 items-stretch">
            {/* Left column: donut chart only on desktop, export buttons on mobile */}
            <div className="flex flex-col gap-4 md:gap-6 lg:gap-4">
              <ReportsDonutChart data={props.reportsReceived} />
              {/* Export buttons only on desktop */}
              <div className="hidden md:block">
                <ExportButtons onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />
              </div>
            </div>
            {/* Right column: Top regions */}
            <TopRegions regions={props.topRegions} />
          </div>
          
          {/* Export buttons below Top Regions on mobile */}
          <div className="md:hidden mt-4">
            <ExportButtons onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />
          </div>
        </div>
      </div>
    </div>
  );
}