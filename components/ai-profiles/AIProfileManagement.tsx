"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { GenerateProfilesForm } from "./GenerateProfilesForm";
import { ProfilesTable } from "./ProfilesTable";
import { QuickControls } from "./QuickControls";
import type { AIProfileManagementProps, ProfileData } from "@/types/schema";

export function AIProfileManagement(props: AIProfileManagementProps) {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);

  const handleSearch = (query: string) => {
    console.log("Search query:", query);
  };

  const fetchProfiles = async () => {
    try {
      const res = await fetch("/api/ai-profiles?limit=50");
      const data = await res.json();
      if (data?.ok && Array.isArray(data.items)) {
        const now = Date.now();
        const threeDays = 3 * 24 * 60 * 60 * 1000;
        const mapped: ProfileData[] = data.items.map((it: any, idx: number) => {
          let expiresAtMs: number | null = null;
          const ex = it.expiresAt;
          if (ex?.toDate) {
            try { expiresAtMs = ex.toDate().getTime(); } catch {}
          } else if (typeof ex?._seconds === 'number') {
            expiresAtMs = ex._seconds * 1000;
          } else if (typeof ex?.seconds === 'number') {
            expiresAtMs = ex.seconds * 1000;
          } else if (typeof ex === 'string') {
            const t = Date.parse(ex); if (!Number.isNaN(t)) expiresAtMs = t;
          } else if (typeof ex === 'number') {
            expiresAtMs = ex;
          }

          // Precedence: Paused > Expired > Expired Soon > Active
          let status: "Active" | "Expired Soon" | "Expired" | "Paused" = "Active";
          if (String(it.status) === 'Paused') {
            status = 'Paused';
          } else if (typeof expiresAtMs === 'number') {
            if (expiresAtMs < now) status = "Expired";
            else if (expiresAtMs - now <= threeDays) status = "Expired Soon";
            else status = 'Active';
          } else if (typeof it.status === 'string') {
            status = it.status as any;
          }

          return {
            id: String(it.id || idx + 1),
            name: String(it.name || `AI Profile ${idx + 1}`),
            status,
          };
        });
        setProfiles(mapped);
      }
    } catch {
      // keep existing profiles on error
    }
  };

  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userProfile={props.userProfile} onSearch={handleSearch} title="AI Profile Management" />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white">
          
          <div className="mb-4 md:mb-8">
            <GenerateProfilesForm onCreated={fetchProfiles} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-4 md:gap-6">
            <ProfilesTable profiles={profiles} onChanged={fetchProfiles} />
            <QuickControls onChanged={fetchProfiles} />
          </div>
        </div>
      </div>
    </div>
  );
}