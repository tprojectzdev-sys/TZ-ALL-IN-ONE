import { useLeaderboard } from "@/hooks/useApi";
import { Card } from "@/components/Card";
import { Trophy, Medal, Crown, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";

export function Leaderboard() {
  const { data: leaderboard, isLoading } = useLeaderboard(20);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return { icon: Crown, color: "text-yellow-400" };
    if (rank === 2) return { icon: Medal, color: "text-gray-300" };
    if (rank === 3) return { icon: Medal, color: "text-orange-400" };
    return { icon: Trophy, color: "text-cyan-400" };
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-orange-400 glow-cyan";
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-400";
    if (rank === 3) return "bg-gradient-to-r from-orange-400 to-red-400";
    return "glass";
  };

  return (
    <div className="space-y-6 animate-slide-in-up">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-glow">Leaderboard</h1>
        <p className="text-muted-foreground">Top performing members in your community</p>
      </div>

      {/* Top 3 Podium */}
      {leaderboard && leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* 2nd Place */}
          <Card className="text-center transform translate-y-4">
            <div className="relative mb-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-3xl font-bold shadow-lg">
                2
              </div>
              <Medal className="w-6 h-6 text-gray-300 absolute -top-2 -right-2" />
            </div>
            <h3 className="font-bold text-lg mb-1">{leaderboard[1].username}</h3>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Level {leaderboard[1].level}</p>
              <p className="text-cyan-400 font-bold">{formatNumber(leaderboard[1].xp)} XP</p>
            </div>
          </Card>

          {/* 1st Place */}
          <Card className="text-center relative overflow-hidden glow-cyan">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-orange-400/10" />
            <div className="relative z-10">
              <div className="relative mb-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-4xl font-bold shadow-2xl text-black">
                  1
                </div>
                <Crown className="w-8 h-8 text-yellow-400 absolute -top-4 left-1/2 -translate-x-1/2 animate-float" />
              </div>
              <h3 className="font-bold text-xl mb-1 text-glow">{leaderboard[0].username}</h3>
              <div className="space-y-2">
                <p className="text-muted-foreground">Level {leaderboard[0].level}</p>
                <p className="text-cyan-400 font-bold text-lg">{formatNumber(leaderboard[0].xp)} XP</p>
              </div>
            </div>
          </Card>

          {/* 3rd Place */}
          <Card className="text-center transform translate-y-4">
            <div className="relative mb-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-3xl font-bold shadow-lg">
                3
              </div>
              <Medal className="w-6 h-6 text-orange-400 absolute -top-2 -right-2" />
            </div>
            <h3 className="font-bold text-lg mb-1">{leaderboard[2].username}</h3>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Level {leaderboard[2].level}</p>
              <p className="text-cyan-400 font-bold">{formatNumber(leaderboard[2].xp)} XP</p>
            </div>
          </Card>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Rank</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground">User</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Level</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground">XP</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Messages</th>
                {leaderboard?.[0]?.money !== undefined && (
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Balance</th>
                )}
              </tr>
            </thead>
            <tbody>
              {leaderboard && leaderboard.length > 0 ? (
                leaderboard.map((user, index) => {
                  const { icon: RankIcon, color } = getRankIcon(user.rank);
                  return (
                    <tr
                      key={user.userId}
                      className="border-b border-white/5 hover:glass-strong transition-all group"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <td className="p-4">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center font-bold",
                          getRankBadge(user.rank)
                        )}>
                          {user.rank <= 3 ? (
                            <RankIcon className={cn("w-5 h-5", color)} />
                          ) : (
                            <span className="text-sm">{user.rank}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-bold">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{user.username}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-cyan-400" />
                          <span className="font-bold">{user.level}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-cyan-400">{formatNumber(user.xp)}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-muted-foreground">{formatNumber(user.totalMessages || 0)}</span>
                      </td>
                      {user.money !== undefined && (
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-green-400 font-medium">
                            <DollarSign className="w-4 h-4" />
                            {formatNumber(user.money)}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No leaderboard data available</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
