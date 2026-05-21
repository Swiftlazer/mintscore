import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LiveScoreSidebar from "@/components/LiveScoreSidebar";
import LeagueTablesSidebar from "@/components/LeagueTablesSidebar";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://mintscore.app"),
  title: {
    default: "Mintscore, Football predictions backed by maths, not vibes",
    template: "%s · Mintscore",
  },
  description:
    "Calibrated football match probabilities, value-bet detection, and free education on bankroll & expected value. Built for football fans who want to bet smarter.",
  keywords: [
    "football predictions", "value bets", "soccer predictions",
    "EPL predictions", "La Liga predictions", "expected goals",
    "Poisson model", "responsible gambling Nigeria",
  ],
  authors: [{ name: "Mintscore" }],
  openGraph: {
    type: "website",
    title: "Mintscore, Football predictions backed by maths",
    description: "Calibrated probabilities, value-bet detection, and bankroll education.",
    siteName: "Mintscore",
  },
  twitter: { card: "summary_large_image", title: "Mintscore" },
  manifest: "/manifest.json",
  icons: { icon: "/icons/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {/* On xl+ screens, reserve a 280px gutter on each side so the two
            fixed sidebars don't overlap centred page content. Below xl,
            both sidebars collapse into floating-button + drawer pairs
            (livescores bottom-left, tables bottom-right) and the main
            content uses the full viewport width. */}
        <main className="min-h-screen xl:px-[280px]">{children}</main>
        <Footer />
        <LiveScoreSidebar />
        <LeagueTablesSidebar />
      </body>
    </html>
  );
}
