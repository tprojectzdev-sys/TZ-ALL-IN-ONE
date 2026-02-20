import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function Layout() {
  return (
    <div className="min-h-screen mesh-gradient grain">
      <Sidebar />
      <Header />
      
      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-6">
          <Outlet />
        </div>
      </main>

      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
      </div>
    </div>
  );
}
