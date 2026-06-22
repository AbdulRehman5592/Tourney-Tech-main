"use client";

import { useEffect, useState } from "react";
import api from "@/utils/axios";

import Loader from "@/components/Loader";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/api/me"); // adjust this if your route differs
        setUser(res.data.data.user);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return (
      <div className="text-center mt-10 text-red-500 font-medium">
        Failed to load user.
      </div>
    );
  }

  return (
    <div className="">
      <h1 className="text-3xl sm:text-4xl font-bold text-themePrimary mb-6">
        My Profile
      </h1>
      <div className="bg-[var(--card-background)]  shadow-md rounded-xl p-6 sm:p-10 w-full max-w-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-500">Full Name</p>
            <p className="text-lg font-medium capitalize">
              {user.firstname} {user.lastname}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Username</p>
            <p className="text-lg font-medium">{user.username}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="text-lg font-medium">{user.email}</p>
          </div>

          <div>
            <p className="text-gray-500">Role</p>
            <p className="text-lg font-medium capitalize">{user.role}</p>
          </div>

          <div>
            <p className="text-gray-500">Gender</p>
            <p className="text-lg font-medium capitalize">{user.gender}</p>
          </div>

          <div>
            <p className="text-gray-500">Phone Number</p>
            <p className="text-lg font-medium capitalize">{user.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
