"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { LiveFeed } from "./LiveFeed";
import { ReportsTable } from "./ReportsTable";
import { StatusCard } from "./StatusCard";
import type { UserProfileData } from "@/types/schema";
import type { TrustSafetyData } from "@/lib/trustSafetyMockData";

interface TrustSafetyProps {
  userProfile: UserProfileData;
  data: TrustSafetyData;
}

export function TrustSafety({ userProfile, data }: TrustSafetyProps) {
  const handleSearch = (query: string) => {
    console.log("Search query:", query);
  };

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userProfile={userProfile} onSearch={handleSearch} title="Trust & Safety" />
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-white">
          <div className="space-y-6">
            {/* Top Row: Real-time Scam & Spam Detection and Reports side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Real-time Scam & Spam Detection Card */}
              <div className="bg-[#f8f8f8] rounded-[16px] overflow-hidden border border-gray-200">
                <div className="px-6 pt-6 pb-4">
                  <h2 className="text-[20px] font-semibold text-black mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    Real-time Scam & Spam Detection
                  </h2>
                  <div className="h-[2px] bg-gray-300 -mx-6" />
                </div>
                <LiveFeed items={data.liveFeed} />
              </div>

              {/* Reports Section */}
              <div>
                <ReportsTable reports={data.reports} />
              </div>
            </div>

            {/* Status Card */}
            <div>
              <StatusCard 
                totalReports={data.statusCard.totalReports}
                resolved={data.statusCard.resolved}
                pending={data.statusCard.pending}
                categories={data.statusCard.categories}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
