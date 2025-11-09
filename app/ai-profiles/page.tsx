import { AIProfileManagement } from "@/components/ai-profiles/AIProfileManagement";
import { mockRootProps } from "@/lib/aiProfilesMockData";

export default function AIProfilesPage() {
  return <AIProfileManagement {...mockRootProps} />;
}