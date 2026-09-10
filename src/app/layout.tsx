import type { Metadata, Viewport } from "next";
import { Hammersmith_One } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const hammersmith = Hammersmith_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-hammersmith",
});

export const metadata: Metadata = {
  title: "RL on Rails",
  description: "A London Underground style map of a reinforcement learning reading curriculum",
  applicationName: "RL on Rails",
  appleWebApp: { capable: true, title: "RL on Rails", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  // Next emits the standard `mobile-web-app-capable`; iOS only learned that one
  // in 17.4, and reads the manifest's `display` no further back than 15.4.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0019a8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${hammersmith.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
      <Script
        src="https://umami.subeenregmi.com/script.js"
        data-website-id="d0c56b67-bb95-4bb3-ab32-4691377ead68"
        strategy="afterInteractive"
      />
      <Script
        src="https://umami.subeenregmi.com/recorder.js"
        data-website-id="d0c56b67-bb95-4bb3-ab32-4691377ead68"
        strategy="afterInteractive"
      />
    </html>
  );
}
