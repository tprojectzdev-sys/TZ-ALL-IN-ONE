import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  hover?: boolean;
}

export function Card({ children, className, glow = false, hover = true }: CardProps) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 transition-all duration-300",
        hover && "hover:glass-strong hover:scale-[1.02]",
        glow && "glow-cyan-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'cyan' | 'purple' | 'blue' | 'green' | 'red';
}

export function StatCard({ title, value, icon, trend, color = 'cyan' }: StatCardProps) {
  const colorClasses = {
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
  };

  return (
    <Card className="relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-3 rounded-xl glass", colorClasses[color])}>
            {icon}
          </div>
          {trend && (
            <div className={cn(
              "text-sm font-medium px-2 py-1 rounded-lg glass",
              trend.isPositive ? "text-green-400" : "text-red-400"
            )}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
        </div>
      </div>
    </Card>
  );
}
