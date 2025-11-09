// Mock data for AI Profile Management

// Data passed as props to the root component
export const mockRootProps = {
  userProfile: {
    name: "Admin",
    avatarUrl: "/images/admin-avatar.jpg"
  },
  profiles: [
    {
      id: "01",
      name: "Home Decor Range",
      status: "Expired Soon" as const
    },
    {
      id: "02",
      name: "Disney Princess Pink Bag 18'",
      status: "Active" as const
    },
    {
      id: "03",
      name: "Bathroom Essentials",
      status: "Expired" as const
    },
    {
      id: "04",
      name: "Apple Smartwatches",
      status: "Active" as const
    }
  ]
};