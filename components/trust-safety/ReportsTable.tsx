"use client";

import { useEffect, useMemo, useState } from "react";
import { Report } from "@/lib/trustSafetyMockData";
import { Checkbox } from "@/components/ui/checkbox";

interface ReportsTableProps {
  reports: Report[];
}

export function ReportsTable({ reports }: ReportsTableProps) {
  const [rows, setRows] = useState<Report[]>(reports);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState("All");
  const [filterFilter, setFilterFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [autoFlagCount, setAutoFlagCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [autoFlagEnabled, setAutoFlagEnabled] = useState(false);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Listen for moderation events from LiveFeed (e.g., ignore), and update rows
  useEffect(() => {
    function onModeration(e: any) {
      try {
        const detail = e?.detail;
        if (!detail) return;
        if (detail.action === 'ignore') {
          const uids = new Set<string>((detail.userUids || []).filter(Boolean));
          if (uids.size === 0) return;
          setRows(prev => prev.filter(r => !r.reportedUserUid || !uids.has(r.reportedUserUid)));
          setSelectedReports([]);
        }
      } catch {}
    }
    window.addEventListener('ts:moderation', onModeration as any);
    return () => window.removeEventListener('ts:moderation', onModeration as any);
  }, []);

  async function applyAutoFlag(trigger: 'toggle' | 'threshold') {
    try {
      setBusy(true);
      const res = await fetch('/api/trust-safety/auto-flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true, threshold: autoFlagCount }),
      });
      if (!res.ok) throw new Error(`Auto-flag failed (${res.status})`);
      const data = await res.json();
      const updated: string[] = Array.isArray(data?.updatedDocPaths) ? data.updatedDocPaths : [];
      if (updated.length) {
        const updatedSet = new Set(updated);
        setRows(prev => prev.map(r => (r.docPath && updatedSet.has(r.docPath)) ? { ...r, status: 'Flagged' } as Report : r));
      }
      showToast(`Auto-flag applied (>${autoFlagCount}). Updated ${updated.length} report(s).`, 'success');
    } catch (e: any) {
      console.error('[ReportsTable] auto-flag error', e);
      showToast(e?.message || 'Auto-flag failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  const toggleReport = (id: string) => {
    setSelectedReports(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getRowColor = (index: number) => {
    return index % 2 === 0 ? 'bg-[#e8e3ff]' : 'bg-white';
  };

  const selectedRows = useMemo(() => rows.filter(r => selectedReports.includes(r.id)), [rows, selectedReports]);

  function priorityFor(count: number): 'High' | 'Medium' | 'Low' {
    if ((count || 0) >= 10) return 'High';
    if ((count || 0) >= 3) return 'Medium';
    return 'Low';
  }

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const typeOk = typeFilter === 'All' || r.reason === typeFilter;
      const statusOk = filterFilter === 'All' || r.status === (filterFilter as any);
      const pr = priorityFor(r.reportCount || 0);
      const prOk = priorityFilter === 'All' || pr === priorityFilter;
      return typeOk && statusOk && prOk;
    });
  }, [rows, typeFilter, filterFilter, priorityFilter]);

  const reasonOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) { if (r.reason) set.add(r.reason); }
    return Array.from(set).sort();
  }, [rows]);

  async function moderateSelected(action: "warn" | "ban" | "suspend" | "ignore") {
    if (selectedRows.length === 0) return;
    try {
      setBusy(true);
      // Expand selection: include all rows with same reportedUserUid OR same reportedUser name
      const uidSet = new Set<string>(selectedRows.map(r => (r.reportedUserUid || '').toString()).filter(Boolean));
      const nameSet = new Set<string>(selectedRows.map(r => (r.reportedUser || '').toLowerCase()).filter(Boolean));
      const affectedRows = rows.filter(r => {
        const uidMatch = r.reportedUserUid && uidSet.has(r.reportedUserUid);
        const nameMatch = (r.reportedUser || '').toLowerCase() && nameSet.has((r.reportedUser || '').toLowerCase());
        return uidMatch || nameMatch;
      });
      const payload = {
        action,
        reports: affectedRows
          .map(r => (r.docPath ? { docPath: r.docPath } : null))
          .filter(Boolean),
        userUids: Array.from(new Set(affectedRows.map(r => r.reportedUserUid).filter(Boolean))) as string[],
        reportedNames: Array.from(new Set(affectedRows.map(r => r.reportedUser).filter(Boolean))) as string[],
        durationDays: action === "suspend" ? 7 : undefined,
      };
      const res = await fetch("/api/trust-safety/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Moderation failed (${res.status})`);
      const affectedIds = new Set<string>(affectedRows.map(r => r.id));
      if (action === 'ignore') {
        // Remove ignored rows from the table immediately
        setRows(prev => prev.filter(r => !affectedIds.has(r.id)));
        showToast(`Ignored ${affectedRows.length} report(s) and removed from view.`, 'success');
      } else {
        // Reflect the specific action in status so filters (e.g., Banned) work
        const map: any = { warn: "Warned", ban: "Banned", suspend: "Suspended" };
        const newStatus = map[action] as Report["status"];
        setRows(prev => prev.map(r => affectedIds.has(r.id) ? { ...r, status: newStatus } : r));
        showToast(`Action '${action}' applied. ${affectedRows.length} report(s) marked as ${newStatus}.`, 'success');
      }
      setSelectedReports([]);
    } catch (e: any) {
      console.error("[ReportsTable] moderation error", e);
      showToast(e?.message || "Moderation failed", 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-[#f8f8f8] rounded-[16px] border border-gray-200 overflow-hidden">
      {/* Header Section */}
      <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-3">
        <h3 className="text-[20px] font-semibold text-black mb-3" style={{ fontFamily: 'Roboto, sans-serif' }}>
          Reports
        </h3>
        <div className="h-[2px] bg-gray-300 -mx-4 sm:-mx-6 mb-3" />
        
        {/* Dropdowns */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative w-full sm:flex-1">
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none w-full px-3 py-2 pr-8 text-[13px] text-gray-600 rounded-[8px] border-2 border-[#7166f9]/30 bg-white cursor-pointer hover:border-[#7166f9]/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              <option value="All">Type: All</option>
              {reasonOptions.map((r) => (
                <option key={r} value={r}>Type: {r}</option>
              ))}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7166f9] pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="relative w-full sm:flex-1">
            <select 
              value={filterFilter}
              onChange={(e) => setFilterFilter(e.target.value)}
              className="appearance-none w-full px-3 py-2 pr-8 text-[13px] text-gray-600 rounded-[8px] border-2 border-[#7166f9]/30 bg-white cursor-pointer hover:border-[#7166f9]/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              <option value="All">Filter: All</option>
              <option value="Flagged">Filter: Flagged</option>
              <option value="Pending">Filter: Pending</option>
              <option value="Resolved">Filter: Resolved</option>
              <option value="Warned">Filter: Warned</option>
              <option value="Banned">Filter: Banned</option>
              <option value="Suspended">Filter: Suspended</option>
              <option value="Ignored">Filter: Ignored</option>
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7166f9] pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="relative w-full sm:flex-1">
            <select 
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="appearance-none w-full px-3 py-2 pr-8 text-[13px] text-gray-600 rounded-[8px] border-2 border-[#7166f9]/30 bg-white cursor-pointer hover:border-[#7166f9]/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              <option value="All">Priority: All</option>
              <option value="High">Priority: High</option>
              <option value="Medium">Priority: Medium</option>
              <option value="Low">Priority: Low</option>
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7166f9] pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto px-4 sm:px-0">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 px-6 text-[13px] font-semibold text-black" style={{ fontFamily: 'Roboto, sans-serif' }}>
                
              </th>
              <th className="text-left py-2 px-2 text-[13px] font-semibold text-black" style={{ fontFamily: 'Roboto, sans-serif' }}>Report ID</th>
              <th className="text-left py-2 px-2 text-[13px] font-semibold text-black" style={{ fontFamily: 'Roboto, sans-serif' }}>Reported User</th>
              <th className="text-left py-2 px-2 text-[13px] font-semibold text-black" style={{ fontFamily: 'Roboto, sans-serif' }}>Reason</th>
              <th className="text-left py-2 px-2 text-[13px] font-semibold text-black" style={{ fontFamily: 'Roboto, sans-serif' }}># Reports</th>
              <th className="text-left py-2 pr-6 text-[13px] font-semibold text-black" style={{ fontFamily: 'Roboto, sans-serif' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((report, index) => (
              <tr key={`${report.id}-${index}`} className={`${getRowColor(index)}`}>
                <td className="py-2 px-6">
                  <Checkbox 
                    checked={selectedReports.includes(report.id)}
                    onCheckedChange={() => toggleReport(report.id)}
                    className="border-[#7166f9] data-[state=checked]:bg-[#7166f9]"
                  />
                </td>
                <td className="py-2 px-2 text-[13px] text-black font-medium" style={{ fontFamily: 'Roboto, sans-serif' }}>{report.userId}</td>
                <td className="py-2 px-2 text-[13px] text-black font-medium" style={{ fontFamily: 'Roboto, sans-serif' }}>{report.reportedUser}</td>
                <td className="py-2 px-2 text-[13px] text-black font-medium" style={{ fontFamily: 'Roboto, sans-serif' }}>{report.reason}</td>
                <td className="py-2 px-2 text-[13px] text-black font-medium" style={{ fontFamily: 'Roboto, sans-serif' }}>{report.reportCount}</td>
                <td className="py-2 pr-6">
                  <span className="text-[13px] text-black font-medium" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    {report.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="px-4 sm:px-6 pt-4 pb-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <button disabled={busy} onClick={() => moderateSelected("warn")} className="w-full py-2 text-[14px] font-semibold rounded-[12px] bg-[#ffcdd2] text-[#e53935] border-2 border-[#e53935] hover:bg-[#ef9a9a] transition-colors disabled:opacity-60">
            {busy ? 'Working…' : 'Warn Selected'}
          </button>
          <button disabled={busy} onClick={() => moderateSelected("ban")} className="w-full py-2 text-[14px] font-semibold rounded-[12px] bg-[#fff9c4] text-[#f9a825] border-2 border-[#f9a825] hover:bg-[#fff59d] transition-colors disabled:opacity-60">
            {busy ? 'Working…' : 'Ban Selected'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button disabled={busy} onClick={() => moderateSelected("suspend")} className="w-full py-2 text-[14px] font-semibold rounded-[12px] bg-[#ffe0b2] text-[#fb8c00] border-2 border-[#fb8c00] hover:bg-[#ffcc80] transition-colors disabled:opacity-60">
            {busy ? 'Working…' : 'Suspend Selected'}
          </button>
          <button disabled={busy} onClick={() => moderateSelected("ignore")} className="w-full py-2 text-[14px] font-semibold rounded-[12px] bg-[#c8e6c9] text-[#43a047] border-2 border-[#43a047] hover:bg-[#a5d6a7] transition-colors disabled:opacity-60">
            {busy ? 'Working…' : 'Ignore Selected'}
          </button>
        </div>
      </div>

      {/* Auto Flagging Rule */}
      <div className="px-6 pb-4 flex items-center justify-center gap-2">
        <Checkbox 
          checked={autoFlagEnabled}
          onCheckedChange={(v) => {
            const val = Boolean(v);
            setAutoFlagEnabled(val);
            if (val) void applyAutoFlag('toggle');
          }}
          className="border-[#7166f9] data-[state=checked]:bg-[#7166f9]"
        />
        <img src="/images/Red flag.svg" alt="Flag" className="w-4 h-4" />
        <span className="text-[12px] text-gray-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
          Auto Flagging rule: If # reports are more than
        </span>
        <div className="relative">
          <select 
            value={autoFlagCount}
            onChange={(e) => { const n = Number(e.target.value); setAutoFlagCount(n); if (autoFlagEnabled) void applyAutoFlag('threshold'); }}
            className="appearance-none px-3 py-1 pr-6 text-[12px] rounded-[8px] border-2 border-[#7166f9]/30 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            <option>10</option>
            <option>15</option>
            <option>20</option>
            <option>25</option>
          </select>
          <svg className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-[#7166f9] pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0 z-50 px-4 py-3 rounded-md shadow-lg text-white text-sm ${toast.type === 'success' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
