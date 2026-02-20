import { useStats, useActivity } from "@/hooks/useApi";
import { StatCard, Card } from "@/components/Card";
import {
  Users,
  Zap,
  Server,
  MessageSquare,
  Clock,
  TrendingUp,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Mock chart data - replace with real data from your API
const activityData = [
  { time: '00:00', commands: 45, users: 120 },
  { time: '04:00', commands: 32, users: 95 },
  { time: '08:00', commands: 78, users: 210 },
  { time: '12:00', commands: 125, users: 340 },
  { time: '16:00', commands: 98, users: 285 },
  { time: '20:00', commands: 142, users: 390 },
  { time: '23:59', commands: 87, users: 245 },
];

export function Overview() {
  const { data: stats, isLoading } = useStats();
  const { data: activity } = useActivity(10);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in-up">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-glow">Dashboard Overview</h1>
        <p className="text-muted-foreground">Monitor your Discord bot's performance and activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Commands"
          value={formatNumber(stats?.totalCommands || 0)}
          icon={<Zap className="w-6 h-6" />}
          trend={{ value: 12, isPositive: true }}
          color="cyan"
        />
        <StatCard
          title="Active Users"
          value={formatNumber(stats?.totalMembers || 0)}
          icon={<Users className="w-6 h-6" />}
          trend={{ value: 8, isPositive: true }}
          color="purple"
        />
        <StatCard
          title="Servers"
          value={stats?.servers || 0}
          icon={<Server className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Open Tickets"
          value={stats?.activeTickets || 0}
          icon={<MessageSquare className="w-6 h-6" />}
          trend={{ value: 3, isPositive: false }}
          color="green"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commands Chart */}
        <Card className="col-span-1">
          <div className="mb-4">
            <h3 className="text-xl font-bold mb-1">Command Activity</h3>
            <p className="text-sm text-muted-foreground">Commands executed over the last 24 hours</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="commandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00c2a8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00c2a8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(20, 20, 30, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)',
                }}
              />
              <Area
                type="monotone"
                dataKey="commands"
                stroke="#00c2a8"
                strokeWidth={2}
                fill="url(#commandGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* User Activity Chart */}
        <Card className="col-span-1">
          <div className="mb-4">
            <h3 className="text-xl font-bold mb-1">User Activity</h3>
            <p className="text-sm text-muted-foreground">Active users throughout the day</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(20, 20, 30, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)',
                }}
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Recent Activity</h3>
            <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {activity?.slice(0, 5).map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 glass rounded-xl hover:glass-strong transition-all"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item?.action || 'User activity'}</p>
                  <p className="text-xs text-muted-foreground">
                    {item?.user || 'Unknown'} • {new Date(item?.timestamp || Date.now()).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )) || (
              <p className="text-center text-muted-foreground py-8">No recent activity</p>
            )}
          </div>
        </Card>

        {/* Quick Stats */}
        <Card>
          <h3 className="text-xl font-bold mb-4">System Info</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 glass rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-sm">Uptime</span>
              </div>
              <span className="text-sm font-bold">{stats?.uptime || '0d 0h'}</span>
            </div>
            <div className="flex items-center justify-between p-3 glass rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm">Latency</span>
              </div>
              <span className="text-sm font-bold">{stats?.latency || 0}ms</span>
            </div>
            <div className="flex items-center justify-between p-3 glass rounded-lg">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                <span className="text-sm">Status</span>
              </div>
              <span className="text-sm font-bold text-green-400">Healthy</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
