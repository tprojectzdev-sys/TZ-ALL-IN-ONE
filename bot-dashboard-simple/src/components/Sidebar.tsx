import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Boxes,
  Activity,
  Trophy,
  Settings,
  Radio,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Overview" },
  { to: "/modules", icon: Boxes, label: "Modules" },
  { to: "/activity", icon: Activity, label: "Activity" },
  { to: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-strong border-r border-white/10 flex flex-col z-50">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center glow-cyan-sm">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-glow">Discord Bot</h1>
            <p className="text-xs text-muted-foreground">Control Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                isActive
                  ? "glass-strong text-cyan-400 glow-cyan-sm"
                  : "text-muted-foreground hover:text-foreground hover:glass"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-transparent" />
                )}
                <item.icon className={cn(
                  "w-5 h-5 relative z-10 transition-transform duration-300",
                  isActive && "text-cyan-400",
                  "group-hover:scale-110"
                )} />
                <span className="font-medium relative z-10">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status Indicator */}
      <div className="p-4 border-t border-white/10">
        <div className="glass rounded-xl p-3 flex items-center gap-3">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping" />
          </div>
          <div>
            <p className="text-sm font-medium">System Online</p>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
