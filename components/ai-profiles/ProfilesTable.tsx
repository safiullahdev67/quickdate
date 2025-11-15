"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, SquarePen, Trash } from "lucide-react";
import type { ProfileData } from "@/types/schema";
import { UserEditModal } from "../user-profile/UserEditModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProfilesTableProps {
  users?: any[];
  profiles?: ProfileData[];
  onChanged?: () => void;
}

export function ProfilesTable({ users = [], profiles = [], onChanged }: ProfilesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female" | "binary">("all");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2000);
  };

  

  const confirmAndDelete = async (id: string) => {
    if (!id) return;
    const yes = window.confirm("Delete this profile?");
    if (!yes) return;
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });
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
      const res = await fetch(`/api/users/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data?.ok && data.item) {
        const it = data.item;
        const full = `${String(it.first_name ?? it.firstName ?? "").trim()} ${String(it.last_name ?? it.lastName ?? "").trim()}`.trim();
        const msg = [
          `Name: ${full || it.username || '-'}`,
          `Email: ${it.email ?? "-"}`,
          `Gender: ${it.gender ?? "-"}`,
        ].join("\n");
        alert(msg);
      }
    } catch {}
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setEditOpen(true);
  };

  // Compute rows with search and gender filter
  const rows = (() => {
    const q = searchQuery.trim().toLowerCase();
    // Prefer users if provided (has gender)
    if (Array.isArray(users) && users.length) {
      let list = users.map((u: any, idx: number) => {
        const fn = u.first_name ?? u.firstName ?? "";
        const ln = u.last_name ?? u.lastName ?? "";
        const full = `${String(fn || "").trim()} ${String(ln || "").trim()}`.trim();
        return {
          id: String(u.id || idx + 1),
          name: full || String(u.username || `User ${idx + 1}`),
          gender: String(u.gender || "").toLowerCase(),
        };
      });
      if (q) list = list.filter((r) => r.name.toLowerCase().includes(q));
      if (genderFilter !== "all") list = list.filter((r) => r.gender === genderFilter);
      return list;
    }
    // Fallback to profiles-only filtering by name
    let list = profiles.map((p, i) => ({ id: p.id, name: p.name }));
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q));
    return list;
  })();

  return (
    <div className="bg-bg-card rounded-[32px] border-none p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
        <h2 className="heading-small text-text-secondary text-[16px] md:text-[18px]">All Users</h2>
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
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter size={20} className="stroke-primary-purple" fill="none" strokeWidth={2} />
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-4 md:mb-6 bg-white rounded-[16px] border border-[rgba(113,102,249,0.2)] p-3 md:p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-secondary">Gender</label>
              <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as any)}>
                <SelectTrigger className="h-[40px] w-[160px] rounded-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="binary">Non-binary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" onClick={() => { setGenderFilter("all"); setSearchQuery(""); }}>Reset</Button>
              <Button onClick={() => setShowFilters(false)}>Apply</Button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border-light hover:bg-transparent">
              <TableHead className="text-primary-purple font-semibold text-[14px] w-[60px] md:w-[80px]">#</TableHead>
              <TableHead className="text-primary-purple font-semibold text-[14px] min-w-[120px]">Name</TableHead>
              <TableHead className="text-primary-purple font-semibold text-[14px] w-[120px] md:w-[150px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={row.id} className="border-border-light hover:bg-bg-primary/50">
                <TableCell className="text-[14px] text-text-secondary font-medium">{String(idx + 1).padStart(2, '0')}</TableCell>
                <TableCell className="text-[14px] text-text-secondary cursor-pointer" onClick={() => viewDetails(row.id)}>{row.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 md:gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-[28px] w-[28px] md:h-[32px] md:w-[32px] rounded-full bg-primary-cyan/10 hover:bg-primary-cyan/20 border border-primary-cyan/20"
                      onClick={() => openEdit(row.id)}
                    >
                      <SquarePen size={14} className="text-primary-cyan md:size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-[28px] w-[28px] md:h-[32px] md:w-[32px] rounded-full bg-error-red/10 hover:bg-error-red/20 border border-error-red/20"
                      onClick={() => confirmAndDelete(row.id)}
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
      <UserEditModal
        open={editOpen}
        userId={editingId}
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