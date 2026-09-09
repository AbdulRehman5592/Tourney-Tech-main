"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import Loader from "@/components/Loader";

const MODE_LABELS = { team: "Team Up", doubles: "Doubles", mixed_doubles: "Mixed Doubles" };

export default function InvitePage() {
  const { token } = useParams();
  const [invite, setInvite] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // "am I logged in" is checked with a plain fetch (not the shared axios
        // instance) -- the axios instance force-redirects to /auth/login on a
        // 401 it can't refresh, which would hijack a logged-out visitor away
        // from this page before they ever see the invite.
        const [inviteRes, meRes] = await Promise.allSettled([
          api.get(`/api/invites/${token}`),
          fetch("/api/me", { credentials: "include" }),
        ]);

        if (inviteRes.status === "fulfilled") {
          setInvite(inviteRes.value.data.data);
        } else {
          setNotFound(true);
        }

        if (meRes.status === "fulfilled" && meRes.value.ok) {
          const body = await meRes.value.json();
          setCurrentUser(body?.data?.user || null);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const handleRespond = async (action) => {
    setResponding(true);
    try {
      await api.post(`/api/invites/${token}/respond`, { action });
      toast.success(action === "accept" ? "You're paired up!" : "Invite declined");
      window.location.href = "/dashboard/teamup";
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to respond to invite");
    } finally {
      setResponding(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div
        className="w-full max-w-md p-8 rounded-xl shadow-md"
        style={{ background: "var(--card-background)", border: "1px solid var(--border-color)" }}
      >
        {notFound || !invite ? (
          <>
            <h1 className="text-2xl font-bold mb-2">Invite not found</h1>
            <p className="text-sm opacity-75">
              This invite link is invalid. Ask your friend to send you a new one.
            </p>
          </>
        ) : invite.status !== "pending" || invite.isExpired ? (
          <>
            <h1 className="text-2xl font-bold mb-2">Invite no longer available</h1>
            <p className="text-sm opacity-75">
              {invite.isExpired
                ? "This invite link has expired."
                : "This invite has already been responded to."}
            </p>
          </>
        ) : currentUser?._id === invite.inviterId ? (
          <>
            <h1 className="text-2xl font-bold mb-2">This is your own invite link</h1>
            <p className="text-sm opacity-75">
              Share it with your friend instead — once they open it they'll be able to
              accept or decline.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">You're invited to team up!</h1>
            <p className="text-sm mb-6 opacity-90">
              <strong>{invite.inviterName || "A player"}</strong> wants to pair up with
              you for <strong>{MODE_LABELS[invite.mode] || invite.mode}</strong> in{" "}
              <strong>{invite.tournamentName}</strong>
              {invite.gameName ? ` — ${invite.gameName}` : ""}.
              {invite.message && (
                <>
                  <br />
                  <span className="italic opacity-75">"{invite.message}"</span>
                </>
              )}
            </p>

            {currentUser ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={responding}
                  onClick={() => handleRespond("accept")}
                  className="flex-1 font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
                  style={{ background: "var(--accent-color)", color: "black" }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={responding}
                  onClick={() => handleRespond("reject")}
                  className="flex-1 font-semibold py-2 px-4 rounded-lg border disabled:opacity-50"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  Reject
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm opacity-75">
                  Do you already have a Tourney Techs account?
                </p>
                <Link
                  href={`/auth/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}
                  className="text-center font-semibold py-2 px-4 rounded-lg"
                  style={{ background: "var(--accent-color)", color: "black" }}
                >
                  Log In
                </Link>
                <Link
                  href={`/auth/signup?redirect=${encodeURIComponent(`/invite/${token}`)}`}
                  className="text-center font-semibold py-2 px-4 rounded-lg border"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  New here? Sign Up
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
