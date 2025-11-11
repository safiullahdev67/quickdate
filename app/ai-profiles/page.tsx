import { AIProfileManagement } from "@/components/ai-profiles/AIProfileManagement";
import { mockRootProps } from "@/lib/aiProfilesMockData";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export default async function AIProfilesPage() {
  await requireAdmin();
  return <AIProfileManagement {...mockRootProps} />;
}