"use client";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import Button from "@/components/ui/Button";

export default function Unauthorized() {
  const router = useRouter();

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen text-center px-4"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-10"
        style={{
          background: "var(--card-background)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background: "color-mix(in srgb, var(--accent-color) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent-color) 40%, transparent)",
          }}
        >
          <Lock size={30} color="var(--accent-color)" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold mb-3">This page is off-limits</h1>
        <p
          className="text-sm mb-8 leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          You don&apos;t have permission to view this page. If you think that&apos;s
          a mistake, reach out to your tournament organizer — otherwise, head
          back to somewhere you have access to.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => router.push("/")}>Go to Homepage</Button>
          <Button variant="ghost" href="mailto:support@tourneytech.app">
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}
