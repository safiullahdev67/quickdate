"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, CirclePlay, PauseCircle, SquarePen, Trash } from "lucide-react";
import type { ProfileData } from "@/types/schema";
import { EditProfileModal } from "@/components/ai-profiles/EditProfileModal";

interface ProfilesTableProps {
  profiles: ProfileData[];
  onChanged?: () => void;
}

export function ProfilesTable({ profiles, onChanged }: ProfilesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2000);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Active":
        return "default";
      case "Expired Soon":
        return "secondary";
      case "Expired":
        return "destructive";
      case "Paused":
        return "secondary";
      default:
        return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-success-green/10 text-success-green border-success-green/20";
      case "Expired Soon":
        return "bg-warning-orange/10 text-warning-orange border-warning-orange/20";
      case "Expired":
        return "bg-error-red/10 text-error-red border-error-red/20";
      case "Paused":
        return "bg-primary-purple/10 text-primary-purple border-primary-purple/20";
      default:
        return "";
    }
  };

  const confirmAndDelete = async (id: string) => {
    if (!id) return;
    const yes = window.confirm("Delete this profile?");
    if (!yes) return;
    try {
      const res = await fetch(`/api/ai-profiles/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        showToast("Profile deleted");
        onChanged?.();
      } else {
        alert(data?.error || "Failed to delete");
      }
    } catch (e: any) {
      alert(e?.message || "Failed to delete");
    }
  };

  const viewDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-profiles/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data?.ok && data.item) {
        const it = data.item;
        const msg = [
          `Name: ${it.name ?? "-"}`,
          `Status: ${it.status ?? "-"}`,
          `Gender: ${it.gender ?? "-"}`,
          `Location: ${(it.location?.city || "-")}, ${(it.location?.country || "-")}`,
          `Expires: ${it.expiresAt?._seconds ? new Date(it.expiresAt._seconds * 1000).toLocaleString() : "-"}`,
        ].join("\n");
        alert(msg);
      }
    } catch {}
  };

  const openEdit = (profile: ProfileData) => {
    setEditingId(profile.id);
    setEditOpen(true);
  };

  const toggleStatus = async (profile: ProfileData) => {
    try {
      const endpoint = profile.status === "Paused" ? "play" : "pause";
      const res = await fetch(`/api/ai-profiles/${encodeURIComponent(profile.id)}/${endpoint}`, { method: "POST" });
      const data = await res.json();
      if (data?.ok) {
        showToast(endpoint === "pause" ? "Profile paused" : "Profile resumed");
        onChanged?.();
      }
    } catch {}
  };

  return (
    <div className="bg-bg-card rounded-[32px] border-none p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
        <h2 className="heading-small text-text-secondary text-[16px] md:text-[18px]">All AI Generated Profiles</h2>
        <div className="flex items-center gap-3">
          <div className="w-full md:w-[300px]">
            <Input
              type="text"
              placeholder="Search anything"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-[45px] rounded-[20px] border-none bg-primary-purple/15 placeholder:text-text-muted text-text-secondary pl-4 pr-4"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-[40px] w-[40px] rounded-[12px] bg-primary-purple/15 hover:bg-primary-purple/20 flex-shrink-0"
          >
            <Search size={22} className="text-primary-purple" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-[40px] w-[40px] rounded-[12px] bg-primary-purple/15 hover:bg-primary-purple/20 flex-shrink-0"
          >
            <Filter size={20} className="stroke-primary-purple" fill="none" strokeWidth={2} />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border-light hover:bg-transparent">
              <TableHead className="text-primary-purple font-semibold text-[14px] w-[60px] md:w-[80px]">#</TableHead>
              <TableHead className="text-primary-purple font-semibold text-[14px] min-w-[120px]">Name</TableHead>
              <TableHead className="text-primary-purple font-semibold text-[14px] w-[120px] md:w-[200px]">Status</TableHead>
              <TableHead className="text-primary-purple font-semibold text-[14px] w-[120px] md:w-[150px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile, idx) => (
              <TableRow key={profile.id} className="border-border-light hover:bg-bg-primary/50">
                <TableCell className="text-[14px] text-text-secondary font-medium">{String(idx + 1).padStart(2, '0')}</TableCell>
                <TableCell className="text-[14px] text-text-secondary cursor-pointer" onClick={() => viewDetails(profile.id)}>{profile.name}</TableCell>
                <TableCell>
                  <Badge 
                    variant={getStatusVariant(profile.status)}
                    className={`${getStatusColor(profile.status)} rounded-[8px] px-2 md:px-4 py-1 text-[11px] md:text-[12px] font-medium border`}
                  >
                    {profile.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 md:gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-[28px] w-[28px] md:h-[32px] md:w-[32px] rounded-full bg-success-green/10 hover:bg-success-green/20 border border-success-green/20"
                      onClick={() => toggleStatus(profile)}
                    >
                      {profile.status === "Paused" ? (
                        <CirclePlay size={14} className="text-success-green md:size-4" />
                      ) : (
                        <PauseCircle size={14} className="text-success-green md:size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-[28px] w-[28px] md:h-[32px] md:w-[32px] rounded-full bg-primary-cyan/10 hover:bg-primary-cyan/20 border border-primary-cyan/20"
                      onClick={() => openEdit(profile)}
                    >
                      <SquarePen size={14} className="text-primary-cyan md:size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-[28px] w-[28px] md:h-[32px] md:w-[32px] rounded-full bg-error-red/10 hover:bg-error-red/20 border border-error-red/20"
                      onClick={() => confirmAndDelete(profile.id)}
                    >
                      <Trash size={14} className="text-error-red md:size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <EditProfileModal
        open={editOpen}
        profileId={editingId}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          showToast("Profile updated");
          onChanged?.();
        }}
      />
      {toastMsg && (
        <div className="fixed right-4 bottom-4 z-50 bg-black/80 text-white text-sm px-4 py-2 rounded-md shadow-md">{toastMsg}</div>
      )}
    </div>
  );
}