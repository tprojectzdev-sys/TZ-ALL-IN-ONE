import { useActivity } from "@/hooks/useApi";
import { Card } from "@/components/Card";
import { Activity as ActivityIcon, User, MessageSquare, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const activityTypeIcons: Record<string, any> = {
  command: Zap,
  message: MessageSquare,
  moderation: Shield,
  user: User,
};

const activityTypeColors: Record<string, string> = {
  command: "text-cyan-400 bg-cyan-400/10",
  message: "text-blue-400 bg-blue-400/10",
  moderation: "text-red-400 bg-red-400/10",
  user: "text-purple-400 bg-purple-400/10",
};

export function Activity() {
  const { data: activities, isLoading } = useActivity(100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in-up">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-glow">Activity Log</h1>
        <p className="text-muted-foreground">Recent bot actions and user interactions</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
          {['All', 'Commands', 'Moderation', 'Users', 'Messages'].map((filter) => (
            <button
              key={filter}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                filter === 'All'
                  ? "glass-strong text-cyan-400 glow-cyan-sm"
                  : "glass hover:glass-strong"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </Card>

      {/* Activity List */}
      <Card className="overflow-hidden">
        <div className="space-y-1">
          {activities && activities.length > 0 ? (
            activities.map((activity, index) => {
              const Icon = activityTypeIcons[activity.type] || ActivityIcon;
              const colorClass = activityTypeColors[activity.type] || "text-gray-400 bg-gray-400/10";
              
              return (
                <div
                  key={activity.id || index}
                  className="flex items-center gap-4 p-4 hover:glass-strong transition-all rounded-xl group"
                  style={{ animationDelay: `${index * 0.02}s` }}
                >
                  <div className={cn("p-3 rounded-xl", colorClass)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user} • {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground capitalize px-3 py-1.5 glass rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    {activity.type}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16">
              <ActivityIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No activity recorded yet</p>
            </div>
          )}
        </div>
      </Card>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="text-center">
          <div className="p-4 rounded-xl bg-cyan-400/10 text-cyan-400 inline-block mb-3">
            <Zap className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold mb-1">
            {activities?.filter(a => a.type === 'command').length || 0}
          </p>
          <p className="text-sm text-muted-foreground">Commands</p>
        </Card>
        
        <Card className="text-center">
          <div className="p-4 rounded-xl bg-blue-400/10 text-blue-400 inline-block mb-3">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold mb-1">
            {activities?.filter(a => a.type === 'message').length || 0}
          </p>
          <p className="text-sm text-muted-foreground">Messages</p>
        </Card>
        
        <Card className="text-center">
          <div className="p-4 rounded-xl bg-red-400/10 text-red-400 inline-block mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold mb-1">
            {activities?.filter(a => a.type === 'moderation').length || 0}
          </p>
          <p className="text-sm text-muted-foreground">Mod Actions</p>
        </Card>
        
        <Card className="text-center">
          <div className="p-4 rounded-xl bg-purple-400/10 text-purple-400 inline-block mb-3">
            <User className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold mb-1">
            {activities?.filter(a => a.type === 'user').length || 0}
          </p>
          <p className="text-sm text-muted-foreground">User Events</p>
        </Card>
      </div>
    </div>
  );
}
