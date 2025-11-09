// Props types (data passed to components)
export interface DashboardProps {
  activeUsers: ActiveUsersData;
  aiProfiles: AIProfilesData;
  todaysRevenue: RevenueData;
  activeSubscriptions: SubscriptionsData;
  totalRevenue: TotalRevenueData;
  reportsReceived: ReportsData;
  topRegions: RegionData[];
  userProfile: UserProfileData;
}

export interface ActiveUsersData {
  count: number;
  percentageChange: number;
  isIncrease: boolean;
}

export interface AIProfilesData {
  count: number;
}

export interface RevenueData {
  amount: number;
  percentageChange: number;
  isIncrease: boolean;
}

export interface SubscriptionsData {
  count: number;
  percentageChange: number;
  isIncrease: boolean;
}

export interface TotalRevenueData {
  amount: number;
  chartData: ChartDataPoint[];
}

export interface ChartDataPoint {
  month: string;
  revenue: number;
}

export interface ReportsData {
  total: number;
  breakdown: Array<{
    name: string; // reason label
    count: number;
    percentage: number; // 0-100
  }>;
}

export interface RegionData {
  type: string; // country name or category label
  code?: string; // optional ISO country code to target SVG path (e.g., 'IN')
  color: string;
}

export interface UserProfileData {
  name: string;
  avatarUrl: string;
}

// AI Profile Management types
export interface AIProfileManagementProps {
  userProfile: UserProfileData;
  profiles: ProfileData[];
}

export interface ProfileData {
  id: string;
  name: string;
  status: "Active" | "Expired Soon" | "Expired" | "Paused";
}

export interface ProfileGenerationFormData {
  numberOfProfiles: number;
  gender: string;
  interests: string[];
  profileQuality: string;
  ageRange: string;
  contentSource: string;
  country: string;
  city: string;
  messagesPerDay: number;
  likesPerDay: number;
  matchesPerWeek: string;
  replyMode: string;
  matchPreferences: string;
  expireAfter: string;
  autoRegenerate: boolean;
}