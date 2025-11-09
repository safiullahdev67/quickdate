"use client";

import { useEffect, useState } from "react";
import { LiveFeedItem } from "@/lib/trustSafetyMockData";

interface LiveFeedProps {
  items: LiveFeedItem[];
}

export function LiveFeed({ items }: LiveFeedProps) {
  const [feed, setFeed] = useState<LiveFeedItem[]>(items);
  const [loading, setLoading] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function moderate(action: "warn" | "ban" | "suspend" | "ignore" | "limit", item: LiveFeedItem) {
    const idKey = `${item.id}`;
    const next = new Set(busyIds); next.add(idKey); setBusyIds(next);
    try {
      const apiAction = action === 'limit' ? 'suspend' : action; // map 'Limit' -> short suspend
      const res = await fetch('/api/trust-safety/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: apiAction,
          userUids: item.sender ? [item.sender] : [],
          durationDays: apiAction === 'suspend' ? (action === 'limit' ? 1 : 7) : undefined,
          reason: `from_live_feed_${item.type}`,
        }),
      });
      if (!res.ok) throw new Error(`Moderation failed (${res.status})`);
      // Notify other components (e.g., ReportsTable) about moderation
      try {
        window.dispatchEvent(new CustomEvent('ts:moderation', {
          detail: {
            action,
            userUids: item.sender ? [item.sender] : [],
            type: item.type,
            id: item.id,
          }
        }));
      } catch {}

      // On ignore, remove the item from feed immediately
      if (action === 'ignore') {
        setFeed(prev => prev.filter(f => f.id !== item.id));
        showToast('Item ignored and removed from feed.', 'success');
      } else if (action === 'limit') {
        showToast('User limited for 1 day.', 'success');
      } else if (action === 'suspend') {
        showToast('User suspended for 7 days.', 'success');
      } else if (action === 'warn') {
        showToast('User warned successfully.', 'success');
      }
    } catch (e) {
      console.warn('[LiveFeed] moderation error', e);
      showToast('Action failed. Please try again.', 'error');
    } finally {
      const after = new Set(busyIds); after.delete(idKey); setBusyIds(after);
    }
  }

  useEffect(() => {
    let mounted = true;
    let timer: any;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/trust-safety/live-feed?limit=50`, { cache: "no-store" });
        if (!res.ok) throw new Error(`live-feed status ${res.status}`);
        const data = await res.json();
        if (mounted && Array.isArray(data)) setFeed(data);
      } catch (e) {
        console.warn("[LiveFeed] failed to load", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    // initial refresh + interval
    load();
    timer = setInterval(load, 15000);
    return () => { mounted = false; if (timer) clearInterval(timer); };
  }, []);
  const getDetectionColor = (message: string) => {
    if (message.includes('spam detected')) return '#ff9800';
    if (message.includes('phishing')) return '#7166f9';
    if (message.includes('scam detected')) return '#ef5350';
    return '#ef5350';
  };

  return (
    <div className="bg-transparent p-0 border-0">
      {/* Live Feed Header */}
      <div className="bg-[#e8e3ff] px-4 sm:px-6 py-3 sm:py-4">
        <h3 className="text-[16px] font-medium text-[#4b164c]" style={{ fontFamily: 'Roboto, sans-serif' }}>
          Live Feed
        </h3>
      </div>
      
      {/* Live Feed Items */}
      <div className="space-y-3 pt-3 sm:pt-4 px-4 sm:px-6 pb-4 sm:pb-6 max-h-[500px] overflow-y-auto">
        {feed.map((item, index) => (
          <div key={`${item.id}-${index}`} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 bg-white rounded-[12px] border-2 border-[#7166f9]/30">
            <div className="flex-1">
              <p className="text-[14px]" style={{ fontFamily: 'Roboto, sans-serif' }}>
                <span className="text-[#9e9e9e]">{item.message.split('(')[0]}</span>
                {item.message.includes('(') && (
                  <span className="font-medium" style={{ color: getDetectionColor(item.message) }}>
                    ({item.message.split('(')[1]}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto flex-wrap justify-start sm:justify-end mt-2 sm:mt-0">
              <button
                disabled={busyIds.has(item.id)}
                onClick={() => moderate('warn', item)}
                className="px-4 sm:px-5 py-2 text-[13px] sm:text-[14px] font-medium rounded-[8px] bg-[#ffcdd2] text-[#e53935] hover:bg-[#ef9a9a] transition-colors disabled:opacity-60"
              >
                Warn
              </button>
              <button
                disabled={busyIds.has(item.id)}
                onClick={() => moderate('limit', item)}
                className="px-4 sm:px-5 py-2 text-[13px] sm:text-[14px] font-medium rounded-[8px] bg-[#fff9c4] text-[#f9a825] hover:bg-[#fff59d] transition-colors disabled:opacity-60"
              >
                Limit
              </button>
              <button
                disabled={busyIds.has(item.id)}
                onClick={() => moderate('suspend', item)}
                className="px-4 sm:px-5 py-2 text-[13px] sm:text-[14px] font-medium rounded-[8px] bg-[#ffe0b2] text-[#fb8c00] hover:bg-[#ffcc80] transition-colors disabled:opacity-60"
              >
                Suspend
              </button>
              <button
                disabled={busyIds.has(item.id)}
                onClick={() => moderate('ignore', item)}
                className="px-4 sm:px-5 py-2 text-[13px] sm:text-[14px] font-medium rounded-[8px] bg-[#c8e6c9] text-[#43a047] hover:bg-[#a5d6a7] transition-colors disabled:opacity-60"
              >
                Ignore
              </button>
            </div>
          </div>
        ))}
        {(!feed || feed.length === 0) && !loading && (
          <div className="px-6 text-sm text-gray-500">No detections in the last 24 hours.</div>
        )}
      </div>
      {toast && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0 z-50 px-4 py-3 rounded-md shadow-lg text-white text-sm ${toast.type === 'success' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
