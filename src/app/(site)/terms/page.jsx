import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Terms & Conditions — Tourney Tech",
};

export default function TermsPage() {
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
          Terms &amp; Conditions
        </h1>
        <p className="mb-4 opacity-80 text-sm">Last updated: August 2026</p>

        <div className="space-y-6 leading-relaxed">
          <p>
            Welcome to Tourney Tech. By creating an account or registering
            for a tournament, you agree to these terms. Please read them
            carefully.
          </p>
          <section>
            <h2 className="text-xl font-semibold mb-2">Using the platform</h2>
            <p>
              You&apos;re responsible for the accuracy of the information you
              provide when registering, and for any activity that happens
              under your account.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">
              Tournaments &amp; payments
            </h2>
            <p>
              Entry fees, schedules, and formats are set by each tournament
              organizer. Refund and cancellation policies may vary by
              tournament — check with your organizer for details.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">Contact</h2>
            <p>
              Questions about these terms? Reach us at{" "}
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
