import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./logo-fix.css";
import "./product.css";
import "./features.css";
import "./expansion.css";

export const metadata: Metadata = {
  title: "CALOREAZI — המאמן התזונתי האישי שלך",
  description: "מעקב תזונה חכם, פשוט ואישי עם AI Coach שמכיר אותך.",
  applicationName: "CALOREAZI",
  appleWebApp: { capable: true, title: "CALOREAZI" },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/caloreazi-pwa-mark-192-v3.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/caloreazi-pwa-mark-192-v3.png",
    apple: [{ url: "/caloreazi-apple-touch-mark-v3.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F5F0" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0C0C" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="he" dir="rtl"><body>{children}</body></html>;
}
