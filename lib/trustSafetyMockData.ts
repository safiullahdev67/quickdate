export interface LiveFeedItem {
  id: string;
  message: string;
  type: 'spam' | 'phishing' | 'scam';
  sender: string;
  recipient: string;
}

export interface Report {
  id: string;
  userId: string;
  reportedUser: string;
  // optional internal references for moderation actions
  reportedUserUid?: string;
  docPath?: string;
  reason: string;
  reportCount: number;
  status: 'Flagged' | 'Pending' | 'Resolved' | 'Warned' | 'Banned' | 'Suspended' | 'Ignored';
}

export interface ReportCategory {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface TrustSafetyData {
  liveFeed: LiveFeedItem[];
  reports: Report[];
  statusCard: {
    totalReports: number;
    resolved: number;
    pending: number;
    categories: ReportCategory[];
  };
}

export const mockTrustSafetyData: TrustSafetyData = {
  liveFeed: [
    {
      id: '1',
      message: '@user sent 10 identical messages to @user2 (spam detected)',
      type: 'spam',
      sender: 'user',
      recipient: 'user2'
    },
    {
      id: '2',
      message: '@usersus sent suspicious link (phishing)',
      type: 'phishing',
      sender: 'usersus',
      recipient: ''
    },
    {
      id: '3',
      message: '@user sent suspicious texts to @user2 (scam detected)',
      type: 'scam',
      sender: 'user',
      recipient: 'user2'
    },
    {
      id: '4',
      message: '@usersus sent suspicious link (phishing)',
      type: 'phishing',
      sender: 'usersus',
      recipient: ''
    },
    {
      id: '5',
      message: '@usersus sent suspicious link (phishing)',
      type: 'phishing',
      sender: 'usersus',
      recipient: ''
    },
    {
      id: '6',
      message: '@usersus sent suspicious link (phishing)',
      type: 'phishing',
      sender: 'usersus',
      recipient: ''
    },
    {
      id: '7',
      message: '@usersus sent suspicious link (phishing)',
      type: 'phishing',
      sender: 'usersus',
      recipient: ''
    },
    {
      id: '8',
      message: '@user sent spam messages (spam detected)',
      type: 'spam',
      sender: 'user',
      recipient: ''
    }
  ],
  reports: [
    {
      id: 'RPT-1024',
      userId: 'RPT-1024',
      reportedUser: '@alex_92',
      reason: 'Harassment',
      reportCount: 5,
      status: 'Flagged'
    },
    {
      id: 'RPT-1025',
      userId: 'RPT-1025',
      reportedUser: '@jake2000',
      reason: 'Inappropriate Chat',
      reportCount: 2,
      status: 'Pending'
    },
    {
      id: 'RPT-1026',
      userId: 'RPT-1026',
      reportedUser: '@sara_meow',
      reason: 'Fake Profile',
      reportCount: 8,
      status: 'Flagged'
    },
    {
      id: 'RPT-1027',
      userId: 'RPT-1027',
      reportedUser: '@alex_92',
      reason: 'Spam Messages',
      reportCount: 11,
      status: 'Resolved'
    },
    {
      id: 'RPT-1028',
      userId: 'RPT-1028',
      reportedUser: '@leo_vibes',
      reason: 'Scamming Attempt',
      reportCount: 3,
      status: 'Flagged'
    },
    {
      id: 'RPT-1029',
      userId: 'RPT-1029',
      reportedUser: '@sara_meow',
      reason: 'Inappropriate Chat',
      reportCount: 5,
      status: 'Resolved'
    },
    {
      id: 'RPT-1024',
      userId: 'RPT-1024',
      reportedUser: '@amy_24',
      reason: 'Spam Links',
      reportCount: 10,
      status: 'Flagged'
    },
    {
      id: 'RPT-1024',
      userId: 'RPT-1024',
      reportedUser: '@els_65',
      reason: 'Inappropriate Chat',
      reportCount: 6,
      status: 'Pending'
    }
  ],
  statusCard: {
    totalReports: 124,
    resolved: 112,
    pending: 12,
    categories: [
      { name: 'Harassment', value: 12, percentage: 28.6, color: '#1abc9c' },
      { name: 'Inappropriate Chat', value: 22, percentage: 42.9, color: '#6366f1' },
      { name: 'Spam Messages', value: 12, percentage: 28.6, color: '#8b5cf6' },
      { name: 'Fake Profile', value: 12, percentage: 28.6, color: '#ec4899' },
      { name: 'Scamming', value: 7, percentage: 14.3, color: '#f59e0b' },
      { name: 'Spam Link', value: 7, percentage: 14.3, color: '#eab308' }
    ]
  }
};
