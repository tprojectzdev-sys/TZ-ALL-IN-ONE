import { useModules, useToggleModule } from "@/hooks/useApi";
import { Card } from "@/components/Card";
import { Shield, Lock, FileText, Ticket, Gift, DollarSign, TrendingUp, Music, Rss, BarChart, Globe, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

const moduleIcons: Record<string, any> = {
  moderation: Shield,
  security: Lock,
  audit: FileText,
  tickets: Ticket,
  giveaways: Gift,
  economy: DollarSign,
  leveling: TrendingUp,
  music: Music,
  rss: Rss,
  analytics: BarChart,
  localization: Globe,
  games: Gamepad2,
};

const moduleDescriptions: Record<string, string> = {
  moderation: "Auto-moderation and user management tools",
  security: "Advanced security features and raid protection",
  audit: "Comprehensive logging and audit trails",
  tickets: "Support ticket system for user assistance",
  giveaways: "Host and manage server giveaways",
  economy: "Virtual currency and economy system",
  leveling: "XP and leveling system with rewards",
  music: "Music playback and queue management",
  rss: "RSS feed monitoring and notifications",
  analytics: "Advanced analytics and insights",
  localization: "Multi-language support",
  games: "Fun games and interactive commands",
};

export function Modules() {
  const { data: modules, isLoading } = useModules();
  const toggleModule = useToggleModule();

  const handleToggle = (moduleName: string, currentState: boolean) => {
    toggleModule.mutate({ module: moduleName, enabled: !currentState });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in-up">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-glow">Bot Modules</h1>
        <p className="text-muted-foreground">Enable or disable bot features and functionality</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules && Object.entries(modules).map(([name, enabled], index) => {
          const Icon = moduleIcons[name] || Shield;
          return (
            <Card
              key={name}
              className="relative overflow-hidden group cursor-pointer"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-400/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "p-3 rounded-xl transition-all duration-300",
                    enabled ? "glass-strong text-cyan-400 glow-cyan-sm" : "glass text-muted-foreground"
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <button
                    onClick={() => handleToggle(name, enabled)}
                    disabled={toggleModule.isPending}
                    className={cn(
                      "relative w-14 h-7 rounded-full transition-all duration-300",
                      enabled ? "bg-cyan-400 glow-cyan-sm" : "bg-white/10",
                      toggleModule.isPending && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-lg",
                        enabled ? "left-8" : "left-1"
                      )}
                    />
                  </button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold capitalize">{name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {moduleDescriptions[name] || "Module functionality"}
                  </p>
                </div>

                <div className={cn(
                  "mt-4 px-3 py-1.5 rounded-lg text-xs font-medium inline-block",
                  enabled ? "glass-strong text-green-400" : "glass text-muted-foreground"
                )}>
                  {enabled ? "Active" : "Disabled"}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Module Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-cyan-400 mb-2">
              {modules ? Object.values(modules).filter(Boolean).length : 0}
            </p>
            <p className="text-sm text-muted-foreground">Active Modules</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-400 mb-2">
              {modules ? Object.keys(modules).length : 0}
            </p>
            <p className="text-sm text-muted-foreground">Total Modules</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-400 mb-2">
              {modules ? Math.round((Object.values(modules).filter(Boolean).length / Object.keys(modules).length) * 100) : 0}%
            </p>
            <p className="text-sm text-muted-foreground">Utilization</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
