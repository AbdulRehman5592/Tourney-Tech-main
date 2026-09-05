"use client";

import { useState, useEffect } from "react";

import DashboardNavbar from "@/components/ui/dashboard/DashboardNavbar";
import DashboardSidebar from "@/components/ui/dashboard/DashboardSidebar";

import { LayoutDashboard, Users, LogOut, BellDot,SquareChartGantt, Trophy, CheckSquare, LayoutGrid, BadgePlus } from "lucide-react";

import UserGuard from "@/components/gard/user/UserGard";

import RequestToaster from "@/components/ui/dashboard/RequestToaster";
import api from "@/utils/axios";

// Change this to adminNavItems if needed
const userNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/my-tournaments", label: "My Tournaments", icon: Trophy },
  { href: "/dashboard/profile", label: "Profile", icon: Users },
  { href: "/dashboard/teamup", label: "Team Up", icon: Users },
   {
      label: "Notifications",
      icon: BellDot,
      children: [
        { href: "/dashboard/received-requests", label: "Received Request" },
        { href: "/dashboard/send-requests", label: "Sent Request(s)" },
        { href: "/dashboard/select-partner", label: "Select Partner" }
      ],
    },
    {
      href: "/dashboard/my-solo-teams",
      label: "My Solo Teams",
      icon: Trophy,
    },
     { href: "/dashboard/check-sittings", label: "Sitting Arrangements", icon: SquareChartGantt },
  { href: "/logOut", label: "Logout", icon: LogOut },
];

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [isStaffOrAdmin, setIsStaffOrAdmin] = useState(false);
  const [canCreateTournaments, setCanCreateTournaments] = useState(false);

  // Polled so the sidebar badge stays live even if the player never leaves
  // the dashboard -- same 5s cadence as the toast popup in RequestToaster.
  useEffect(() => {
    let cancelled = false;

    const loadPendingCount = async () => {
      try {
        const resUser = await api.get("/api/me");
        const userId = resUser.data?.data?.user?._id;

        const resRequests = await api.get("/api/teamup");
        const requests = resRequests.data?.data?.requests || [];

        const pending = requests.filter(
          (r) => r.to?._id === userId && r.status === "pending"
        ).length;

        if (!cancelled) setPendingRequestCount(pending);
      } catch (err) {
        console.error("Failed to load pending request count:", err);
      }
    };

    loadPendingCount();
    const interval = setInterval(loadPendingCount, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Only show the Check-In / Live Tables links to admins and tournament
  // staff -- one-time check (not polled -- staff assignments don't change
  // mid-session the way pending requests do).
  useEffect(() => {
    let cancelled = false;

    const checkStaffStatus = async () => {
      try {
        const resUser = await api.get("/api/me");
        const user = resUser.data?.data?.user;
        if (!user) return;
        if (!cancelled) setCanCreateTournaments(!!(user.role === "admin" || user.canCreateTournaments));
        if (user.role === "admin") {
          if (!cancelled) setIsStaffOrAdmin(true);
          return;
        }

        const resTournaments = await api.get("/api/tournaments?includeDrafts=true");
        const tournaments = resTournaments.data?.data || [];
        const isStaffAnywhere = tournaments.some((t) =>
          (t.staff || []).some((member) => member.user?._id === user._id)
        );
        if (!cancelled) setIsStaffOrAdmin(isStaffAnywhere);
      } catch (err) {
        console.error("Failed to check staff status:", err);
      }
    };

    checkStaffStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const extraNavItems = [
    ...(canCreateTournaments
      ? [{ href: "/dashboard/create-tournament", label: "Create Tournament", icon: BadgePlus }]
      : []),
    ...(isStaffOrAdmin
      ? [
          { href: "/dashboard/check-in", label: "Check-In", icon: CheckSquare },
          { href: "/dashboard/live-tables", label: "Live Table Overview", icon: LayoutGrid },
        ]
      : []),
  ];

  const navItems = extraNavItems.length
    ? [
        ...userNavItems.slice(0, -1),
        ...extraNavItems,
        userNavItems[userNavItems.length - 1],
      ]
    : userNavItems;

  return (
    <UserGuard>
      <div className="flex h-screen overflow-hidden">

        {/* Sidebar */}
        <DashboardSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          navItems={navItems}
          badges={{
            Notifications: pendingRequestCount,
            "Received Request": pendingRequestCount,
          }}
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
