// Mock data for the dashboard

// Data passed as props to the root component
export const mockRootProps = {
  activeUsers: {
    count: 12340,
    percentageChange: 12,
    isIncrease: true
  },
  aiProfiles: {
    count: 2314
  },
  todaysRevenue: {
    amount: 2130,
    percentageChange: 2.1,
    isIncrease: true
  },
  activeSubscriptions: {
    count: 457,
    percentageChange: 2.4,
    isIncrease: true
  },
  totalRevenue: {
    amount: 4431,
    chartData: [
      { month: "Feb", revenue: 1200 },
      { month: "Mar", revenue: 1800 },
      { month: "Apr", revenue: 1400 },
      { month: "May", revenue: 2000 },
      { month: "Jun", revenue: 1600 },
      { month: "Jul", revenue: 1250 }
    ]
  },
  reportsReceived: {
    total: 100,
    breakdown: [
      { name: "Harassment", count: 50, percentage: 50 },
      { name: "Scam", count: 50, percentage: 50 },
    ],
  },
  topRegions: [
    { type: "Harassment" as const, color: "#f64e60" },
    { type: "Scam" as const, color: "#ffa800" },
    { type: "Spam" as const, color: "#7166f9" }
  ],
  userProfile: {
    name: "Admin",
    avatarUrl: "/images/admin-avatar.jpg"
  }
};