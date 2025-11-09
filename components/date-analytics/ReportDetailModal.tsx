'use client';

import React from 'react';
import { X } from 'lucide-react';

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: {
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
  };
}

export default function ReportDetailModal({ isOpen, onClose, reportData }: ReportDetailModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl p-4 sm:p-8 w-full max-w-3xl mx-4 relative shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 sm:top-6 right-4 sm:right-6 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <X className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-8" style={{ color: '#4B164C' }}>
          Reports Detail
        </h2>

        {/* Content with Buttons on Right */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          {/* Left side - Report Details */}
          <div className="flex-1 space-y-4 sm:space-y-6">
            {/* Report By */}
            <div className="flex items-center border-b border-gray-200 pb-3 sm:pb-4">
              <div className="w-28 sm:w-40 md:w-48 text-lg md:text-xl font-semibold" style={{ color: '#8B5CF6' }}>
                Report By:
              </div>
              <div className="flex-1 text-base sm:text-lg md:text-xl text-gray-700">
                <span className="inline-flex items-center gap-2">
                  <img
                    src={reportData.reporterAvatarUrl || "/images/admin-avatar.jpg"}
                    alt="reporter avatar"
                    className="w-8 h-8 rounded-full object-cover border border-purple-200"
                  />
                  <span>{reportData.reportBy}</span>
                </span>
              </div>
            </div>

            {/* Reported User */}
            <div className="flex items-center border-b border-gray-200 pb-3 sm:pb-4">
              <div className="w-28 sm:w-40 md:w-48 text-lg md:text-xl font-semibold" style={{ color: '#8B5CF6' }}>
                Reported User:
              </div>
              <div className="flex-1 text-base sm:text-lg md:text-xl text-red-500">
                <span className="inline-flex items-center gap-2">
                  <img
                    src={reportData.reportedUserAvatarUrl || "/images/admin-avatar.jpg"}
                    alt="reported user avatar"
                    className="w-8 h-8 rounded-full object-cover border border-purple-200"
                  />
                  <span>{reportData.reportedUser}</span>
                </span>
              </div>
            </div>

            {/* Status (moderation) */}
            {reportData.reportedUserStatus && (
              <div className="flex items-center border-b border-gray-200 pb-3 sm:pb-4">
                <div className="w-28 sm:w-40 md:w-48 text-lg md:text-xl font-semibold" style={{ color: '#8B5CF6' }}>
                  Status
                </div>
                <div className="flex-1 text-base sm:text-lg md:text-xl">
                  <span className="inline-block px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-300 text-sm sm:text-base">
                    {reportData.reportedUserStatus}
                  </span>
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="flex items-center border-b border-gray-200 pb-3 sm:pb-4">
              <div className="w-28 sm:w-40 md:w-48 text-lg md:text-xl font-semibold" style={{ color: '#8B5CF6' }}>
                Reason
              </div>
              <div className="flex-1 text-base sm:text-lg md:text-xl text-gray-700">
                {reportData.reason}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center border-b border-gray-200 pb-3 sm:pb-4">
              <div className="w-28 sm:w-40 md:w-48 text-lg md:text-xl font-semibold" style={{ color: '#8B5CF6' }}>
                Location
              </div>
              <div className="flex-1 text-base sm:text-lg md:text-xl text-gray-700">
                {reportData.location}
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center border-b border-gray-200 pb-3 sm:pb-4">
              <div className="w-28 sm:w-40 md:w-48 text-lg md:text-xl font-semibold" style={{ color: '#8B5CF6' }}>
                Time:
              </div>
              <div className="flex-1 text-base sm:text-lg md:text-xl text-gray-700">
                {reportData.time}
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center border-b border-gray-200 pb-3 sm:pb-4">
              <div className="w-28 sm:w-40 md:w-48 text-lg md:text-xl font-semibold" style={{ color: '#8B5CF6' }}>
                Date:
              </div>
              <div className="flex-1 text-base sm:text-lg md:text-xl text-gray-700">
                {reportData.date}
              </div>
            </div>

            {/* User Comment */}
            <div className="flex items-start border-b border-gray-200 pb-3 sm:pb-4">
              <div className="w-28 sm:w-40 md:w-48 text-lg md:text-xl font-semibold" style={{ color: '#8B5CF6' }}>
                User Comment
              </div>
              <div className="flex-1 text-base sm:text-lg md:text-xl text-gray-700">
                {reportData.userComment}
              </div>
            </div>
          </div>

          {/* Right side - Action Buttons */}
          <div className="flex flex-col gap-3 justify-center w-full md:w-52 mt-4 md:mt-0">
            <button
              className="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl text-white font-semibold text-base sm:text-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: '#A78BFA' }}
            >
              Warn
            </button>
            <button
              className="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl text-white font-semibold text-base sm:text-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: '#A78BFA' }}
            >
              Suspend
            </button>
            <button
              className="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl text-white font-semibold text-base sm:text-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: '#A78BFA' }}
            >
              Investigate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
