import type { DashboardProps, TotalRevenueData } from "@/types/schema";

// Helper to format current date/time for filenames
function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

// CSV helpers
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

export function exportDashboardCSV(props: DashboardProps, revenue: TotalRevenueData, period?: string) {
  const lines: string[] = [];

  // Add UTF-8 BOM so Excel opens it correctly
  const BOM = "\uFEFF";

  // Summary section
  lines.push("Summary");
  lines.push(["Metric", "Value", "Change %", "Trend"].map(csvEscape).join(","));
  lines.push(
    [
      "Active Users",
      props.activeUsers.count,
      props.activeUsers.percentageChange,
      props.activeUsers.isIncrease ? "Increase" : "Decrease",
    ].map(csvEscape).join(",")
  );
  lines.push(["AI Profiles", props.aiProfiles.count, "", ""].map(csvEscape).join(","));
  lines.push(
    [
      "Today's Revenue (Rs)",
      props.todaysRevenue.amount,
      props.todaysRevenue.percentageChange,
      props.todaysRevenue.isIncrease ? "Increase" : "Decrease",
    ].map(csvEscape).join(",")
  );
  lines.push(
    [
      "Active Subscriptions",
      props.activeSubscriptions.count,
      props.activeSubscriptions.percentageChange,
      props.activeSubscriptions.isIncrease ? "Increase" : "Decrease",
    ].map(csvEscape).join(",")
  );

  lines.push("");

  // Total revenue section
  lines.push("Total Revenue");
  lines.push(["Amount (Rs)", revenue.amount].map(csvEscape).join(","));
  lines.push(["Month", "Revenue (Rs)"].map(csvEscape).join(","));
  for (const pt of revenue.chartData) {
    lines.push([pt.month, pt.revenue].map(csvEscape).join(","));
  }

  lines.push("");

  // Reports breakdown
  lines.push("Reports Breakdown");
  lines.push(["Type", "Count", "Percentage"].map(csvEscape).join(","));
  for (const r of props.reportsReceived.breakdown) {
    lines.push([r.name, r.count, r.percentage].map(csvEscape).join(","));
  }
  lines.push(["Total Reports", props.reportsReceived.total, ""].map(csvEscape).join(","));

  lines.push("");

  // Top regions
  lines.push("Top Regions");
  lines.push(["Region", "Color", "Code"].map(csvEscape).join(","));
  for (const region of props.topRegions) {
    lines.push([region.type, region.color, region.code ?? ""].map(csvEscape).join(","));
  }

  const csv = BOM + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const name = `dashboard_export${period ? `_${period}` : ""}_${timestamp()}.csv`;
  downloadBlob(blob, name);
}

export async function exportDashboardPDF(props: DashboardProps, revenue: TotalRevenueData, period?: string) {
  // Dynamically import jsPDF and autotable to avoid adding weight to initial bundle
  const [jsPDFmod, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableMod as any).default ?? (autoTableMod as any);
  const JsPDFCtor = (jsPDFmod as any).default ?? (jsPDFmod as any).jsPDF;

  const doc = new JsPDFCtor({ unit: "pt", format: "a4" });

  const marginX = 40;
  let cursorY = 40;

  // Header
  doc.setFontSize(18);
  doc.text("QuickDate - Dashboard Export", marginX, cursorY);
  cursorY += 18;

  doc.setFontSize(11);
  const sub = `Generated: ${new Date().toLocaleString()}${period ? `  |  Period: ${period}` : ""}`;
  doc.text(sub, marginX, cursorY);
  cursorY += 16;

  // Divider
  doc.setDrawColor(200);
  doc.line(marginX, cursorY, 555, cursorY);
  cursorY += 16;

  // Summary table
  autoTable(doc, {
    startY: cursorY,
    styles: { fontSize: 10 },
    head: [["Metric", "Value", "Change %", "Trend"]],
    body: [
      [
        "Active Users",
        String(props.activeUsers.count),
        String(props.activeUsers.percentageChange),
        props.activeUsers.isIncrease ? "Increase" : "Decrease",
      ],
      ["AI Profiles", String(props.aiProfiles.count), "", ""],
      [
        "Today's Revenue (Rs)",
        String(props.todaysRevenue.amount),
        String(props.todaysRevenue.percentageChange),
        props.todaysRevenue.isIncrease ? "Increase" : "Decrease",
      ],
      [
        "Active Subscriptions",
        String(props.activeSubscriptions.count),
        String(props.activeSubscriptions.percentageChange),
        props.activeSubscriptions.isIncrease ? "Increase" : "Decrease",
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [113, 102, 249] },
    margin: { left: marginX, right: marginX },
  });

  // Reports
  autoTable(doc, {
    styles: { fontSize: 10 },
    head: [["Reports Breakdown", "", ""]],
    body: [],
    theme: "plain",
    margin: { left: marginX, right: marginX },
  });

  autoTable(doc, {
    styles: { fontSize: 10 },
    head: [["Type", "Count", "Percentage"]],
    body: props.reportsReceived.breakdown.map((r) => [r.name, String(r.count), String(r.percentage)]),
    foot: [["Total", String(props.reportsReceived.total), ""]],
    theme: "grid",
    headStyles: { fillColor: [113, 102, 249] },
    margin: { left: marginX, right: marginX },
  });

  // Revenue chart data
  autoTable(doc, {
    styles: { fontSize: 10 },
    head: [["Total Revenue", ""]],
    body: [],
    theme: "plain",
    margin: { left: marginX, right: marginX },
  });

  autoTable(doc, {
    styles: { fontSize: 10 },
    head: [["Month", "Revenue (Rs)"]],
    body: revenue.chartData.map((pt) => [pt.month, String(pt.revenue)]),
    foot: [["Total Amount (Rs)", String(revenue.amount)]],
    theme: "grid",
    headStyles: { fillColor: [113, 102, 249] },
    margin: { left: marginX, right: marginX },
  });

  // Top regions
  autoTable(doc, {
    styles: { fontSize: 10 },
    head: [["Top Regions", "", ""]],
    body: [],
    theme: "plain",
    margin: { left: marginX, right: marginX },
  });

  autoTable(doc, {
    styles: { fontSize: 10 },
    head: [["Region", "Color", "Code"]],
    body: props.topRegions.map((r) => [r.type, r.color, r.code ?? "-"]),
    theme: "grid",
    headStyles: { fillColor: [113, 102, 249] },
    margin: { left: marginX, right: marginX },
  });

  const filename = `dashboard_export${period ? `_${period}` : ""}_${timestamp()}.pdf`;
  doc.save(filename);
}
