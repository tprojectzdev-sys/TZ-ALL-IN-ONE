export interface BotStats {
  totalCommands: number;
  totalMembers: number;
  latency: number;
  activeTickets: number;
  servers: number;
  uptime: string;
  botOnline: boolean;
}

export interface Module {
  name: string;
  enabled: boolean;
  description?: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  user: string;
  action: string;
  timestamp: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  level: number;
  xp: number;
  money?: number;
  totalMessages?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  stats?: T;
  error?: string;
}
