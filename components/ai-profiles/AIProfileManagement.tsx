"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import UserProfileForm from "@/components/user-profile/UserProfileForm";
import { ProfilesTable } from "./ProfilesTable";
import type { AIProfileManagementProps, ProfileData } from "@/types/schema";

export function AIProfileManagement(props: AIProfileManagementProps) {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = (query: string) => {
    console.log("Search query:", query);
  };

  const fetchProfiles = async () => {
    try {
      const res = await fetch("/api/users?limit=100");
      const data = await res.json();
      console.log('[fetchProfiles] API response:', data);
      if (data?.ok && Array.isArray(data.items)) {
        console.log('[fetchProfiles] Found', data.items.length, 'users');
        setUsers(data.items);
        const mapped: ProfileData[] = data.items.map((u: any, idx: number) => {
          const fn = u.first_name ?? u.firstName ?? "";
          const ln = u.last_name ?? u.lastName ?? "";
          const full = `${String(fn || "").trim()} ${String(ln || "").trim()}`.trim();
          const fallback = u.username || `User ${idx + 1}`;
          return {
            id: String(u.id || idx + 1),
            name: full || String(fallback),
            status: String(u.status || "Active"),
          };
        });
        setProfiles(mapped);
      } else {
        console.warn('[fetchProfiles] Unexpected response format:', data);
      }
    } catch (e) {
      console.error('[fetchProfiles] Error:', e);
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
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 bg-white">
          {mounted && (
            <>
              <div className="mb-0 w-full">
                <UserProfileForm onSaved={fetchProfiles} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:gap-6">
                <ProfilesTable users={users} profiles={profiles} onChanged={fetchProfiles} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}