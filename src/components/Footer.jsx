import Link from "next/link";
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
} from "lucide-react"; // Ensure lucide-react is installed

const MUTED = "var(--muted-foreground)";

export default function Footer() {
  return (
    <footer
      className="py-10"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Intro */}
          <div>
            <h3
              className="text-2xl font-bold mb-2"
              style={{ color: "var(--accent-color)" }}
            >
              Tourney Techs
            </h3>
            <p style={{ color: MUTED }}>
              Powering tournaments from registration to final standings.
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-semibold mb-3">Navigation</h4>
            <ul className="space-y-2" style={{ color: MUTED }}>
              <li><Link href="/" className="hover:underline">Home</Link></li>
              <li><a href="#upcoming" className="hover:underline">Tournaments</a></li>
              <li><a href="#faq" className="hover:underline">FAQ</a></li>
              <li><a href="mailto:support@tourneytech.app" className="hover:underline">Contact</a></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold mb-3">Legal</h4>
            <ul className="space-y-2" style={{ color: MUTED }}>
              <li><Link href="/terms" className="hover:underline">Terms & Conditions</Link></li>
              <li><Link href="/privacy" className="hover:underline">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="font-semibold mb-3">Follow Us</h4>
            <p className="text-xs mb-3" style={{ color: MUTED }}>
              Coming soon
            </p>
            <div className="flex gap-4" style={{ color: MUTED }}>
              <span aria-label="Facebook (coming soon)" className="opacity-60 cursor-default">
                <Facebook size={20} aria-hidden="true" />
              </span>
              <span aria-label="Twitter (coming soon)" className="opacity-60 cursor-default">
                <Twitter size={20} aria-hidden="true" />
              </span>
              <span aria-label="Instagram (coming soon)" className="opacity-60 cursor-default">
                <Instagram size={20} aria-hidden="true" />
              </span>
              <span aria-label="LinkedIn (coming soon)" className="opacity-60 cursor-default">
                <Linkedin size={20} aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>

        {/* Divider & Copyright */}
        <div
          className="mt-10 pt-6 text-center text-sm"
          style={{
            borderTop: "1px solid var(--border-color)",
            color: MUTED,
          }}
        >
          © {new Date().getFullYear()} Tourney Techs. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
