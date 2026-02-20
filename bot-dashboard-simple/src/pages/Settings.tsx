import { useBotControl, useStats } from "@/hooks/useApi";
import { Card } from "@/components/Card";
import { Power, RotateCw, Pause, Play, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function Settings() {
  const { data: stats } = useStats();
  const botControl = useBotControl();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const handleControl = (action: 'restart' | 'pause' | 'resume' | 'shutdown') => {
    if (action === 'shutdown' || action === 'restart') {
      if (confirmAction !== action) {
        setConfirmAction(action);
        setTimeout(() => setConfirmAction(null), 5000);
        return;
      }
    }
    
    botControl.mutate(action);
    setConfirmAction(null);
  };

  const controlButtons = [
    {
      action: 'restart' as const,
      label: 'Restart Bot',
      icon: RotateCw,
      color: 'cyan',
      description: 'Restart the bot process',
      dangerous: true,
    },
    {
      action: 'pause' as const,
      label: 'Pause Bot',
      icon: Pause,
      color: 'yellow',
      description: 'Temporarily pause bot operations',
      dangerous: false,
    },
    {
      action: 'resume' as const,
      label: 'Resume Bot',
      icon: Play,
      color: 'green',
      description: 'Resume bot operations',
      dangerous: false,
    },
    {
      action: 'shutdown' as const,
      label: 'Shutdown Bot',
      icon: Power,
      color: 'red',
      description: 'Stop the bot completely',
      dangerous: true,
    },
  ];

  return (
    <div className="space-y-6 animate-slide-in-up">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-glow">Settings</h1>
        <p className="text-muted-foreground">Manage bot configuration and controls</p>
      </div>

      {/* Bot Status */}
      <Card className="border-2 border-cyan-400/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Bot Status</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  stats?.botOnline ? "bg-green-400 animate-pulse" : "bg-red-400"
                )} />
                <span className="font-medium">
                  {stats?.botOnline ? "Online" : "Offline"}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Uptime: {stats?.uptime || '0d 0h 0m'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">Latency</p>
            <p className="text-2xl font-bold text-cyan-400">{stats?.latency || 0}ms</p>
          </div>
        </div>
      </Card>

      {/* Bot Controls */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Bot Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {controlButtons.map((btn) => (
            <Card
              key={btn.action}
              className={cn(
                "cursor-pointer transition-all hover:scale-[1.02]",
                confirmAction === btn.action && "ring-2 ring-yellow-400 glow-cyan"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-4 rounded-xl glass",
                  btn.color === 'cyan' && "text-cyan-400",
                  btn.color === 'yellow' && "text-yellow-400",
                  btn.color === 'green' && "text-green-400",
                  btn.color === 'red' && "text-red-400"
                )}>
                  <btn.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1">{btn.label}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{btn.description}</p>
                  
                  {confirmAction === btn.action ? (
                    <div className="flex items-center gap-2 p-3 glass-strong rounded-lg border border-yellow-400/50">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-yellow-400">Click again to confirm</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleControl(btn.action)}
                      disabled={botControl.isPending}
                      className={cn(
                        "px-4 py-2 rounded-lg font-medium transition-all",
                        btn.color === 'cyan' && "bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20",
                        btn.color === 'yellow' && "bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20",
                        btn.color === 'green' && "bg-green-400/10 text-green-400 hover:bg-green-400/20",
                        btn.color === 'red' && "bg-red-400/10 text-red-400 hover:bg-red-400/20",
                        botControl.isPending && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {botControl.isPending ? 'Processing...' : 'Execute'}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Configuration</h2>
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass rounded-xl">
              <div>
                <h4 className="font-medium mb-1">Auto-Restart</h4>
                <p className="text-sm text-muted-foreground">Automatically restart bot on crash</p>
              </div>
              <button className="relative w-14 h-7 rounded-full bg-cyan-400 glow-cyan-sm">
                <div className="absolute top-1 left-8 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-lg" />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 glass rounded-xl">
              <div>
                <h4 className="font-medium mb-1">Debug Mode</h4>
                <p className="text-sm text-muted-foreground">Enable detailed logging</p>
              </div>
              <button className="relative w-14 h-7 rounded-full bg-white/10">
                <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-lg" />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 glass rounded-xl">
              <div>
                <h4 className="font-medium mb-1">Maintenance Mode</h4>
                <p className="text-sm text-muted-foreground">Disable all commands temporarily</p>
              </div>
              <button className="relative w-14 h-7 rounded-full bg-white/10">
                <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-lg" />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* System Info */}
      <div>
        <h2 className="text-2xl font-bold mb-4">System Information</h2>
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 glass rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Node Version</p>
              <p className="text-lg font-bold">v20.11.0</p>
            </div>
            <div className="p-4 glass rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Discord.js Version</p>
              <p className="text-lg font-bold">v14.14.1</p>
            </div>
            <div className="p-4 glass rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Memory Usage</p>
              <p className="text-lg font-bold">245 MB</p>
            </div>
            <div className="p-4 glass rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">API Version</p>
              <p className="text-lg font-bold">v10</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
