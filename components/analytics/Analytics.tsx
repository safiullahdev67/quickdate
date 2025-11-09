'use client';

import React from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import StatsCards from './StatsCards';
import RevenueChart from './RevenueChart';
import SubscriptionChart from './SubscriptionChart';
import EngagementHeatmap from './EngagementHeatmap';
import InsightsTable from './InsightsTable';
 

export default function Analytics() {
  const handleSearch = (query: string) => {
    console.log('Search query:', query);
  };

  // Mock user profile data
  const userProfile = {
    name: 'Admin',
    avatarUrl: '/images/admin-avatar.jpg',
  };
 

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userProfile={userProfile} onSearch={handleSearch} title="Analytics" />
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-white">
          {/* Stats Cards */}
          <StatsCards />


          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <RevenueChart />
            <SubscriptionChart />
            <EngagementHeatmap />
          </div>

          {/* Insights Table */}
          <InsightsTable />
        </div>
      </div>
    </div>
  );
}
