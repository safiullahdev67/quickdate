import { TrustSafety } from "@/components/trust-safety/TrustSafety";
import { mockTrustSafetyData, type TrustSafetyData } from "@/lib/trustSafetyMockData";
import { mockRootProps } from "@/lib/dashboardMockData";
import { buildLiveFeed, buildReportsSummary } from "@/lib/trustSafety";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function TrustSafetyPage() {
  await requireAdmin();
  const [liveFeed, reportsSummary] = await Promise.all([
    buildLiveFeed(50),
    buildReportsSummary(),
  ]);
  const data: TrustSafetyData = {
    ...mockTrustSafetyData,
    liveFeed,
    reports: reportsSummary.reports,
    statusCard: reportsSummary.statusCard,
  };
  return (
    <TrustSafety 
      userProfile={mockRootProps.userProfile}
      data={data}
    />
  );
}
