import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./logo-fix.css";
import "./product.css";
import "./features.css";

export const metadata: Metadata = {
  title: "CALOREAZI — המאמן התזונתי האישי שלך",
  description: "מעקב תזונה חכם, פשוט ואישי עם AI Coach שמכיר אותך.",
  applicationName: "CALOREAZI",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/caloreazi-pwa-mark-192-v3.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/caloreazi-pwa-mark-192-v3.png",
    apple: [{ url: "/caloreazi-apple-touch-mark-v3.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F26A3D" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="he" dir="rtl"><body>{children}</body></html>;
}
