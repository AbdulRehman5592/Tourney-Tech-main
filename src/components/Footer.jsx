import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
} from "lucide-react"; // Ensure lucide-react is installed

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
              Tourney Tech
            </h3>
            <p style={{ color: "#9CA3AF" }}>
              Powering seamless tournaments for every player. No sign-up needed, just join & play!
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-semibold mb-3">Navigation</h4>
            <ul className="space-y-2" style={{ color: "#9CA3AF" }}>
              <li><a href="#">Home</a></li>
              <li><a href="#tournaments">Tournaments</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold mb-3">Legal</h4>
            <ul className="space-y-2" style={{ color: "#9CA3AF" }}>
              <li><a href="#">Terms & Conditions</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="font-semibold mb-3">Follow Us</h4>
            <div className="flex gap-4" style={{ color: "#9CA3AF" }}>
              <a href="#" style={{ transition: "color 0.3s" }} className="hover:text-yellow-500">
                <Facebook size={20} />
              </a>
              <a href="#" style={{ transition: "color 0.3s" }} className="hover:text-yellow-500">
                <Twitter size={20} />
              </a>
              <a href="#" style={{ transition: "color 0.3s" }} className="hover:text-yellow-500">
                <Instagram size={20} />
              </a>
              <a href="#" style={{ transition: "color 0.3s" }} className="hover:text-yellow-500">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Divider & Copyright */}
        <div
          className="mt-10 pt-6 text-center text-sm"
          style={{
            borderTop: "1px solid var(--border-color)",
            color: "#6B7280", // Tailwind gray-500
          }}
        >
          © {new Date().getFullYear()} Tourney Tech. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
