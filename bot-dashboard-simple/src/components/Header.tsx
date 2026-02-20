import { useStats } from "@/hooks/useApi";
import { Bell, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const { data: stats } = useStats();

  return (
    <header className="fixed top-0 left-64 right-0 h-16 glass-strong border-b border-white/10 z-40 px-6">
      <div className="h-full flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-cyan-400 transition-colors" />
            <input
              type="text"
              placeholder="Search commands, users, modules..."
              className="w-full pl-10 pr-4 py-2 glass rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Bot Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg">
            <div className={cn(
              "w-2 h-2 rounded-full",
              stats?.botOnline ? "bg-green-400 animate-pulse" : "bg-red-400"
            )} />
            <span className="text-sm font-medium">
              {stats?.botOnline ? "Online" : "Offline"}
            </span>
          </div>

          {/* Notifications */}
          <button className="relative p-2 glass rounded-lg hover:glass-strong transition-all hover:scale-105">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full text-xs flex items-center justify-center text-black font-bold">
              3
            </span>
          </button>

          {/* User Menu */}
          <button className="flex items-center gap-2 p-2 glass rounded-lg hover:glass-strong transition-all hover:scale-105">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
}
