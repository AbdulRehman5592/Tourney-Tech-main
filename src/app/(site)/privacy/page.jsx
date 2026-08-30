import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Privacy Policy — Tourney Tech",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main
        className="max-w-3xl mx-auto px-6 py-16"
        style={{ color: "var(--foreground)" }}
      >
        <h1
          className="text-3xl font-bold mb-6"
          style={{ color: "var(--accent-color)" }}
        >
          Privacy Policy
        </h1>
        <p className="mb-4 opacity-80 text-sm">Last updated: August 2026</p>

        <div className="space-y-6 leading-relaxed">
          <p>
            This policy explains what information Tourney Tech collects when
            you use the platform, and how it&apos;s used.
          </p>
          <section>
            <h2 className="text-xl font-semibold mb-2">
              Information we collect
            </h2>
            <p>
              When you sign up or register for a tournament, we collect the
              details you provide — name, email, phone number, and location —
              along with your tournament and match activity.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">How it&apos;s used</h2>
            <p>
              Your information is used to run tournaments, manage teams and
              registrations, and communicate updates about events you&apos;re
              part of. We don&apos;t sell your data to third parties.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">Contact</h2>
            <p>
              Questions about your data? Reach us at{" "}
              <a
                href="mailto:support@tourneytech.app"
                className="hover:underline"
                style={{ color: "var(--accent-color)" }}
              >
                support@tourneytech.app
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
