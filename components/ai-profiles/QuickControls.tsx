"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function QuickControls({ onChanged }: { onChanged?: () => void }) {
  const [toastMsg, setToastMsg] = useState("");
  const [busy, setBusy] = useState<{ regen?: boolean; pause?: boolean; clean?: boolean }>({});

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2000);
  };

  const handleRegenerate = async () => {
    if (busy.regen) return;
    try {
      setBusy((b) => ({ ...b, regen: true }));
      const res = await fetch("/api/ai-profiles/actions/regenerate-expired", { method: "POST" });
      const data = await res.json();
      if (data?.ok) {
        showToast(`Regenerated ${data.regenerated || 0} profile(s)`);
        onChanged?.();
      } else {
        showToast(data?.error || "Failed to regenerate");
      }
    } catch (e: any) {
      showToast(e?.message || "Failed to regenerate");
    } finally {
      setBusy((b) => ({ ...b, regen: false }));
    }
  };

  const handlePauseAll = async () => {
    if (busy.pause) return;
    try {
      setBusy((b) => ({ ...b, pause: true }));
      const res = await fetch("/api/ai-profiles/actions/pause-all", { method: "POST" });
      const data = await res.json();
      if (data?.ok) {
        showToast(`Paused ${data.updated || 0} profile(s)`);
        onChanged?.();
      } else {
        showToast(data?.error || "Failed to pause all");
      }
    } catch (e: any) {
      showToast(e?.message || "Failed to pause all");
    } finally {
      setBusy((b) => ({ ...b, pause: false }));
    }
  };

  const handleCleanAll = async () => {
    if (busy.clean) return;
    try {
      setBusy((b) => ({ ...b, clean: true }));
      const res = await fetch("/api/ai-profiles/actions/clean-expired", { method: "POST" });
      const data = await res.json();
      if (data?.ok) {
        showToast(`Deleted ${data.deleted || 0} expired profile(s)`);
        onChanged?.();
      } else {
        showToast(data?.error || "Failed to clean expired");
      }
    } catch (e: any) {
      showToast(e?.message || "Failed to clean expired");
    } finally {
      setBusy((b) => ({ ...b, clean: false }));
    }
  };

  return (
    <Card className="p-4 md:p-6 bg-white rounded-[32px] border-none">
      <h2 className="heading-small text-text-secondary mb-4 md:mb-6 text-[16px] md:text-[18px]">Quick Controls</h2>
      
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="bg-bg-card rounded-[20px] p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <span className="text-[13px] md:text-[14px] text-text-secondary font-medium">
            Regenerate all Expired Profiles
          </span>
          <Button 
            onClick={handleRegenerate}
            disabled={!!busy.regen}
            className="bg-gradient-to-r from-[#E17CFD] to-[#8950FC] hover:from-[#E17CFD]/90 hover:to-[#8950FC]/90 text-white px-4 md:px-6 py-2 rounded-[10px] text-[13px] md:text-[14px] font-medium w-full md:w-auto"
          >
            Regenerate
          </Button>
        </div>

        <div className="bg-bg-card rounded-[20px] p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <span className="text-[13px] md:text-[14px] text-text-secondary font-medium">
            Pause All Profiles
          </span>
          <Button 
            onClick={handlePauseAll}
            disabled={!!busy.pause}
            className="bg-gradient-to-r from-[#E17CFD] to-[#8950FC] hover:from-[#E17CFD]/90 hover:to-[#8950FC]/90 text-white px-4 md:px-6 py-2 rounded-[10px] text-[13px] md:text-[14px] font-medium w-full md:w-auto"
          >
            Pause All
          </Button>
        </div>

        <div className="bg-bg-card rounded-[20px] p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <span className="text-[13px] md:text-[14px] text-text-secondary font-medium">
            Clean Up all Expired Profiles
          </span>
          <Button 
            onClick={handleCleanAll}
            disabled={!!busy.clean}
            className="bg-gradient-to-r from-[#E17CFD] to-[#8950FC] hover:from-[#E17CFD]/90 hover:to-[#8950FC]/90 text-white px-4 md:px-6 py-2 rounded-[10px] text-[13px] md:text-[14px] font-medium w-full md:w-auto"
          >
            Clean All
          </Button>
        </div>
      </div>
      {toastMsg && (
        <div className="fixed right-4 bottom-4 z-50 bg-black/80 text-white text-sm px-4 py-2 rounded-md shadow-md">{toastMsg}</div>
      )}
    </Card>
  );
}