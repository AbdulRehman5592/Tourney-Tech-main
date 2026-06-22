"use client";

import { useState } from "react";

import DashboardNavbar from "@/components/ui/dashboard/DashboardNavbar";
import DashboardSidebar from "@/components/ui/dashboard/DashboardSidebar";

import { LayoutDashboard, Users, LogOut, BellDot,SquareChartGantt } from "lucide-react";

import UserGuard from "@/components/gard/user/UserGard";

import RequestToaster from "@/components/ui/dashboard/RequestToaster";

// Change this to adminNavItems if needed
const userNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "Profile", icon: Users },
  { href: "/dashboard/teamup", label: "Team Up", icon: Users },
   {
      label: "Notifications",
      icon: BellDot,
      children: [
        { href: "/dashboard/received-requests", label: "Received Request" },
        { href: "/dashboard/send-requests", label: "Send Request" },
        { href: "/dashboard/select-partner", label: "Select Partner" }
      ],
    },
     { href: "/dashboard/check-sittings", label: "Sitting Arrangements", icon: SquareChartGantt },
  { href: "/logOut", label: "Logout", icon: LogOut },
];

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <UserGuard>
      <div className="flex h-screen overflow-hidden">

        {/* Sidebar */}
        <DashboardSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          navItems={userNavItems} // Pass this dynamically
        />

        {/* Content */}
        <div className="flex flex-col flex-1 w-0">
          <DashboardNavbar onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-6 bg-background text-foreground scrollbar">
             <RequestToaster />
            {children}
          </main>
        </div>
      </div>
    </UserGuard>
  );
}
