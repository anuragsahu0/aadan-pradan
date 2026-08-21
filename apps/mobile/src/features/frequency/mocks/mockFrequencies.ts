export interface MockFrequencyChannel {
  code: string;
  name: string;
  description: string;
  activeUsersCount: number;
  maxUsers: number;
  lastActive: string;
  category: 'primary' | 'tactical' | 'regional' | 'emergency';
}

export const MOCK_FREQUENCIES: MockFrequencyChannel[] = [
  {
    code: '145.800',
    name: 'Primary Calling Channel',
    description: 'Main general-purpose communication channel',
    activeUsersCount: 12,
    maxUsers: 40,
    lastActive: 'Active now',
    category: 'primary',
  },
  {
    code: '146.200',
    name: 'Tactical Alpha',
    description: 'Coordinated field dispatch and operations',
    activeUsersCount: 8,
    maxUsers: 40,
    lastActive: '10m ago',
    category: 'tactical',
  },
  {
    code: '433.500',
    name: 'Operations Bravo',
    description: 'Secondary logistics and team relay',
    activeUsersCount: 24,
    maxUsers: 40,
    lastActive: 'Active now',
    category: 'tactical',
  },
  {
    code: '430.000',
    name: 'Regional Relay',
    description: 'Wide-area simulated repeater channel',
    activeUsersCount: 5,
    maxUsers: 40,
    lastActive: '1h ago',
    category: 'regional',
  },
  {
    code: '144.200',
    name: 'Tactical Sierra',
    description: 'High-priority command network',
    activeUsersCount: 18,
    maxUsers: 40,
    lastActive: '30m ago',
    category: 'tactical',
  },
  {
    code: '446.006',
    name: 'Emergency Standby',
    description: 'Reserved priority monitoring frequency',
    activeUsersCount: 2,
    maxUsers: 40,
    lastActive: '5m ago',
    category: 'emergency',
  },
];
