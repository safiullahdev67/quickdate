'use client';

import React, { useEffect, useState } from 'react';
import { Heart, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
// Using static import for DateMap since this is a client component
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import DateMap from '@/components/date-analytics/DateMap';
import ReportDetailModal from '@/components/date-analytics/ReportDetailModal';

// Previously used dynamic import; static import is fine because both are client components

interface ReportData {
  reportBy: string;
  reportedUser: string;
  reason: string;
  location: string;
  time: string;
  date: string;
  userComment: string;
  reportedUserStatus?: string;
  reporterAvatarUrl?: string;
  reportedUserAvatarUrl?: string;
}

export default function DateAnalytics() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [ongoingCount, setOngoingCount] = useState<number | null>(null);
  const [loadingOngoing, setLoadingOngoing] = useState(false);
  const [reportItems, setReportItems] = useState<Array<{ id: string; reporterUid?: string; reportedUserUid?: string; reportBy: string; reportedUser: string; reason: string; createdAtMs: number; status?: string; reportByDisplay?: string; reportedUserDisplay?: string; reportedUserModStatus?: string | null; reporterAvatarUrl?: string | null; reportedUserAvatarUrl?: string | null }>>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const handleSearch = (query: string) => {
    console.log('Search query:', query);
  };

  const userProfile = {
    name: 'Admin',
    avatarUrl: '/images/admin-avatar.jpg',
  };

  const handleReportClick = (report: ReportData) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

  // Load accepted matches count for Ongoing Dates
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoadingOngoing(true);
        const res = await fetch('/api/analytics/ongoing-dates?sinceHours=2160', { cache: 'no-store' }); // last 90 days
        if (!res.ok) throw new Error(`ongoing-dates ${res.status}`);
        const data = await res.json();
        if (mounted) setOngoingCount(Number(data?.count ?? 0));
      } catch (e) {
        if (mounted) setOngoingCount(0);
      } finally {
        if (mounted) setLoadingOngoing(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Load recent reports from Firestore (top-level or collectionGroup)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoadingReports(true);
        const res = await fetch('/api/analytics/date-reports?limit=20&sinceHours=2160', { cache: 'no-store' });
        if (!res.ok) throw new Error(`date-reports ${res.status}`);
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        if (mounted) setReportItems(items);
      } catch (e) {
        if (mounted) setReportItems([]);
      } finally {
        if (mounted) setLoadingReports(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div suppressHydrationWarning className="flex h-screen bg-bg-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userProfile={userProfile} onSearch={handleSearch} title="Date Activity" />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-white">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Ongoing Dates */}
            <div className="rounded-3xl p-4 sm:p-6 relative overflow-hidden" style={{ backgroundColor: '#FDE7EA' }}>
              <img src="/images/date-1.svg" alt="Ongoing Dates" className="absolute top-4 left-4 w-8 h-8 sm:w-10 sm:h-10" />
              <div className="mt-12">
                <div className="text-3xl md:text-4xl font-bold" style={{ color: '#1F2A44' }}>
                  {loadingOngoing && ongoingCount === null ? '…' : (ongoingCount ?? 0)}
                </div>
                <div className="mt-1 font-medium" style={{ color: '#1F2A44' }}>Ongoing Dates</div>
              </div>
            </div>

            {/* Location Active */}
            <div className="rounded-3xl p-4 sm:p-6 relative overflow-hidden" style={{ backgroundColor: '#FFF3D7' }}>
              <img src="/images/date-2.svg" alt="Location Active" className="absolute top-4 left-4 w-8 h-8 sm:w-10 sm:h-10" />
              <div className="mt-12">
                <div className="text-3xl md:text-4xl font-bold" style={{ color: '#1F2A44' }}>12</div>
                <div className="mt-1 font-medium" style={{ color: '#1F2A44' }}>Location Active</div>
              </div>
            </div>

            {/* Completed Safely */}
            <div className="rounded-3xl p-4 sm:p-6 relative overflow-hidden" style={{ backgroundColor: '#E8F9EE' }}>
              <img src="/images/date-3.svg" alt="Completed Safely" className="absolute top-4 left-4 w-8 h-8 sm:w-10 sm:h-10" />
              <div className="mt-12">
                <div className="text-3xl md:text-4xl font-bold" style={{ color: '#1F2A44' }}>106</div>
                <div className="mt-1 font-medium" style={{ color: '#1F2A44' }}>Completed Safely</div>
              </div>
            </div>

            {/* Reported Dates */}
            <div className="rounded-3xl p-4 sm:p-6 relative overflow-hidden" style={{ backgroundColor: '#EFE6FF' }}>
              <img src="/images/date-4.svg" alt="Reported Dates" className="absolute top-4 left-4 w-8 h-8 sm:w-10 sm:h-10" />
              <div className="mt-12">
                <div className="text-3xl md:text-4xl font-bold" style={{ color: '#1F2A44' }}>6</div>
                <div className="mt-1 font-medium" style={{ color: '#1F2A44' }}>Reported Dates</div>
              </div>
            </div>
          </div>

          {/* Map and Incident Reports Section */}
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-8 items-stretch">
            {/* Map */}
            <div className="flex-1">
              <DateMap />
            </div>

            {/* Incident Reports */}
            <div className="w-full md:w-80">
              <div className="rounded-3xl p-4 sm:p-5 shadow-sm h-[400px] flex flex-col" style={{ backgroundColor: '#F8F8FB' }}>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Incident Reports</h3>
                <div className="space-y-3 overflow-y-auto pr-1">
                  {loadingReports && reportItems.length === 0 && (
                    <div className="text-sm text-gray-500">Loading reports…</div>
                  )}
                  {!loadingReports && reportItems.length === 0 && (
                    <div className="text-sm text-gray-500">No recent reports.</div>
                  )}
                  {reportItems.map((r) => {
                    const dt = new Date(r.createdAtMs || 0);
                    const time = dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                    const date = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 p-3 rounded-2xl border cursor-pointer hover:shadow-md transition-shadow"
                        style={{ borderColor: '#E6E1F8', backgroundColor: '#F8F8FB' }}
                        onClick={() => handleReportClick({
                          reportBy: r.reportByDisplay || r.reportBy || '-',
                          reportedUser: r.reportedUserDisplay || r.reportedUser || '-',
                          reason: r.reason || 'Other',
                          location: 'Berlin Park', // static for now
                          time,
                          date,
                          userComment: 'User did not show up for the scheduled date.', // static for now
                          reportedUserStatus: r.reportedUserModStatus || undefined,
                          // pass avatars to modal
                          reporterAvatarUrl: r.reporterAvatarUrl || undefined,
                          reportedUserAvatarUrl: r.reportedUserAvatarUrl || undefined,
                        })}
                      >
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <img
                            src={r.reportedUserAvatarUrl || r.reporterAvatarUrl || "/images/admin-avatar.jpg"}
                            alt="user avatar"
                            className="w-10 h-10 rounded-full object-cover border border-purple-200"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/admin-avatar.jpg'; }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-xs text-gray-500 truncate max-w-[7.5rem]">{r.reportByDisplay || r.reportBy}</span>
                            <span className="text-xs text-gray-400">–</span>
                            <span className="text-xs text-red-500 truncate max-w-[7.5rem]">{r.reportedUserDisplay || r.reportedUser}</span>
                            {r.reportedUserModStatus && (
                              <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-300 whitespace-nowrap">
                                {r.reportedUserModStatus}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{r.reason}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Date Logs Table */}
          <div className="bg-white rounded-lg shadow-sm">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              Date Logs
            </h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-sm font-medium text-purple-600">Users ID</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-purple-600">Users-1</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-purple-600">Users-2</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-purple-600">Location</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-purple-600">Date Time</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-purple-600">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-purple-600">Report Filed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50" style={{ backgroundColor: '#EBEAFF' }}>
                    <td className="px-6 py-4 text-sm text-gray-900">DT-3021</td>
                    <td className="px-6 py-4 text-sm text-gray-900">@sofia_9</td>
                    <td className="px-6 py-4 text-sm text-gray-900">@adam_7</td>
                    <td className="px-6 py-4 text-sm text-gray-900">Café Aylanto</td>
                    <td className="px-6 py-4 text-sm text-gray-900">6:30 PM, 18 oct,2025</td>
                    <td className="px-6 py-4 text-sm text-gray-900">Completed</td>
                    <td className="px-6 py-4 text-sm text-gray-900">No</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">DT-3022</td>
                    <td className="px-6 py-4 text-sm text-gray-900">@lena_28</td>
                    <td className="px-6 py-4 text-sm text-gray-900">@mark_G</td>
                    <td className="px-6 py-4 text-sm text-gray-900">Berlin Park</td>
                    <td className="px-6 py-4 text-sm text-gray-900">8:30 PM, 18 oct,2025</td>
                    <td className="px-6 py-4 text-sm text-gray-900">Active</td>
                    <td className="px-6 py-4 text-sm text-gray-900">No</td>
                  </tr>
                  <tr className="hover:bg-gray-50" style={{ backgroundColor: '#EBEAFF' }}>
                    <td className="px-6 py-4 text-sm text-gray-900">DT-3023</td>
                    <td className="px-6 py-4 text-sm text-gray-900">@aisha_54</td>
                    <td className="px-6 py-4 text-sm text-gray-900">@leo_khan</td>
                    <td className="px-6 py-4 text-sm text-gray-900">Centaurus</td>
                    <td className="px-6 py-4 text-sm text-gray-900">7:30 PM, 18 oct,2025</td>
                    <td className="px-6 py-4 text-sm text-gray-900">Reported</td>
                    <td className="px-6 py-4 text-sm text-gray-900">Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          reportData={selectedReport}
        />
      )}
    </div>
  );
}
