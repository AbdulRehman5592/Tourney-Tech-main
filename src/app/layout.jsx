
import "./globals.css";

import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Tourney Techs",
  description: "Create, schedule, and track tournaments like a pro.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tourney Techs",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#1e3a8a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Toaster
          position="top-center"
          toastOptions={{
            success: {
              style: {
                background: "var(--background)",
                color: "#fff",
                border: "1px solid #22c55e",
              },
            },
            error: {
              style: {
                background: "var(--background)",
                color: "#fecaca",
                border: "1px solid #f87171",
              },
            },
          }}
        />

        {children}
      </body>
    </html>
  );
}
