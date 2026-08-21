export interface ActivityItem {
  id: string;
  frequencyCode: string;
  channelName: string;
  action: 'joined' | 'left' | 'transmitted' | 'floor_held';
  timestamp: string;
  relativeTime: string;
  durationSeconds?: number;
  participantsCount?: number;
}

export const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act_01',
    frequencyCode: '145.800',
    channelName: 'Primary Calling',
    action: 'joined',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    relativeTime: '5 minutes ago',
    participantsCount: 12,
  },
  {
    id: 'act_02',
    frequencyCode: '145.800',
    channelName: 'Primary Calling',
    action: 'transmitted',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    relativeTime: '25 minutes ago',
    durationSeconds: 4,
  },
  {
    id: 'act_03',
    frequencyCode: '146.200',
    channelName: 'Tactical Alpha',
    action: 'left',
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    relativeTime: '3 hours ago',
    participantsCount: 8,
  },
  {
    id: 'act_04',
    frequencyCode: '146.200',
    channelName: 'Tactical Alpha',
    action: 'joined',
    timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    relativeTime: '4 hours ago',
    participantsCount: 7,
  },
  {
    id: 'act_05',
    frequencyCode: '433.500',
    channelName: 'Operations Bravo',
    action: 'transmitted',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    relativeTime: 'Yesterday',
    durationSeconds: 9,
  },
  {
    id: 'act_06',
    frequencyCode: '430.000',
    channelName: 'Regional Relay',
    action: 'joined',
    timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    relativeTime: '2 days ago',
    participantsCount: 5,
  },
];
