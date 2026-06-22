"use client";

import { useEffect, useState } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import { Users, Activity, FileText, UserPlus } from "lucide-react";

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/api/dashboard");
        setStats(res.data.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cardData = [
    { title: "Total Users", value: stats?.totalUsers ?? "--", icon: Users },
    { title: "Ongoing Tournaments", value: stats?.ongoingTournament ?? "--", icon: Activity },
    { title: "Total Tournaments", value: stats?.totalTournaments ?? "--", icon: FileText },
    { title: "New Signups (7 days)", value: stats?.newSignUpUsers ?? "--", icon: UserPlus },
    { title: "Upcoming Tournaments", value: stats?.upcomingTournaments ?? "--", icon: FileText },
    { title: "Completed Tournaments", value: stats?.completedTournament ?? "--", icon: FileText },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground tracking-tight">
        Admin Dashboard
      </h1>

      {loading ? (
        <p className="text-muted-foreground">Loading stats...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {cardData.map((card, i) => (
            <DashboardCard
              key={i}
              title={card.title}
              value={card.value}
              icon={card.icon}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardCard({ title, value, icon: Icon }) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl p-6 
        bg-[var(--card-background)] border border-[var(--border-color)]
        shadow-md hover:shadow-lg hover:border-[var(--accent-color)]
        transition-all duration-300 transform hover:-translate-y-1
        group
      `}
    >
      {/* Glow border on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--accent-color)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h2 className="text-2xl font-bold text-[var(--accent-color)] mt-1">
            {value}
          </h2>
        </div>

        <div
          className={`
            p-4 rounded-xl bg-[var(--secondary-color)] text-[var(--accent-color)]
            shadow-inner group-hover:scale-110 transition-transform
          `}
        >
          <Icon className="w-7 h-7" />
        </div>
      </div>
    </div>
  );
}
