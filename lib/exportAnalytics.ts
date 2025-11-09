// Utilities to export Analytics screen data (Regional & Behavioral Insights)
// These functions are designed to run on the client and trigger file downloads.

export type AnalyticsInsight = {
  code?: string;
  country: string;
  users: number;
  revenue: number; // PKR numeric value
  engagement: string; // e.g., High | Medium | Low
};

export type SeriesPoint = { name: string; value: number };

export type HeatmapRow = {
  time: string;
  Mon: number; Tue: number; Wed: number; Thu: number; Fri: number; Sat: number; Sun: number;
};

export type StatsExport = {
  todaysRevenue: { amount: number; changePct: number };
  monthlyRevenue: { amount: number; changePct: number };
  activeSubscriptions: { count: number; changePct: number };
  retentionRate: { rate: number; changePct: number };
};

export type AnalyticsFullExport = {
  stats: StatsExport | null;
  revenue: {
    daily: SeriesPoint[];
    weekly: SeriesPoint[];
    monthly: SeriesPoint[];
    yearly: SeriesPoint[];
  };
  subscriptions: SeriesPoint[];
  heatmap: HeatmapRow[];
  insights: AnalyticsInsight[];
  period?: string;
};

function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAnalyticsCSV(rows: AnalyticsInsight[], period: string = "all") {
  const BOM = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  const lines: string[] = [];
  lines.push("Regional & Behavioral Insights");
  lines.push(["Country", "Users", "Revenue (Rs)", "Engagement", "Code"].map(csvEscape).join(","));
  for (const r of rows) {
    lines.push([
      r.country,
      r.users,
      r.revenue,
      r.engagement,
      r.code ?? "",
    ].map(csvEscape).join(","));
  }
  const csv = BOM + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `analytics_insights_${period}_${timestamp()}.csv`);
}

export async function exportAnalyticsPDF(rows: AnalyticsInsight[], period: string = "all") {
  const [jsPDFmod, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const JsPDFCtor = (jsPDFmod as any).default ?? (jsPDFmod as any).jsPDF;
  const autoTable = (autoTableMod as any).default ?? (autoTableMod as any);

  const doc = new JsPDFCtor({ unit: "pt", format: "a4" });

  const marginX = 40;
  let cursorY = 40;

  doc.setFontSize(18);
  doc.text("QuickDate - Analytics Export", marginX, cursorY);
  cursorY += 18;

  doc.setFontSize(11);
  doc.text(`Regional & Behavioral Insights  |  Period: ${period}  |  Generated: ${new Date().toLocaleString()}`,
    marginX, cursorY);
  cursorY += 16;

  // Divider
  doc.setDrawColor(200);
  doc.line(marginX, cursorY, 555, cursorY);
  cursorY += 16;

  autoTable(doc, {
    startY: cursorY,
    styles: { fontSize: 10 },
    head: [["Country", "Users", "Revenue (Rs)", "Engagement", "Code"]],
    body: rows.map((r) => [
      r.country,
      String(r.users),
      String(Math.round(r.revenue)),
      r.engagement,
      r.code ?? "-",
    ]),
    theme: "grid",
    headStyles: { fillColor: [113, 102, 249] },
    margin: { left: marginX, right: marginX },
  });

  doc.save(`analytics_insights_${period}_${timestamp()}.pdf`);
}

// ========== FULL ANALYTICS EXPORTS ==========

export function exportAnalyticsAllCSV(payload: AnalyticsFullExport) {
  const BOM = "\uFEFF";
  const lines: string[] = [];

  // Header
  lines.push("QuickDate - Analytics Export");
  lines.push(`Generated: ${new Date().toLocaleString()}${payload.period ? ` | Period: ${payload.period}` : ''}`);
  lines.push("");

  // Stats
  lines.push("Stats Summary");
  lines.push(["Metric", "Value", "Change %"].map(csvEscape).join(","));
  if (payload.stats) {
    const s = payload.stats;
    lines.push(["Today's Revenue (Rs)", s.todaysRevenue.amount, s.todaysRevenue.changePct].map(csvEscape).join(","));
    lines.push(["Monthly Revenue (Rs)", s.monthlyRevenue.amount, s.monthlyRevenue.changePct].map(csvEscape).join(","));
    lines.push(["Active Subscriptions", s.activeSubscriptions.count, s.activeSubscriptions.changePct].map(csvEscape).join(","));
    lines.push(["Retention Rate (%)", s.retentionRate.rate, s.retentionRate.changePct].map(csvEscape).join(","));
  }
  lines.push("");

  // Revenue series by granularity
  const writeSeries = (title: string, series: SeriesPoint[]) => {
    lines.push(title);
    lines.push(["Label", "Value"].map(csvEscape).join(","));
    for (const p of series) lines.push([p.name, p.value].map(csvEscape).join(","));
    lines.push("");
  };
  writeSeries("Revenue - Daily", payload.revenue.daily || []);
  writeSeries("Revenue - Weekly", payload.revenue.weekly || []);
  writeSeries("Revenue - Monthly", payload.revenue.monthly || []);
  writeSeries("Revenue - Yearly", payload.revenue.yearly || []);

  // Subscriptions series
  writeSeries("Subscriptions - Monthly", payload.subscriptions || []);

  // Heatmap
  lines.push("User Engagement Heatmap");
  lines.push(["Time", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(csvEscape).join(","));
  for (const r of payload.heatmap || []) {
    lines.push([r.time, r.Mon, r.Tue, r.Wed, r.Thu, r.Fri, r.Sat, r.Sun].map(csvEscape).join(","));
  }
  lines.push("");

  // Insights
  lines.push("Regional & Behavioral Insights");
  lines.push(["Country", "Users", "Revenue (Rs)", "Engagement", "Code"].map(csvEscape).join(","));
  for (const r of payload.insights || []) {
    lines.push([r.country, r.users, r.revenue, r.engagement, r.code ?? ""].map(csvEscape).join(","));
  }

  const csv = BOM + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `analytics_full_${payload.period || 'all'}_${timestamp()}.csv`);
}

export async function exportAnalyticsAllPDF(payload: AnalyticsFullExport) {
  const [jsPDFmod, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const JsPDFCtor = (jsPDFmod as any).default ?? (jsPDFmod as any).jsPDF;
  const autoTable = (autoTableMod as any).default ?? (autoTableMod as any);

  const doc = new JsPDFCtor({ unit: "pt", format: "a4" });
  const marginX = 40;
  let cursorY = 40;

  // Title
  doc.setFontSize(18);
  doc.text("QuickDate - Analytics Export", marginX, cursorY);
  cursorY += 18;
  doc.setFontSize(11);
  doc.text(`Generated: ${new Date().toLocaleString()}${payload.period ? `  |  Period: ${payload.period}` : ''}`, marginX, cursorY);
  cursorY += 16;
  doc.setDrawColor(200);
  doc.line(marginX, cursorY, 555, cursorY);
  cursorY += 16;

  // Stats
  autoTable(doc, {
    startY: cursorY,
    styles: { fontSize: 10 },
    head: [["Metric", "Value", "Change %"]],
    body: payload.stats ? [
      ["Today's Revenue (Rs)", String(payload.stats.todaysRevenue.amount), String(payload.stats.todaysRevenue.changePct)],
      ["Monthly Revenue (Rs)", String(payload.stats.monthlyRevenue.amount), String(payload.stats.monthlyRevenue.changePct)],
      ["Active Subscriptions", String(payload.stats.activeSubscriptions.count), String(payload.stats.activeSubscriptions.changePct)],
      ["Retention Rate (%)", String(payload.stats.retentionRate.rate), String(payload.stats.retentionRate.changePct)],
    ] : [],
    theme: "grid",
    headStyles: { fillColor: [113, 102, 249] },
    margin: { left: marginX, right: marginX },
  });

  const section = (title: string, head: string[], body: any[][]) => {
    autoTable(doc, { styles: { fontSize: 10 }, head: [[title]], body: [], theme: "plain", margin: { left: marginX, right: marginX } });
    autoTable(doc, { styles: { fontSize: 10 }, head: [head], body, theme: "grid", headStyles: { fillColor: [113, 102, 249] }, margin: { left: marginX, right: marginX } });
  };

  // Revenue series
  section("Revenue - Daily", ["Label", "Value"], (payload.revenue.daily || []).map(p => [p.name, String(p.value)]));
  section("Revenue - Weekly", ["Label", "Value"], (payload.revenue.weekly || []).map(p => [p.name, String(p.value)]));
  section("Revenue - Monthly", ["Label", "Value"], (payload.revenue.monthly || []).map(p => [p.name, String(p.value)]));
  section("Revenue - Yearly", ["Label", "Value"], (payload.revenue.yearly || []).map(p => [p.name, String(p.value)]));

  // Subscriptions
  section("Subscriptions - Monthly", ["Month", "Count"], (payload.subscriptions || []).map(p => [p.name, String(p.value)]));

  // Heatmap
  section(
    "User Engagement Heatmap",
    ["Time", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    (payload.heatmap || []).map(r => [r.time, r.Mon, r.Tue, r.Wed, r.Thu, r.Fri, r.Sat, r.Sun].map(String) as any)
  );

  // Insights
  section(
    "Regional & Behavioral Insights",
    ["Country", "Users", "Revenue (Rs)", "Engagement", "Code"],
    (payload.insights || []).map(r => [r.country, String(r.users), String(Math.round(r.revenue)), r.engagement, r.code ?? "-"])
  );

  doc.save(`analytics_full_${payload.period || 'all'}_${timestamp()}.pdf`);
}

// Fetch all analytics datasets client-side to build a full export payload
export async function gatherAnalyticsAll(period: string = 'all'): Promise<AnalyticsFullExport> {
  const [statsRes, revDaily, revWeekly, revMonthly, revYearly, subsRes, heatRes, insightsRes] = await Promise.all([
    fetch('/api/analytics/stats', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch('/api/analytics/revenue-series?granularity=daily', { cache: 'no-store' }).then(r => r.ok ? r.json() : { points: [] }).catch(() => ({ points: [] })),
    fetch('/api/analytics/revenue-series?granularity=weekly', { cache: 'no-store' }).then(r => r.ok ? r.json() : { points: [] }).catch(() => ({ points: [] })),
    fetch('/api/analytics/revenue-series?granularity=monthly', { cache: 'no-store' }).then(r => r.ok ? r.json() : { points: [] }).catch(() => ({ points: [] })),
    fetch('/api/analytics/revenue-series?granularity=yearly', { cache: 'no-store' }).then(r => r.ok ? r.json() : { points: [] }).catch(() => ({ points: [] })),
    fetch('/api/analytics/subscriptions-series', { cache: 'no-store' }).then(r => r.ok ? r.json() : { points: [] }).catch(() => ({ points: [] })),
    fetch('/api/analytics/engagement-heatmap?days=14', { cache: 'no-store' }).then(r => r.ok ? r.json() : { rows: [] }).catch(() => ({ rows: [] })),
    fetch(`/api/analytics/region-insights?period=${encodeURIComponent(period)}&maxUsers=20000`, { cache: 'no-store' }).then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
  ]);

  return {
    stats: statsRes ?? null,
    revenue: {
      daily: (revDaily?.points ?? []),
      weekly: (revWeekly?.points ?? []),
      monthly: (revMonthly?.points ?? []),
      yearly: (revYearly?.points ?? []),
    },
    subscriptions: subsRes?.points ?? [],
    heatmap: heatRes?.rows ?? [],
    insights: insightsRes?.items ?? [],
    period,
  };
}
